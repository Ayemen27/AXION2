/**
 * ai-chat Edge Function v2
 * يقرأ ai_provider + apikey من system_settings
 * ويوجّه للمزود المناسب: OnSpace AI / OpenAI / Google Gemini / Anthropic / Ollama
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  context?: {
    projects?: { name: string; status: string; total_expenses?: number; total_income?: number }[];
    workers?: { name: string; type: string; is_active: boolean }[];
    selectedProject?: string;
  };
}

// ── Provider configs ──────────────────────────────────────────────────────────
const PROVIDER_MAP: Record<string, {
  baseUrl: (key: string) => string;
  model: (savedModel: string) => string;
  authHeader: (key: string) => string;
  defaultModel: string;
}> = {
  openai: {
    baseUrl: () => 'https://api.openai.com/v1',
    model: (m) => m || 'gpt-4o',
    authHeader: (k) => `Bearer ${k}`,
    defaultModel: 'gpt-4o',
  },
  google: {
    baseUrl: (key) => `https://generativelanguage.googleapis.com/v1beta/openai`,
    model: (m) => m || 'gemini-2.0-flash',
    authHeader: (k) => `Bearer ${k}`,
    defaultModel: 'gemini-2.0-flash',
  },
  anthropic: {
    // Anthropic uses a different endpoint format — handled separately
    baseUrl: () => 'https://api.anthropic.com/v1',
    model: (m) => m || 'claude-3-5-sonnet-20241022',
    authHeader: (k) => k, // used as x-api-key
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  ollama: {
    baseUrl: (key) => key || 'http://localhost:11434/v1',
    model: (m) => m || 'llama3',
    authHeader: () => 'Bearer ollama',
    defaultModel: 'llama3',
  },
  onspace: {
    baseUrl: () => Deno.env.get('ONSPACE_AI_BASE_URL') ?? '',
    model: (m) => m || 'google/gemini-3-flash-preview',
    authHeader: (k) => `Bearer ${k}`,
    defaultModel: 'google/gemini-3-flash-preview',
  },
};

// ── Anthropic special sender ──────────────────────────────────────────────────
async function sendAnthropicRequest(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<Response> {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const chatMsgs  = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role,
    content: m.content,
  }));

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemMsg,
      messages: chatMsgs,
      stream: true,
    }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Create Supabase admin client to read system_settings ───────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Load AI provider config from system_settings ───────────────────────
    const { data: settingsRows } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'ai_provider',
        'ai_model',
        'apikey_onspace_ai_api_key',
        'apikey_openai_api_key',
        'apikey_anthropic_api_key',
        'apikey_google_api_key',
        'apikey_ollama_base_url',
      ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) {
      if (row.key && row.value !== null) settings[row.key] = row.value;
    }

    const provider    = settings['ai_provider'] || 'onspace';
    const savedModel  = settings['ai_model']    || '';

    // Get the correct API key for the provider
    const apiKeyMap: Record<string, string> = {
      onspace:   settings['apikey_onspace_ai_api_key']  || Deno.env.get('ONSPACE_AI_API_KEY') || '',
      openai:    settings['apikey_openai_api_key']      || '',
      anthropic: settings['apikey_anthropic_api_key']   || '',
      google:    settings['apikey_google_api_key']      || '',
      ollama:    settings['apikey_ollama_base_url']     || 'http://localhost:11434/v1',
    };

    const apiKey = apiKeyMap[provider] || '';

    console.log(`[ai-chat] provider=${provider} model=${savedModel || 'default'} hasKey=${!!apiKey}`);

    // Validate key exists (except ollama which can work without key)
    if (!apiKey && provider !== 'ollama') {
      return new Response(
        JSON.stringify({ error: `لا يوجد مفتاح API للمزود المحدد (${provider}). أضف المفتاح من إعدادات الذكاء الاصطناعي.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Get user info ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    let userName = 'المستخدم';
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAnon.auth.getUser(token);
      if (user?.user_metadata?.full_name) {
        userName = user.user_metadata.full_name;
      }
    }

    // ── Parse request body ─────────────────────────────────────────────────
    const body: RequestBody = await req.json();
    const { messages, context } = body;

    // ── Build system prompt ────────────────────────────────────────────────
    const projectCount   = context?.projects?.length ?? 0;
    const activeProjects = context?.projects?.filter(p => p.status === 'active').length ?? 0;
    const workerCount    = context?.workers?.length ?? 0;
    const activeWorkers  = context?.workers?.filter(w => w.is_active).length ?? 0;
    const totalIncome    = context?.projects?.reduce((s, p) => s + (p.total_income ?? 0), 0) ?? 0;
    const totalExpenses  = context?.projects?.reduce((s, p) => s + (p.total_expenses ?? 0), 0) ?? 0;

    const projectsList = context?.projects?.slice(0, 10).map(p =>
      `- ${p.name} (${p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : 'متوقف'})`
    ).join('\n') ?? '';

    const systemPrompt = `أنت مساعد ذكي متخصص في نظام إدارة المشاريع AXION. تتحدث باللغة العربية فقط وتجيب بشكل مختصر ومفيد.

## معلومات المستخدم
الاسم: ${userName}
${context?.selectedProject ? `المشروع المحدد: ${context.selectedProject}` : 'لا يوجد مشروع محدد حالياً'}
المزود الحالي: ${provider}

## إحصائيات النظام (بيانات حقيقية)
- إجمالي المشاريع: ${projectCount} مشروع (${activeProjects} نشط)
- إجمالي العمال: ${workerCount} عامل (${activeWorkers} نشط)
- إجمالي الإيرادات: ${totalIncome.toLocaleString('ar-YE')} ريال
- إجمالي المصروفات: ${totalExpenses.toLocaleString('ar-YE')} ريال
- الرصيد الإجمالي: ${(totalIncome - totalExpenses).toLocaleString('ar-YE')} ريال

## المشاريع الموجودة
${projectsList || 'لا توجد مشاريع بعد'}

## قدراتك
يمكنك مساعدة المستخدم في: إدارة المشاريع، العمال، المصروفات، الموردين، الآبار، التقارير، الإعدادات.
أجب بإيجاز وبشكل عملي. استخدم الأرقام الحقيقية عند الإجابة على أسئلة الإحصاء.`;

    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.filter(m => m.role !== 'system'),
    ];

    console.log(`[ai-chat] user="${userName}" msgs=${aiMessages.length} provider=${provider}`);

    // ── Route to correct provider ──────────────────────────────────────────
    let aiResponse: Response;
    const providerConfig = PROVIDER_MAP[provider] ?? PROVIDER_MAP['onspace'];

    if (provider === 'anthropic') {
      // Anthropic has different API format
      const modelName = providerConfig.model(savedModel);
      aiResponse = await sendAnthropicRequest(apiKey, modelName, aiMessages);

    } else {
      // OpenAI-compatible endpoint (OpenAI, Google Gemini via OpenAI compat, Ollama, OnSpace)
      const baseUrl   = provider === 'ollama'
        ? (apiKey || 'http://localhost:11434/v1')  // ollama key = base url
        : providerConfig.baseUrl(apiKey);

      const modelName = providerConfig.model(savedModel);
      const authValue = provider === 'onspace'
        ? `Bearer ${apiKey}`
        : provider === 'google'
          ? `Bearer ${apiKey}`
          : providerConfig.authHeader(apiKey);

      aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authValue,
        },
        body: JSON.stringify({
          model: modelName,
          messages: aiMessages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[ai-chat] ${provider} error:`, errText);

      // Handle rate limit / quota errors — fallback to OnSpace AI
      const isRateLimit = aiResponse.status === 429 || errText.includes('RESOURCE_EXHAUSTED') || errText.includes('rate limit') || errText.includes('quota');
      if (isRateLimit && provider !== 'onspace') {
        console.log(`[ai-chat] Rate limit hit on ${provider} — falling back to OnSpace AI`);
        const onspaceKey = apiKeyMap['onspace'] || Deno.env.get('ONSPACE_AI_API_KEY') || '';
        const onspaceBase = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';
        if (onspaceKey && onspaceBase) {
          const fallbackRes = await fetch(`${onspaceBase}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${onspaceKey}` },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: aiMessages,
              stream: true,
              max_tokens: 2048,
              temperature: 0.7,
            }),
          });
          if (fallbackRes.ok) {
            console.log('[ai-chat] Fallback to OnSpace AI succeeded');
            return new Response(fallbackRes.body, {
              headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', 'X-Provider-Fallback': 'onspace' },
            });
          }
        }
        // If fallback also fails, return friendly Arabic error
        return new Response(
          JSON.stringify({ error: `تم تجاوز الحد المسموح لـ ${provider === 'google' ? 'Google Gemini' : provider}. تم التحويل التلقائي لـ OnSpace AI لكنه أيضاً غير متاح. حاول مجدداً لاحقاً.` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Friendly error messages in Arabic
      let friendlyError = `فشل الاتصال بـ ${provider}`;
      if (isRateLimit) friendlyError = `تم تجاوز الحد المسموح به لـ ${provider === 'google' ? 'Google Gemini' : provider}. يرجى الانتظار قليلاً أو تغيير المزود من الإعدادات.`;
      else if (aiResponse.status === 401) friendlyError = `مفتاح API غير صالح للمزود ${provider}. تحقق من المفتاح في إعدادات الذكاء الاصطناعي.`;
      else if (aiResponse.status === 403) friendlyError = `الوصول مرفوض من ${provider}. تحقق من صلاحيات المفتاح.`;

      return new Response(
        JSON.stringify({ error: friendlyError }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Stream response back ───────────────────────────────────────────────
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err) {
    console.error('[ai-chat] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
