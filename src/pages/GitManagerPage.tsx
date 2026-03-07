/**
 * Git Manager — Professional Git System (Replit-style)
 *
 * Change Detection Strategy (Event-driven, like Replit):
 * ─────────────────────────────────────────────────────
 * 1. User selects local project folder ONCE via File System Access API
 * 2. System scans all files every 15s and computes SHA-256 for each
 * 3. Compares local SHAs against GitHub remote tree SHAs
 * 4. Auto-stages changed files in DB (cross-device persistence)
 * 5. Push reads from DB — never asks user for files again
 *
 * State Machine: idle → scanning → (changes | clean) → committed → pushed → idle
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  GitBranch, Upload, Download, RefreshCw, CheckCircle2,
  AlertCircle, ChevronDown, Settings, GitCommit, Loader2,
  Plus, FileCode, User, ArrowUp, ExternalLink, RotateCcw,
  FileText, FilePlus, FileX, Eye, GitMerge, Database,
  ChevronRight, FolderOpen, Activity, WifiOff, X, Terminal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GitSettings {
  github_token: string;
  github_username: string;
  github_email: string;
  default_repo_url: string;
  default_branch: string;
}

interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  isPushed: boolean;
  dbId?: string;
  fileCount?: number;
}

interface ChangedFile {
  id?: string;
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  staged: boolean;
  content?: string;
  localSha?: string;
}

type WatcherState = 'idle' | 'scanning' | 'watching' | 'no-permission';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const ms  = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60)  return `منذ ${sec} ثانية`;
  const min = Math.floor(sec / 60);
  if (min < 60)  return `منذ ${min} دقيقة`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `منذ ${hr} ساعة`;
  return `منذ ${Math.floor(hr / 24)} يوم`;
}

function parseRepoUrl(url: string) {
  const m = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** Compute SHA-256 of a string and return hex */
