/**
 * Git Operations Edge Function — Professional GitHub API Integration
 * Supports: push, pull, status, verify
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface GitHubSettings {
  github_username: string;
  github_email: string;
  github_token: string;
  default_repo_url?: string;
  default_branch: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return respond({ error: 'Missing authorization token' }, 401);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return respond({ error: 'Invalid or expired token' }, 401);

    const body = await req.json();
    const { operation } = body;

    // ── write_env — store GitHub settings in project .env ─────────────────
    if (operation === 'write_env') {
      // This is a meta-operation: the env vars are set by the platform
      // We just acknowledge the request — Vite reads from .env at build time
      // In production the user must restart the dev server to pick up new vars
      const { env_content } = body;
      console.log('[git-operations] write_env requested, content length:', env_content?.length || 0);
      // Return success — actual .env writing happens client-side via Onspace platform
      return respond({ success: true, data: { message: 'env_vars_acknowledged', note: 'Add VITE_GITHUB_* vars to your .env file in the OnSpace editor' } });
    }

    // ── Verify operation — uses token from body ────────────────────────────
    if (operation === 'verify') {
      const { github_token } = body;
      if (!github_token) return respond({ error: 'github_token required' }, 400);

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${github_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AXION-Git-Manager',
        },
      });

      if (!userRes.ok) {
        const txt = await userRes.text();
        return respond({ error: 'GitHub authentication failed', details: txt, isValid: false }, 401);
      }

      const userData = await userRes.json();
      const scopes = userRes.headers.get('X-OAuth-Scopes')?.split(', ').filter(Boolean) || [];

      return respond({
        success: true,
        data: {
          isValid: true,
          username: userData.login,
          email: userData.email,
          avatarUrl: userData.avatar_url,
          scopes,
          rateLimit: {
            limit: userRes.headers.get('X-RateLimit-Limit'),
            remaining: userRes.headers.get('X-RateLimit-Remaining'),
            reset: userRes.headers.get('X-RateLimit-Reset'),
          },
        },
      });
    }

    // ── Load GitHub Settings from DB ──────────────────────────────────────
    const { data: settings, error: settingsErr } = await supabase
      .from('user_github_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsErr || !settings) {
      return respond({
        error: 'GitHub settings not configured. Please go to GitHub Settings first.',
        needsSetup: true,
      }, 400);
    }

    const gh: GitHubSettings = settings as unknown as GitHubSettings;

    // ── Resolve repo / branch ─────────────────────────────────────────────
    const repoUrl: string = body.repository || gh.default_repo_url || '';
    const branch: string = body.branch || gh.default_branch || 'main';

    if (!repoUrl) return respond({ error: 'repository URL is required' }, 400);

    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!repoMatch) return respond({ error: 'Invalid GitHub repository URL' }, 400);

    const owner = repoMatch[1];
    const repo = repoMatch[2];

    const authHeaders = {
      'Authorization': `token ${gh.github_token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AXION-Git-Manager',
      'Content-Type': 'application/json',
    };

    const githubApi = 'https://api.github.com';
    const startTime = Date.now();
    let result: Record<string, unknown> = {};

    // ── STATUS ─────────────────────────────────────────────────────────────
    if (operation === 'status') {
      const [repoRes, commitsRes] = await Promise.all([
        fetch(`${githubApi}/repos/${owner}/${repo}`, { headers: authHeaders }),
        fetch(`${githubApi}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=20`, { headers: authHeaders }),
      ]);

      if (!repoRes.ok) {
        const txt = await repoRes.text();
        return respond({ error: 'Repository not found or access denied', details: txt }, 404);
      }

      const repoData = await repoRes.json();
      const commits = commitsRes.ok ? await commitsRes.json() : [];

      result = {
        success: true,
        repository: {
          name: repoData.name,
          fullName: repoData.full_name,
          description: repoData.description,
          defaultBranch: repoData.default_branch,
          private: repoData.private,
          updatedAt: repoData.updated_at,
        },
        recentCommits: commits.map((c: any) => ({
          sha: c.sha,
          shortSha: c.sha.substring(0, 7),
          message: c.commit.message.split('\n')[0],
          author: c.commit.author.name,
          email: c.commit.author.email,
          date: c.commit.author.date,
          url: c.html_url,
        })),
      };

    // ── PULL ──────────────────────────────────────────────────────────────
    } else if (operation === 'pull') {
      const commitsRes = await fetch(
        `${githubApi}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=20`,
        { headers: authHeaders }
      );

      if (!commitsRes.ok) {
        const txt = await commitsRes.text();
        return respond({ error: 'Failed to fetch commits', details: txt }, 400);
      }

      const commits = await commitsRes.json();
      let filesChanged = 0;
      let filesList: unknown[] = [];

      if (commits.length > 0) {
        const latestSha = commits[0].sha;
        const detailRes = await fetch(
          `${githubApi}/repos/${owner}/${repo}/commits/${latestSha}`,
          { headers: authHeaders }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          filesChanged = detail.files?.length || 0;
          filesList = (detail.files || []).map((f: any) => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            changes: f.changes,
          }));
        }
      }

      result = {
        success: true,
        filesChanged,
        files: filesList,
        commits: commits.slice(0, 10).map((c: any) => ({
          sha: c.sha.substring(0, 7),
          fullSha: c.sha,
          message: c.commit.message.split('\n')[0],
          author: c.commit.author.name,
          date: c.commit.author.date,
          url: c.html_url,
        })),
        latestCommit: commits[0] ? {
          sha: commits[0].sha,
          message: commits[0].commit.message.split('\n')[0],
          author: commits[0].commit.author.name,
          date: commits[0].commit.author.date,
        } : null,
      };

      // Log pull operation
      await supabase.from('git_operations').insert({
        operation: 'pull',
        repository: repoUrl,
        branch,
        status: 'success',
        message: `pull completed — ${filesChanged} files`,
        files_changed: filesChanged,
        user_id: user.id,
        user_name: gh.github_username,
        duration_ms: Date.now() - startTime,
      });

    // ── PUSH ──────────────────────────────────────────────────────────────
    } else if (operation === 'push') {
      const { commit_message = 'Update from AXION', files = [] } = body;

      if (!files.length) return respond({ error: 'No files provided for push' }, 400);

      // Step 1: Get current HEAD ref
      const refRes = await fetch(
        `${githubApi}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        { headers: authHeaders }
      );

      if (!refRes.ok) {
        const txt = await refRes.text();
        // Try to create the branch if it doesn't exist
        if (refRes.status === 404) {
          return respond({ error: `Branch "${branch}" not found. Create it on GitHub first.`, details: txt }, 404);
        }
        return respond({ error: 'Failed to get branch reference', details: txt }, 400);
      }

      const refData = await refRes.json();
      const currentSha = refData.object.sha;

      // Step 2: Get tree SHA from current commit
      const commitRes = await fetch(
        `${githubApi}/repos/${owner}/${repo}/git/commits/${currentSha}`,
        { headers: authHeaders }
      );
      if (!commitRes.ok) {
        const txt = await commitRes.text();
        return respond({ error: 'Failed to get commit data', details: txt }, 400);
      }
      const commitData = await commitRes.json();
      const baseTreeSha = commitData.tree.sha;

      // Step 3: Create blobs for each file
      const treeItems: unknown[] = [];
      for (const file of files as Array<{ path: string; content: string }>) {
        const blobRes = await fetch(
          `${githubApi}/repos/${owner}/${repo}/git/blobs`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
          }
        );
        if (!blobRes.ok) {
          const txt = await blobRes.text();
          return respond({ error: `Failed to create blob for ${file.path}`, details: txt }, 400);
        }
        const blobData = await blobRes.json();
        treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blobData.sha });
      }

      // Step 4: Create tree
      const treeRes = await fetch(
        `${githubApi}/repos/${owner}/${repo}/git/trees`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
        }
      );
      if (!treeRes.ok) {
        const txt = await treeRes.text();
        return respond({ error: 'Failed to create tree', details: txt }, 400);
      }
      const treeData = await treeRes.json();

      // Step 5: Create commit
      const newCommitRes = await fetch(
        `${githubApi}/repos/${owner}/${repo}/git/commits`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            message: commit_message,
            tree: treeData.sha,
            parents: [currentSha],
            author: {
              name: gh.github_username || 'AXION User',
              email: gh.github_email || 'user@axion.app',
              date: new Date().toISOString(),
            },
          }),
        }
      );
      if (!newCommitRes.ok) {
        const txt = await newCommitRes.text();
        return respond({ error: 'Failed to create commit', details: txt }, 400);
      }
      const newCommit = await newCommitRes.json();

      // Step 6: Update branch ref
      const updateRefRes = await fetch(
        `${githubApi}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ sha: newCommit.sha, force: false }),
        }
      );
      if (!updateRefRes.ok) {
        const txt = await updateRefRes.text();
        return respond({ error: 'Failed to update branch reference (possible conflict)', details: txt }, 409);
      }

      const duration = Date.now() - startTime;
      result = {
        success: true,
        commitSha: newCommit.sha,
        shortSha: newCommit.sha.substring(0, 7),
        filesChanged: files.length,
        message: commit_message,
        url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
        duration,
      };

      // Log push operation
      await supabase.from('git_operations').insert({
        operation: 'push',
        repository: repoUrl,
        branch,
        status: 'success',
        message: commit_message,
        commit_hash: newCommit.sha.substring(0, 7),
        files_changed: files.length,
        user_id: user.id,
        user_name: gh.github_username,
        duration_ms: duration,
      });

      // Update repository_status
      await supabase.from('repository_status').upsert({
        repository_url: repoUrl,
        repository_name: repo,
        is_connected: true,
        last_check: new Date().toISOString(),
        last_push: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'repository_url' });

    } else {
      return respond({ error: `Unknown operation: ${operation}` }, 400);
    }

    return respond({ success: true, data: result });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[git-operations] Error:', message);
    return respond({ error: 'Internal server error', details: message }, 500);
  }
});
