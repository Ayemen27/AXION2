/**
 * AI Chat — OnSpace AI (gemini-3-flash-preview) مع Streaming حقيقي
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useWorkers } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Send, Bot, Copy, Trash2, Plus, History,
  MessageSquare, Sparkles, User, Loader2,
  Brain, X, StopCircle, RefreshCw,
  TrendingUp, Users, Building2, Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const SESSIONS_KEY = 'axion_ai_sessions_v2';
const ACTIVE_KEY   = 'axion_ai_active_v2';

const loadSessions  = (): Session[]    => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; } };
const saveSessions  = (s: Session[])   => localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
const loadActiveId  = (): string|null  => localStorage.getItem(ACTIVE_KEY);
const saveActiveId  = (id: string|null) => id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY);

// ── Quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: 'ملخص مالي',      text: 'قدّم لي ملخصاً ماليًا شاملاً للمشاريع الحالية مع الإيرادات والمصروفات والأرباح' },
  { icon: Users,      label: 'حالة العمال',     text: 'كم عدد العمال النشطين والمتوقفين؟ وما توصيتك لتحسين إدارة الفريق؟' },
  { icon: Building2,  label: 'تحليل المشاريع',  text: 'حلّل المشاريع الحالية وأخبرني أيها يحقق أفضل أداء وأيها يحتاج اهتماماً' },
  { icon: Zap,        label: 'نصائح تشغيلية',   text: 'ما أهم النصائح لتحسين كفاءة العمليات وتقليل التكاليف في مشاريعنا؟' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIChatPage() {
  const { toast }                         = useToast();
  const { user }                          = useAuth();
  const { projects }                      = useProjects();
  const { workers }                       = useWorkers();
  const { selectedProjectId }             = useSelectedProject();

  const [sessions, setSessions]           = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveId]    = useState<string|null>(loadActiveId);
  const [input, setInput]                 = useState('');
  const [streaming, setStreaming]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const streamingId = useRef<string | null>(null);

  const activeSession  = sessions.find(s => s.id === activeSessionId) ?? null;
  const messages       = activeSession?.messages ?? [];
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Persist sessions
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { saveActiveId(activeSessionId); }, [activeSessionId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Session management ────────────────────────────────────────────────────

  const createSession = useCallback((firstMsg?: string): Session => {
    const s: Session = {
      id:        'sess_' + Date.now(),
      title:     firstMsg ? firstMsg.slice(0, 60) + (firstMsg.length > 60 ? '…' : '') : 'محادثة جديدة',
      messages:  [],
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setSidebarOpen(false);
    return s;
  }, []);

  const startNewChat = () => {
    const welcomeMsg: Message = {
      id:        'msg_welcome_' + Date.now(),
      role:      'assistant',
      content:   `مرحباً ${user?.full_name || ''}! 👋\n\nأنا المساعد الذكي لنظام AXION، أعمل بتقنية **Gemini 3 Flash**.\n\nلديّ اطلاع كامل على بيانات نظامك:\n• **${projects.length}** مشروع (${projects.filter(p => p.status === 'active').length} نشط)\n• **${workers.length}** عامل (${workers.filter(w => w.is_active).length} نشط)\n\nيمكنك سؤالي عن أي شيء يتعلق بمشاريعك وعمالك ومصروفاتك. كيف يمكنني مساعدتك اليوم؟`,
      timestamp: new Date(),
    };
    const s = createSession();
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, messages: [welcomeMsg] } : x));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast({ title: 'تم الحذف', description: 'تم حذف المحادثة' });
  };

  // ── Send message with streaming ───────────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    setInput('');

    // Ensure we have an active session
    let sessionId = activeSessionId;
    let currentMessages = messages;

    if (!sessionId) {
      const s = createSession(content);
      sessionId = s.id;
      currentMessages = [];
    } else if (activeSession?.messages.length === 0) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, title: content.slice(0, 60) } : s
      ));
    }

    // Add user message
    const userMsg: Message = {
      id:        'msg_u_' + Date.now(),
      role:      'user',
      content,
      timestamp: new Date(),
    };
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, messages: [...s.messages, userMsg] }
        : s
    ));

    // Prepare AI placeholder message
    const aiMsgId = 'msg_a_' + Date.now();
    streamingId.current = aiMsgId;
    const aiMsg: Message = {
      id:        aiMsgId,
      role:      'assistant',
      content:   '',
      timestamp: new Date(),
      streaming: true,
    };
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, messages: [...s.messages, aiMsg] }
        : s
    ));

    setStreaming(true);

    // Build conversation history (last 20 messages)
    const history = [...currentMessages, userMsg]
      .filter(m => !m.streaming)
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    // Context for the AI
    const context = {
      projects: projects.map(p => ({
        name:           p.name,
        status:         p.status,
        total_income:   p.total_income,
        total_expenses: p.total_expenses,
      })),
      workers: workers.map(w => ({
        name:      w.name,
        type:      w.type,
        is_active: w.is_active,
      })),
      selectedProject: selectedProject?.name,
    };

    // Get auth token for the Edge Function
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;

    const backendUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${backendUrl}/functions/v1/ai-chat`, {
        method:  'POST',
        signal:  abortRef.current.signal,
        headers: {
          'Content-Type':  'application/json',
          'apikey':        anonKey,
          'Authorization': `Bearer ${token ?? anonKey}`,
        },
        body: JSON.stringify({ messages: history, context }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      // Read SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta  = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              accumulated += delta;
              const snap = accumulated;
              setSessions(prev => prev.map(s =>
                s.id === sessionId
                  ? {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === aiMsgId ? { ...m, content: snap, streaming: true } : m
                      ),
                    }
                  : s
              ));
            }
          } catch { /* ignore parse errors for partial chunks */ }
        }
      }

      // Mark streaming done
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map(m =>
                m.id === aiMsgId ? { ...m, streaming: false } : m
              ),
            }
          : s
      ));

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User stopped — keep partial content, just mark done
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, messages: s.messages.map(m => m.id === aiMsgId ? { ...m, streaming: false } : m) }
            : s
        ));
      } else {
        console.error('[ai-chat] stream error:', err);
        // Parse friendly error message — avoid showing raw JSON
        let errMsg = 'فشل الاتصال بالمساعد الذكي';
        const rawMsg = err?.message || '';
        try {
          const parsed = JSON.parse(rawMsg);
          errMsg = parsed?.error || parsed?.message || errMsg;
        } catch {
          if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('rate limit')) {
            errMsg = 'تم تجاوز الحد المسموح به لـ Google Gemini. يرجى الانتظار قليلاً أو تغيير المزود من الإعدادات.';
          } else if (rawMsg.includes('401') || rawMsg.includes('unauthorized')) {
            errMsg = 'مفتاح API غير صالح. تحقق من إعدادات الذكاء الاصطناعي.';
          } else if (rawMsg && rawMsg.length < 200) {
            errMsg = rawMsg;
          }
        }
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                messages: s.messages.map(m =>
                  m.id === aiMsgId
                    ? { ...m, content: `⚠️ ${errMsg}`, streaming: false }
                    : m
                ),
              }
            : s
        ));
        toast({ title: 'خطأ في المساعد الذكي', description: errMsg, variant: 'destructive' });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      streamingId.current = null;
      inputRef.current?.focus();
    }
  }, [input, streaming, activeSessionId, activeSession, messages, createSession, projects, workers, selectedProject, toast]);

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'تم النسخ', description: 'تم نسخ الرسالة' });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const SessionList = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-1.5">
      {sessions.map(s => (
        <div
          key={s.id}
          className={`group flex items-start gap-2 p-3 rounded-xl cursor-pointer transition-all ${
            activeSessionId === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
          onClick={() => { setActiveId(s.id); onClose?.(); }}
        >
          <MessageSquare className="size-4 mt-0.5 shrink-0 opacity-70" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate leading-tight">{s.title}</p>
            <p className={`text-[10px] mt-0.5 ${activeSessionId === s.id ? 'opacity-70' : 'text-muted-foreground'}`}>
              {s.messages.length} رسالة
            </p>
          </div>
          <button
            className="size-5 shrink-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      {sessions.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="size-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">لا توجد محادثات</p>
        </div>
      )}
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-4" style={{ height: 'calc(100dvh - 148px)' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-64 rounded-2xl border border-border bg-card overflow-hidden shrink-0">
        <div className="p-3 border-b border-border">
          <Button onClick={startNewChat} className="w-full rounded-xl text-sm gap-2">
            <Plus className="size-4" /> محادثة جديدة
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2 p-3 border-b border-border">
          <div className="bg-accent/60 rounded-lg p-2 text-center">
            <p className="text-[9px] text-muted-foreground">المشاريع</p>
            <p className="text-sm font-bold text-primary">{projects.length}</p>
          </div>
          <div className="bg-accent/60 rounded-lg p-2 text-center">
            <p className="text-[9px] text-muted-foreground">العمال</p>
            <p className="text-sm font-bold text-primary">{workers.filter(w => w.is_active).length}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <SessionList />
        </div>

        {/* Model badge */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-lg">
            <Zap className="size-3 text-violet-600 dark:text-violet-400" />
            <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300">Gemini 3 Flash</span>
          </div>
        </div>
      </div>

      {/* ── Mobile Sidebar toggle ────────────────────────────────────────── */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        size="sm"
        variant="outline"
        className="lg:hidden fixed bottom-20 left-4 z-10 size-11 rounded-full shadow-lg p-0"
      >
        <History className="size-4" />
      </Button>

      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
          <div className="lg:hidden fixed right-0 top-0 h-full w-72 bg-card z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-sm">المحادثات</h3>
              <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setSidebarOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-3 border-b border-border">
              <Button onClick={startNewChat} className="w-full rounded-xl gap-2">
                <Plus className="size-4" /> محادثة جديدة
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SessionList onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* ── Main Chat ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden min-w-0">

        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
              <Brain className="size-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold leading-tight">المساعد الذكي AXION</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`size-1.5 rounded-full ${streaming ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] text-muted-foreground">
                  {streaming ? 'يكتب...' : 'جاهز'}
                </span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-violet-200 text-violet-600 dark:border-violet-800 dark:text-violet-400">
                  Gemini 3 Flash
                </Badge>
              </div>
            </div>
            {activeSession && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs rounded-lg h-8" onClick={startNewChat}>
                <RefreshCw className="size-3" /> جديدة
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            // Welcome / empty state
            <div className="h-full flex flex-col items-center justify-center gap-6 px-4">
              <div className="text-center">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="size-8 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-base font-bold mb-1">مرحباً بك في المساعد الذكي</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  أسألني عن مشاريعك وعمالك ومصروفاتك — لديّ بيانات نظامك الحقيقية
                </p>
              </div>

              {/* Quick prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {QUICK_PROMPTS.map(q => (
                  <button
                    key={q.label}
                    onClick={() => { if (!activeSessionId) startNewChat(); setTimeout(() => sendMessage(q.text), 100); }}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-right"
                  >
                    <div className="size-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <q.icon className="size-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{q.label}</span>
                  </button>
                ))}
              </div>

              <Button onClick={startNewChat} className="rounded-xl gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                <Plus className="size-4" /> بدء محادثة جديدة
              </Button>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI avatar */}
                {msg.role === 'assistant' && (
                  <div className="size-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tl-sm'
                        : 'bg-accent rounded-tr-sm'
                    }`}
                  >
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-0.5 h-4 bg-current animate-pulse mr-0.5 align-text-bottom" />
                    )}
                    {msg.streaming && msg.content === '' && (
                      <span className="flex gap-1 items-center py-0.5">
                        <span className="size-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="size-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="size-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>

                  {/* Timestamp + actions */}
                  <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!msg.streaming && msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => copyMessage(msg.content)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="نسخ"
                      >
                        <Copy className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="size-4 text-primary" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 p-3 border-t border-border bg-accent/20">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!activeSessionId) startNewChat();
                  setTimeout(() => sendMessage(), 50);
                }
              }}
              placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
              className="flex-1 rounded-xl resize-none min-h-[44px] max-h-[120px] text-sm"
              rows={1}
              disabled={streaming}
            />
            {streaming ? (
              <Button
                onClick={stopStreaming}
                variant="outline"
                className="h-11 w-11 rounded-xl p-0 shrink-0 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                title="إيقاف"
              >
                <StopCircle className="size-5" />
              </Button>
            ) : (
              <Button
                onClick={() => { if (!activeSessionId) startNewChat(); setTimeout(() => sendMessage(), 50); }}
                disabled={!input.trim()}
                className="h-11 w-11 rounded-xl p-0 shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                title="إرسال"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            مدعوم بـ OnSpace AI · Gemini 3 Flash · بيانات المشاريع محدّثة تلقائياً
          </p>
        </div>
      </div>
    </div>
  );
}