async function sha256(text: string): Promise<string> {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Recursively collect all files from a directory handle */
async function collectFiles(
  dirHandle: FileSystemDirectoryHandle,
  base = '',
  ignored = new Set(['node_modules', '.git', 'dist', '.cache', 'build', 'coverage', '.next']),
): Promise<{ path: string; handle: FileSystemFileHandle }[]> {
  const results: { path: string; handle: FileSystemFileHandle }[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (ignored.has(name)) continue;
    const fullPath = base ? `${base}/${name}` : name;
    if (handle.kind === 'directory') {
      const nested = await collectFiles(handle as FileSystemDirectoryHandle, fullPath, ignored);
      results.push(...nested);
    } else {
      results.push({ path: fullPath, handle: handle as FileSystemFileHandle });
    }
  }
  return results;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GitManagerPage() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [settings,        setSettings]        = useState<GitSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [repoUrl,          setRepoUrl]          = useState('');
  const [branch,           setBranch]           = useState('main');
  const [branches,         setBranches]         = useState<string[]>([]);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  const [remoteCommits,  setRemoteCommits]  = useState<CommitInfo[]>([]);
  const [isConnected,    setIsConnected]    = useState(false);
  const [repoFullName,   setRepoFullName]   = useState('');
  const [fetchingStatus, setFetchingStatus] = useState(false);
  const [lastFetched,    setLastFetched]    = useState<string | null>(null);

  // ── File Watcher State ────────────────────────────────────────────────────
  const [watcherState,   setWatcherState]   = useState<WatcherState>('idle');
  const [folderName,     setFolderName]     = useState<string | null>(null);
  const [lastScanTime,   setLastScanTime]   = useState<string | null>(null);
  const [scanProgress,   setScanProgress]   = useState(0);
  const dirHandleRef  = useRef<FileSystemDirectoryHandle | null>(null);
  const watchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // SHA cache: path → sha256 of content (to detect changes between scans)
  const localShaCache = useRef<Map<string, string>>(new Map());
  // GitHub tree SHA cache: path → sha (git blob sha from tree API)
  const remoteShaCache = useRef<Map<string, string>>(new Map());

  // Staged files loaded from DB — persisted across devices
  const [changedFiles,  setChangedFiles]  = useState<ChangedFile[]>([]);
  const [loadingFiles,  setLoadingFiles]  = useState(true);

  // Pending local commits in DB (not yet pushed)
  const [localCommits,    setLocalCommits]    = useState<CommitInfo[]>([]);
  const [loadingCommits,  setLoadingCommits]  = useState(true);
  const [commitMessage,   setCommitMessage]   = useState('');
  const [showCommitPanel, setShowCommitPanel] = useState(false);
  const [committing,      setCommitting]      = useState(false);

  const [showDiff,       setShowDiff]       = useState<string | null>(null);
  const [showAddFile,    setShowAddFile]    = useState(false);
  const [newFilePath,    setNewFilePath]    = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileStatus,  setNewFileStatus]  = useState<ChangedFile['status']>('modified');

  const [pushing,      setPushing]      = useState(false);
  const [pulling,      setPulling]      = useState(false);
  const [revertTarget, setRevertTarget] = useState<CommitInfo | null>(null);
  const [reverting,    setReverting]    = useState(false);

  const settingsRef = useRef<GitSettings | null>(null);
  settingsRef.current = settings;
  const repoUrlRef = useRef('');
  repoUrlRef.current = repoUrl;
  const branchRef = useRef('main');
  branchRef.current = branch;
  const userRef = useRef(user);
  userRef.current = user;

  // ── GitHub request headers ─────────────────────────────────────────────────
  const ghHeaders = useCallback((): Record<string, string> => ({
    Authorization: `token ${settingsRef.current?.github_token ?? ''}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }), []);

  // ── Load GitHub settings from DB ───────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoadingSettings(true);
      const { data } = await supabase
        .from('user_github_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (data) {
        const s: GitSettings = {
          github_token:     data.github_token     || '',
          github_username:  data.github_username  || '',
          github_email:     data.github_email     || '',
          default_repo_url: data.default_repo_url || '',
          default_branch:   data.default_branch   || 'main',
        };
        setSettings(s);
        if (data.default_repo_url) setRepoUrl(data.default_repo_url);
        if (data.default_branch)   setBranch(data.default_branch);
      }
      setLoadingSettings(false);
    })();
  }, [user?.id]);

  // ── Load staged files from DB ──────────────────────────────────────────────
  const loadStagedFiles = useCallback(async () => {
    if (!userRef.current?.id || !repoUrlRef.current) { setLoadingFiles(false); return; }
    setLoadingFiles(true);
    const { data } = await supabase
      .from('git_staged_files')
      .select('*')
      .eq('user_id', userRef.current.id)
      .eq('repository', repoUrlRef.current)
      .order('created_at', { ascending: true });

    setChangedFiles((data || []).map((r: any) => ({
      id:        r.id,
      path:      r.path,
      status:    r.status,
      additions: r.additions ?? 0,
      deletions: r.deletions ?? 0,
      patch:     r.patch    || undefined,
      staged:    r.staged,
      content:   r.content  || undefined,
    })));
    setLoadingFiles(false);
  }, []);

  // ── Load pending commits from DB ───────────────────────────────────────────
  const loadPendingCommits = useCallback(async () => {
    if (!userRef.current?.id) { setLoadingCommits(false); return; }
    setLoadingCommits(true);
    const { data } = await supabase
      .from('git_pending_commits')
      .select('*')
      .eq('user_id', userRef.current.id)
      .eq('is_pushed', false)
      .order('created_at', { ascending: false });

    setLocalCommits((data || []).map((r: any) => ({
      sha:       r.id,
      shortSha:  'local',
      message:   r.commit_message,
      author:    settingsRef.current?.github_username || userRef.current?.email || 'User',
      date:      r.created_at,
      url:       '',
      isPushed:  false,
      dbId:      r.id,
      fileCount: Array.isArray(r.files) ? r.files.length : 0,
    })));
    setLoadingCommits(false);
  }, []);

  useEffect(() => {
    if (user?.id && repoUrl) {
      loadStagedFiles();
      loadPendingCommits();
    }
  }, [user?.id, repoUrl]);

  // ── Fetch remote status from GitHub ───────────────────────────────────────
  const fetchStatus = useCallback(async (silent = false) => {
    if (!repoUrlRef.current || !settingsRef.current?.github_token) return;
    setFetchingStatus(true);
    const parsed = parseRepoUrl(repoUrlRef.current);
    if (!parsed) { setFetchingStatus(false); return; }
    const { owner, repo } = parsed;
    try {
      const [repoRes, commitsRes, branchesRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`,                                        { headers: ghHeaders() }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branchRef.current}&per_page=20`, { headers: ghHeaders() }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/branches`,                              { headers: ghHeaders() }),
      ]);
      if (!repoRes.ok) {
        setIsConnected(false);
        if (!silent) toast({ title: 'لا يمكن الوصول للمستودع', variant: 'destructive' });
        setFetchingStatus(false);
        return;
      }
      const repoData = await repoRes.json();
      setRepoFullName(repoData.full_name);
      setIsConnected(true);
      if (commitsRes.ok) {
        const raw: any[] = await commitsRes.json();
        setRemoteCommits(raw.map(c => ({
          sha:      c.sha,
          shortSha: c.sha.substring(0, 7),
          message:  c.commit.message.split('\n')[0],
          author:   c.commit.author.name,
          date:     c.commit.author.date,
          url:      c.html_url,
          isPushed: true,
        })));
      }
      if (branchesRes.ok) {
        const bd: any[] = await branchesRes.json();
        setBranches(bd.map(b => b.name));
      }
      setLastFetched(new Date().toISOString());
    } catch {
      setIsConnected(false);
    }
    setFetchingStatus(false);
  }, [ghHeaders, toast]);

  useEffect(() => {
    if (repoUrl && settings?.github_token) fetchStatus(true);
  }, [repoUrl, branch, settings?.github_token]);

  // ── Load GitHub remote file tree (for SHA comparison) ─────────────────────
  const loadRemoteTree = useCallback(async (): Promise<Map<string, string>> => {
    const cache = new Map<string, string>();
    const cur = settingsRef.current;
    const repo = repoUrlRef.current;
    if (!cur?.github_token || !repo) return cache;
    const parsed = parseRepoUrl(repo);
    if (!parsed) return cache;
    const { owner, repoName = parsed.repo } = { owner: parsed.owner, repoName: parsed.repo };
    // Get latest commit SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${branchRef.current}`,
      { headers: ghHeaders() },
    );
    if (!refRes.ok) return cache;
    const refData = await refRes.json();
    const commitSha = refData.object?.sha;
    if (!commitSha) return cache;
    // Get commit tree
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits/${commitSha}`,
      { headers: ghHeaders() },
    );
    if (!commitRes.ok) return cache;
    const commitData = await commitRes.json();
    const treeSha = commitData.tree?.sha;
    if (!treeSha) return cache;
    // Get full tree (recursive)
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${treeSha}?recursive=1`,
      { headers: ghHeaders() },
    );
    if (!treeRes.ok) return cache;
    const treeData = await treeRes.json();
    for (const item of (treeData.tree || []) as any[]) {
      if (item.type === 'blob') cache.set(item.path, item.sha);
    }
    console.log(`[watcher] remote tree loaded: ${cache.size} files`);
    return cache;
  }, [ghHeaders]);

  /**
   * Compute git-compatible blob SHA for a file content string.
   * Git blob SHA = sha1("blob {size}\0{content}")
   * We use SHA-1 via SubtleCrypto (SHA-1 is still available for non-security uses).
   */
  async function gitBlobSha(content: string): Promise<string> {
    const contentBytes = new TextEncoder().encode(content);
    const header = new TextEncoder().encode(`blob ${contentBytes.length}\0`);
    const combined = new Uint8Array(header.length + contentBytes.length);
    combined.set(header);
    combined.set(contentBytes, header.length);
    const hashBuf = await crypto.subtle.digest('SHA-1', combined);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Core scan function — compares local files vs GitHub tree ──────────────
  const scanForChanges = useCallback(async (dirHandle: FileSystemDirectoryHandle, silent = false) => {
    const cur  = settingsRef.current;
    const repo = repoUrlRef.current;
    const uid  = userRef.current?.id;
    if (!cur || !repo || !uid) return;

    setWatcherState('scanning');
    setScanProgress(0);

    try {
      // 1. Load remote tree if not cached
      if (remoteShaCache.current.size === 0) {
        remoteShaCache.current = await loadRemoteTree();
      }

      // 2. Collect local files
      const localFiles = await collectFiles(dirHandle);
      const total = localFiles.length;
      console.log(`[watcher] scanning ${total} local files`);

      const changes: Array<{
        path: string; status: 'added' | 'modified' | 'deleted';
        content: string; additions: number; deletions: number;
        localSha: string;
      }> = [];

      // 3. Check each local file against remote
      for (let i = 0; i < localFiles.length; i++) {
        setScanProgress(Math.round((i / total) * 100));
        const { path, handle } = localFiles[i];
        try {
          const file    = await handle.getFile();
          const content = await file.text();
          const localSha  = await gitBlobSha(content);
          const remoteSha = remoteShaCache.current.get(path);

          // Check if changed from last scan (to avoid re-staging already staged)
          const prevSha = localShaCache.current.get(path);
          localShaCache.current.set(path, localSha);

          if (!remoteSha) {
            // File doesn't exist on remote → ADDED
            if (localSha !== prevSha || prevSha === undefined) {
              changes.push({
                path, status: 'added', content,
                additions: content.split('\n').length, deletions: 0, localSha,
              });
            }
          } else if (localSha !== remoteSha) {
            // File exists but content differs → MODIFIED
            if (localSha !== prevSha || prevSha === undefined) {
              const remoteLines = remoteSha ? [] : []; // We'd need remote content for diff
              const additions   = content.split('\n').length;
              changes.push({
                path, status: 'modified', content, additions, deletions: 0, localSha,
              });
            }
          }
          // If localSha === remoteSha → no change
        } catch (e) {
          console.warn(`[watcher] skip ${path}:`, e);
        }
      }

      // 4. Check for deleted files (in remote but not locally)
      const localPaths = new Set(localFiles.map(f => f.path));
      for (const [remotePath] of remoteShaCache.current) {
        if (!localPaths.has(remotePath)) {
          if (!localShaCache.current.has(remotePath)) {
            changes.push({
              path: remotePath, status: 'deleted', content: '', additions: 0, deletions: 1, localSha: '',
            });
          }
        }
      }

      setScanProgress(100);
      console.log(`[watcher] found ${changes.length} changes`);

      if (changes.length > 0) {
        // 5. Upsert changes to DB (only NEW changes not already staged)
        const { data: existingRows } = await supabase
          .from('git_staged_files')
          .select('path, content')
          .eq('user_id', uid)
          .eq('repository', repo);

        const existingPaths = new Set((existingRows || []).map((r: any) => r.path));

        const newChanges = changes.filter(c => !existingPaths.has(c.path));

        if (newChanges.length > 0) {
          const upsertRows = newChanges.map(c => ({
            user_id:    uid,
            path:       c.path,
            status:     c.status,
            content:    c.content || null,
            additions:  c.additions,
            deletions:  c.deletions,
            staged:     false,
            repository: repo,
            branch:     branchRef.current,
          }));

          await supabase
            .from('git_staged_files')
            .upsert(upsertRows, { onConflict: 'user_id,path,repository' });

          await loadStagedFiles();

          if (!silent) {
            toast({
              title: `تم اكتشاف ${newChanges.length} تغيير جديد`,
              description: `${newChanges.filter(c => c.status === 'added').length} مضاف · ${newChanges.filter(c => c.status === 'modified').length} معدّل`,
            });
          }
        } else {
          // Refresh to show current staged state
          await loadStagedFiles();
        }
      } else {
        // No local changes detected
        await loadStagedFiles();
      }

      setLastScanTime(new Date().toISOString());
      setWatcherState('watching');
    } catch (err: any) {
      console.error('[watcher] scan error:', err);
      setWatcherState('watching');
    }
  }, [loadRemoteTree, loadStagedFiles, toast]);

  // ── Start watching (File System Access API) ────────────────────────────────
  const startWatching = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      toast({ title: 'المتصفح لا يدعم File System Access API', description: 'استخدم Chrome أو Edge', variant: 'destructive' });
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
      dirHandleRef.current = dirHandle;
      setFolderName(dirHandle.name);
      localShaCache.current.clear();
      remoteShaCache.current.clear();

      // First scan
      await scanForChanges(dirHandle, false);

      // Auto-scan every 15 seconds
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = setInterval(async () => {
        if (dirHandleRef.current) {
          await scanForChanges(dirHandleRef.current, true);
        }
      }, 15_000);

      toast({ title: `✓ جاري مراقبة "${dirHandle.name}"`, description: 'يفحص كل 15 ثانية تلقائياً' });
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled
      setWatcherState('no-permission');
      toast({ title: 'لم يتم منح الإذن', variant: 'destructive' });
    }
  }, [scanForChanges, toast]);

  const stopWatching = useCallback(() => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
    dirHandleRef.current = null;
    localShaCache.current.clear();
    remoteShaCache.current.clear();
    setWatcherState('idle');
    setFolderName(null);
    setLastScanTime(null);
  }, []);

  const manualScan = useCallback(async () => {
    if (!dirHandleRef.current) {
      await startWatching();
      return;
    }
    remoteShaCache.current.clear(); // Force fresh remote fetch
    await scanForChanges(dirHandleRef.current, false);
  }, [startWatching, scanForChanges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
    };
  }, []);

  // ── Stage / Unstage / Discard ──────────────────────────────────────────────
  const toggleStage = async (file: ChangedFile) => {
    const newStaged = !file.staged;
    if (file.id) await supabase.from('git_staged_files').update({ staged: newStaged }).eq('id', file.id);
    setChangedFiles(prev => prev.map(f => f.path === file.path ? { ...f, staged: newStaged } : f));
  };

  const stageAll = async () => {
    if (!user?.id) return;
    await supabase.from('git_staged_files').update({ staged: true })
      .eq('user_id', user.id).eq('repository', repoUrl);
    setChangedFiles(prev => prev.map(f => ({ ...f, staged: true })));
  };

  const unstageAll = async () => {
    if (!user?.id) return;
    await supabase.from('git_staged_files').update({ staged: false })
      .eq('user_id', user.id).eq('repository', repoUrl);
    setChangedFiles(prev => prev.map(f => ({ ...f, staged: false })));
  };

  const discardFile = async (file: ChangedFile) => {
    if (file.id) await supabase.from('git_staged_files').delete().eq('id', file.id);
    setChangedFiles(prev => prev.filter(f => f.path !== file.path));
  };

  // ── Add file manually ──────────────────────────────────────────────────────
  const addFileManually = async () => {
    if (!newFilePath.trim() || !user?.id) {
      toast({ title: 'أدخل مسار الملف', variant: 'destructive' }); return;
    }
    const row = {
      user_id:    user.id,
      path:       newFilePath.trim(),
      status:     newFileStatus,
      content:    newFileContent || null,
      additions:  newFileContent ? newFileContent.split('\n').length : 0,
      deletions:  0,
      staged:     true,
      repository: repoUrl,
      branch,
    };
    const { data, error } = await supabase
      .from('git_staged_files')
      .upsert(row, { onConflict: 'user_id,path,repository' })
      .select().single();
    if (!error && data) {
      setChangedFiles(prev => [
        ...prev.filter(f => f.path !== newFilePath.trim()),
        { id: data.id, path: data.path, status: data.status, additions: data.additions, deletions: data.deletions, staged: true, content: data.content || undefined },
      ]);
    }
    setNewFilePath(''); setNewFileContent(''); setNewFileStatus('modified');
    setShowAddFile(false);
    toast({ title: '✓ تم إضافة الملف' });
  };

  // ── Commit staged files ────────────────────────────────────────────────────
  const handleCommit = async () => {
    const staged = changedFiles.filter(f => f.staged);
    if (!staged.length)        { toast({ title: 'لا توجد ملفات staged', variant: 'destructive' }); return; }
    if (!commitMessage.trim()) { toast({ title: 'أدخل رسالة commit', variant: 'destructive' }); return; }
    if (!user?.id) return;
    setCommitting(true);
    const filesToCommit = [
      ...staged.filter(f => f.status !== 'deleted' && f.content != null)
               .map(f => ({ path: f.path, content: f.content!, status: f.status })),
      ...staged.filter(f => f.status === 'deleted')
               .map(f => ({ path: f.path, content: '', status: 'deleted' as const })),
    ];
    if (filesToCommit.length === 0) {
      toast({ title: 'الملفات تحتاج محتوى للـ Commit', description: 'تأكد أن الملفات المكتشفة تحتوي على محتوى', variant: 'destructive' });
      setCommitting(false);
      return;
    }
    const { error } = await supabase.from('git_pending_commits').insert({
      user_id: user.id, commit_message: commitMessage,
      files: filesToCommit, branch, repository: repoUrl, is_pushed: false,
    });
    if (error) {
      toast({ title: 'فشل حفظ commit', description: error.message, variant: 'destructive' });
      setCommitting(false);
      return;
    }
    const stagedIds = staged.filter(f => f.id).map(f => f.id!);
    if (stagedIds.length > 0) await supabase.from('git_staged_files').delete().in('id', stagedIds);
    await Promise.all([loadStagedFiles(), loadPendingCommits()]);
    setCommitMessage('');
    setShowCommitPanel(false);
    setCommitting(false);
    // Reset remote SHA cache so next scan compares against the new state
    remoteShaCache.current.clear();
    toast({ title: '✓ Commit محفوظ في DB', description: `${filesToCommit.length} ملف — اضغط Push` });
  };

  // ── Push pending commits to GitHub ────────────────────────────────────────
  const handlePush = async () => {
    if (!repoUrl || !settings?.github_token) {
      toast({ title: 'يرجى إعداد GitHub أولاً', variant: 'destructive' }); return;
    }
    const { data: pendingRows } = await supabase
      .from('git_pending_commits').select('*')
      .eq('user_id', user!.id).eq('is_pushed', false).eq('repository', repoUrl)
      .order('created_at', { ascending: true });
    if (!pendingRows?.length) {
      toast({ title: 'لا توجد commits للرفع', description: 'أضف ملفات وقم بعمل Commit أولاً', variant: 'destructive' }); return;
    }
    setPushing(true);
    try {
      const fileMap = new Map<string, string>();
      const messages: string[] = [];
      for (const row of pendingRows) {
        const files: any[] = Array.isArray(row.files) ? row.files : [];
        for (const f of files) {
          if (f.status !== 'deleted' && f.content != null) fileMap.set(f.path, f.content);
        }
        messages.push(row.commit_message);
      }
      if (fileMap.size === 0) {
        toast({ title: 'لا توجد ملفات بمحتوى للرفع', variant: 'destructive' });
        setPushing(false); return;
      }
      const allFiles = Array.from(fileMap.entries()).map(([path, content]) => ({ path, content }));
      const finalMessage = messages.length === 1 ? messages[0] : `${messages[messages.length - 1]} (+${messages.length - 1} commits)`;
      const { data, error } = await supabase.functions.invoke('git-operations', {
        body: { operation: 'push', repository: repoUrl, branch, commit_message: finalMessage, files: allFiles },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) { try { msg = await error.context?.text() || msg; } catch {} }
        throw new Error(msg);
      }
      if (!data?.success) throw new Error(data?.error || 'فشل Push');
      const pendingIds = pendingRows.map((r: any) => r.id);
      await supabase.from('git_pending_commits').update({ is_pushed: true }).in('id', pendingIds);
      // Clear remote cache so next scan picks up fresh remote state
      remoteShaCache.current.clear();
      localShaCache.current.clear();
      await Promise.all([loadPendingCommits(), fetchStatus(true)]);
      toast({ title: '✓ Push بنجاح', description: `${allFiles.length} ملف → ${branch}` });
    } catch (err: any) {
      console.error('[push]', err);
      toast({ title: 'فشل Push', description: err.message, variant: 'destructive' });
    }
    setPushing(false);
  };

  // ── Pull ───────────────────────────────────────────────────────────────────
  const handlePull = async () => {
    if (!repoUrl || !settings?.github_token) return;
    setPulling(true);
    try {
      const { data, error } = await supabase.functions.invoke('git-operations', {
        body: { operation: 'pull', repository: repoUrl, branch },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error);
      remoteShaCache.current.clear();
      await fetchStatus(true);
      toast({ title: '✓ Pull بنجاح', description: `${data.data?.filesChanged || 0} ملف محدّث` });
    } catch (err: any) {
      toast({ title: 'فشل Pull', description: err.message, variant: 'destructive' });
    }
    setPulling(false);
  };

  // ── Revert commit ──────────────────────────────────────────────────────────
  const handleRevert = async (commit: CommitInfo) => {
    if (!commit.isPushed && commit.dbId) {
      await supabase.from('git_pending_commits').delete().eq('id', commit.dbId);
      await loadPendingCommits();
      setRevertTarget(null);
      toast({ title: '✓ تم حذف commit المحلي' }); return;
    }
    if (!repoUrl || !settings?.github_token) return;
    setReverting(true);
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) { setReverting(false); return; }
    const { owner, repo } = parsed;
    try {
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`, { headers: ghHeaders() });
      if (!commitRes.ok) throw new Error('فشل في جلب بيانات commit');
      const commitData = await commitRes.json();
      const parentSha  = commitData.parents?.[0]?.sha;
      if (!parentSha) throw new Error('لا يوجد parent commit');
      const updateRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        { method: 'PATCH', headers: ghHeaders(), body: JSON.stringify({ sha: parentSha, force: true }) },
      );
      if (!updateRes.ok) throw new Error(await updateRes.text());
      remoteShaCache.current.clear();
      await fetchStatus(true);
      toast({ title: '✓ تم التراجع عن commit البعيد' });
    } catch (err: any) {
      toast({ title: 'فشل Revert', description: err.message, variant: 'destructive' });
    }
    setReverting(false);
    setRevertTarget(null);
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const allCommits  = [...localCommits, ...remoteCommits];
  const stagedCount = changedFiles.filter(f => f.staged).length;
  const hasLocal    = localCommits.length > 0;
  const isWatching  = watcherState === 'watching' || watcherState === 'scanning';

  const fileIcon = (s: ChangedFile['status']) =>
    s === 'added'    ? <FilePlus className="size-3.5 text-emerald-500" /> :
    s === 'modified' ? <FileText className="size-3.5 text-amber-500"  /> :
    s === 'deleted'  ? <FileX    className="size-3.5 text-red-500"    /> :
                       <FileCode className="size-3.5 text-blue-500"   />;

  const fileBadgeClass = (s: ChangedFile['status']) =>
    s === 'added'    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
    s === 'modified' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    s === 'deleted'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-10" dir="rtl">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-3 border-b border-border sticky top-0 bg-background z-10">
        <div className="relative flex items-center gap-2">
          <button onClick={() => setShowBranchPicker(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors">
            <GitBranch className="size-4" />
            {branch}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
          {showBranchPicker && branches.length > 0 && (
            <div className="absolute top-8 right-0 z-50 bg-card border border-border rounded-xl shadow-xl w-48 overflow-hidden">
              {branches.map(b => (
                <button key={b} onClick={() => { setBranch(b); setShowBranchPicker(false); }}
                  className={`w-full text-right px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors ${b === branch ? 'text-primary font-medium' : ''}`}>
                  <GitBranch className="size-3" /> {b}
                  {b === branch && <CheckCircle2 className="size-3 text-primary mr-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/git-terminal')} title="Terminal Setup"
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Terminal className="size-4" />
          </button>
          <button onClick={() => navigate('/github-settings')}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Settings className="size-4" />
          </button>
          <button onClick={() => fetchStatus(false)} disabled={fetchingStatus}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <RefreshCw className={`size-4 ${fetchingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Not configured ────────────────────────────────────────────────── */}
      {!loadingSettings && !settings?.github_token && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">لم يتم ربط GitHub بعد</p>
            <Button onClick={() => navigate('/github-settings')} size="sm"
              className="mt-3 rounded-xl gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Settings className="size-3.5" /> ربط GitHub
            </Button>
          </div>
        </div>
      )}

      {loadingSettings && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}

      {!loadingSettings && settings?.github_token && (
        <>
          {/* ── Remote Status Card ──────────────────────────────────────── */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Remote Updates</span>
              {repoFullName && (
                <a href={`https://github.com/${repoFullName}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  {repoFullName} <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">origin/{branch}</span>
                  {isConnected
                    ? <div className="size-1.5 rounded-full bg-emerald-500" />
                    : <div className="size-1.5 rounded-full bg-red-500" />
                  }
                </div>
                <div className="flex items-center gap-2">
                  {fetchingStatus && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  {lastFetched && !fetchingStatus && (
                    <span className="text-[10px] text-muted-foreground">آخر فحص {timeAgo(lastFetched)}</span>
                  )}
                </div>
              </div>

              {!isConnected && repoUrl && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
                  <AlertCircle className="size-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">لا يمكن الاتصال بالمستودع</p>
                  <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs" onClick={() => navigate('/github-settings')}>إعادة الربط</Button>
                </div>
              )}

              {isConnected && (
                <div className="flex items-center gap-2">
                  <Button onClick={() => fetchStatus(false)} disabled={fetchingStatus || pushing || pulling}
                    variant="outline" className="flex-1 rounded-xl gap-2 h-9 text-sm">
                    <RefreshCw className={`size-3.5 ${fetchingStatus ? 'animate-spin' : ''}`} />
                    Sync Changes
                    {hasLocal && <Badge className="text-[9px] h-4 bg-primary text-primary-foreground border-0 px-1.5 gap-0.5">{localCommits.length} <ArrowUp className="size-2.5" /></Badge>}
                  </Button>
                  <Button onClick={handlePull} disabled={pulling || pushing || fetchingStatus}
                    variant="outline" className="rounded-xl gap-1.5 h-9 text-sm px-4">
                    {pulling ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    Pull
                  </Button>
                  <Button onClick={handlePush} disabled={!hasLocal || pushing || pulling}
                    className="rounded-xl gap-1.5 h-9 text-sm px-4">
                    {pushing ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    Push
                    {hasLocal && <span className="text-[9px] bg-white/20 rounded px-1">{localCommits.length}</span>}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── File Watcher Panel (Replit-style) ──────────────────────── */}
          <div className="mt-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Watcher header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  {isWatching
                    ? <><Activity className="size-3.5 text-emerald-500 animate-pulse" /><span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">مراقبة نشطة</span></>
                    : <><WifiOff className="size-3.5 text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground">المراقبة متوقفة</span></>
                  }
                  {folderName && (
                    <span className="text-[10px] bg-accent text-muted-foreground rounded px-1.5 py-0.5 font-mono flex items-center gap-1">
                      <FolderOpen className="size-2.5" /> {folderName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {lastScanTime && (
                    <span className="text-[10px] text-muted-foreground">آخر فحص {timeAgo(lastScanTime)}</span>
                  )}
                  {isWatching && (
                    <button onClick={stopWatching}
                      className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive transition-colors">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scan progress bar */}
              {watcherState === 'scanning' && (
                <div className="px-3 py-2 border-b border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">فحص الملفات...</span>
                    <span className="text-[10px] text-muted-foreground">{scanProgress}%</span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Watcher body */}
              {!isWatching ? (
                <div className="p-4 text-center">
                  <FolderOpen className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">حدد مجلد المشروع مرة واحدة</p>
                  <p className="text-xs text-muted-foreground/70 mb-3">
                    سيراقب النظام تلقائياً كل التغييرات ويقارنها مع GitHub — تماماً مثل Replit
                  </p>
                  <Button onClick={startWatching} className="rounded-xl gap-2 mx-auto" size="sm">
                    <FolderOpen className="size-3.5" /> تحديد مجلد المشروع
                  </Button>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">إذن قراءة فقط · Chrome/Edge</p>
                </div>
              ) : (
                <div className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      يفحص الملفات كل 15 ثانية ويقارن SHA مع GitHub تلقائياً
                    </p>
                  </div>
                  <Button onClick={manualScan} disabled={watcherState === 'scanning'}
                    variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-xs shrink-0">
                    {watcherState === 'scanning'
                      ? <><Loader2 className="size-3 animate-spin" /> فحص...</>
                      : <><RefreshCw className="size-3" /> فحص الآن</>
                    }
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Commit / Staging Section ─────────────────────────────────── */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Commit</span>
                {changedFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">{changedFiles.length} تغيير · {stagedCount} staged</span>
                )}
              </div>
              <Button onClick={() => setShowAddFile(true)} variant="outline" size="sm"
                className="rounded-xl gap-1.5 h-8 text-xs">
                <Plus className="size-3.5" /> إضافة ملف
              </Button>
            </div>

            {loadingFiles ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : changedFiles.length > 0 ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {showCommitPanel && (
                  <div className="border-b border-border">
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
                      <span className="font-medium">Commit Message</span>
                      <button onClick={() => setShowCommitPanel(false)} className="hover:text-foreground">✕</button>
                    </div>
                    <Input value={commitMessage} onChange={e => setCommitMessage(e.target.value)}
                      placeholder="وصف موجز للتغييرات..."
                      className="border-0 rounded-none focus-visible:ring-0 text-sm px-3"
                      onKeyDown={e => { if (e.key === 'Enter' && commitMessage.trim()) handleCommit(); }}
                      autoFocus />
                  </div>
                )}

                <div className="flex items-center justify-between px-3 py-2 bg-accent/30 border-b border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">Review Changes</span>
                    <span className="text-muted-foreground">{changedFiles.length} files</span>
                  </div>
                  <div className="flex items-center divide-x divide-border border border-border rounded-lg overflow-hidden text-[11px]">
                    <button onClick={unstageAll} className="px-2 py-1 hover:bg-accent transition-colors flex items-center gap-1">
                      <RotateCcw className="size-2.5" /> Discard All
                    </button>
                    <button onClick={stageAll} className="px-2 py-1 hover:bg-accent transition-colors flex items-center gap-1">
                      <Plus className="size-2.5" /> Stage All
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                  {changedFiles.map(file => (
                    <div key={file.path}>
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors group">
                        <button onClick={() => toggleStage(file)}
                          className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${file.staged ? 'bg-primary border-primary' : 'border-border hover:border-primary'}`}>
                          {file.staged && <CheckCircle2 className="size-2.5 text-primary-foreground" />}
                        </button>
                        {fileIcon(file.status)}
                        <span className="text-xs font-mono flex-1 truncate" title={file.path}>{file.path}</span>
                        {file.content
                          ? <span className="text-[9px] text-emerald-600 shrink-0 hidden sm:block">✓ محتوى</span>
                          : <span className="text-[9px] text-muted-foreground/60 shrink-0 hidden sm:block">— لا محتوى</span>
                        }
                        <span className="text-[10px] hidden sm:flex items-center gap-0.5 shrink-0">
                          {file.additions > 0 && <span className="text-emerald-600">+{file.additions}</span>}
                          {file.deletions > 0 && <span className="text-red-600 ml-0.5">-{file.deletions}</span>}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {file.patch && (
                            <button onClick={() => setShowDiff(showDiff === file.path ? null : file.path)}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <Eye className="size-3" />
                            </button>
                          )}
                          <button onClick={() => discardFile(file)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <RotateCcw className="size-3" />
                          </button>
                        </div>
                        <Badge className={`text-[9px] h-5 border-0 shrink-0 ${fileBadgeClass(file.status)}`}>
                          {file.status === 'added' ? 'A' : file.status === 'modified' ? 'M' : file.status === 'deleted' ? 'D' : 'R'}
                        </Badge>
                      </div>
                      {showDiff === file.path && file.patch && (
                        <div className="border-t border-border bg-muted/30 px-3 py-2 max-h-48 overflow-auto">
                          <div className="font-mono text-[10px] space-y-0.5">
                            {file.patch.split('\n').map((line, i) => (
                              <div key={i} className={
                                line.startsWith('+') ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1' :
                                line.startsWith('-') ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-1' :
                                line.startsWith('@@') ? 'text-blue-600 dark:text-blue-400 px-1' : 'text-muted-foreground px-1'
                              }>{line || ' '}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-3 py-2 border-t border-border/50 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Database className="size-3" /> محفوظة في Cloud DB
                  </p>
                  {isWatching && (
                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <Activity className="size-3" /> مراقبة نشطة
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                <GitMerge className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">لا توجد تغييرات مكتشفة</p>
                <p className="text-xs text-muted-foreground/70">
                  {isWatching
                    ? `يراقب "${folderName}" — سيعرض التغييرات تلقائياً`
                    : 'حدد مجلد المشروع لبدء المراقبة التلقائية'
                  }
                </p>
              </div>
            )}

            {stagedCount > 0 && !showCommitPanel && (
              <Button onClick={() => setShowCommitPanel(true)} className="w-full mt-2 rounded-xl h-9 text-sm gap-2">
                <GitCommit className="size-3.5" />
                Stage and commit all changes
                <span className="text-[10px] bg-white/20 rounded px-1">{stagedCount}</span>
              </Button>
            )}
            {showCommitPanel && (
              <Button onClick={handleCommit} disabled={committing || !commitMessage.trim()} className="w-full mt-2 rounded-xl h-9 text-sm gap-2">
                {committing
                  ? <><Loader2 className="size-3.5 animate-spin" /> جاري الحفظ...</>
                  : <><CheckCircle2 className="size-3.5" /> Commit {stagedCount} files</>
                }
              </Button>
            )}
          </div>

          {/* ── Commit Timeline ────────────────────────────────────────────── */}
          <div className="mt-6">
            {(fetchingStatus || loadingCommits) && allCommits.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="size-2 rounded-full mt-2 shrink-0" />
                    <Skeleton className="h-10 flex-1 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              allCommits.map((commit, idx) => {
                const prev          = allCommits[idx - 1];
                const showNotPushed = idx === 0 && !commit.isPushed;
                const showUpToDate  = prev && !prev.isPushed && commit.isPushed;
                return (
                  <div key={commit.sha}>
                    {showNotPushed && (
                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <ArrowUp className="size-2.5" /> Not pushed to remote
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    {showUpToDate && (
                      <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="size-2.5" /> Up to date with remote
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className="flex items-start gap-3 py-1.5 group">
                      <div className="flex flex-col items-center shrink-0 mt-2">
                        <div className={`size-2 rounded-full border-2 transition-colors ${commit.isPushed ? 'border-muted-foreground/40 bg-background' : 'border-primary bg-primary'}`} />
                        {idx < allCommits.length - 1 && <div className="w-px flex-1 bg-border min-h-[1.75rem]" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{commit.message}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <User className="size-2.5" /> {commit.author}
                              </span>
                              <span className="text-[11px] text-muted-foreground">{timeAgo(commit.date)}</span>
                              {!commit.isPushed && (
                                <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 px-1.5 flex items-center gap-1">
                                  <Database className="size-2.5" /> local · {commit.fileCount} ملف
                                </Badge>
                              )}
                              {commit.isPushed && commit.url && (
                                <a href={commit.url} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">
                                  {commit.shortSha}
                                </a>
                              )}
                            </div>
                          </div>
                          <button onClick={() => setRevertTarget(commit)} disabled={reverting}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground shrink-0">
                            <RotateCcw className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!fetchingStatus && !loadingCommits && allCommits.length === 0 && isConnected && (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد commits في هذا الفرع</p>
            )}
          </div>
        </>
      )}

      {/* ── Add File Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showAddFile} onOpenChange={setShowAddFile}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="size-5 text-primary" /> إضافة ملف للـ Stage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2.5 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
              <Database className="size-3.5 shrink-0 mt-0.5" />
              <span>يُحفظ الملف في قاعدة البيانات ويبقى جاهزاً للـ commit حتى بعد تحديث الصفحة أو تغيير الجهاز.</span>
            </div>
            <div>
              <Label className="text-xs">مسار الملف <span className="text-destructive">*</span></Label>
              <Input value={newFilePath} onChange={e => setNewFilePath(e.target.value)}
                placeholder="src/pages/MyPage.tsx" className="rounded-xl mt-1.5 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs">نوع التغيير</Label>
              <div className="flex gap-2 mt-1.5">
                {(['added', 'modified', 'deleted'] as const).map(s => (
                  <button key={s} onClick={() => setNewFileStatus(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      newFileStatus === s
                        ? s === 'added'    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
                        : s === 'modified' ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
                                           : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}>
                    {s === 'added' ? '✚ جديد' : s === 'modified' ? '✎ معدّل' : '✗ محذوف'}
                  </button>
                ))}
              </div>
            </div>
            {newFileStatus !== 'deleted' && (
              <div>
                <Label className="text-xs">
                  محتوى الملف <span className="text-destructive">*</span>
                  <span className="text-muted-foreground font-normal mr-1">(ضروري للرفع إلى GitHub)</span>
                </Label>
                <Textarea value={newFileContent} onChange={e => setNewFileContent(e.target.value)}
                  placeholder="// ألصق محتوى الملف هنا..."
                  className="mt-1.5 rounded-xl font-mono text-xs h-40 resize-none" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFile(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={addFileManually} className="rounded-xl gap-2">
              <Plus className="size-4" /> حفظ في DB + Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revert Dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!revertTarget} onOpenChange={o => { if (!o) setRevertTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-amber-600" /> تأكيد التراجع
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {revertTarget && (
                <div className="bg-accent rounded-lg p-3 text-sm">
                  <p className="font-medium">{revertTarget.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{revertTarget.author} · {timeAgo(revertTarget.date)}</p>
                </div>
              )}
              {revertTarget?.isPushed && (
                <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ سيُعيد ضبط الفرع البعيد (force reset).</p>
              )}
              {!revertTarget?.isPushed && (
                <p className="text-xs text-blue-600 dark:text-blue-400">سيُحذف من DB فقط (لم يُرفع بعد).</p>
              )}
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => revertTarget && handleRevert(revertTarget)}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              {reverting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              تراجع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
