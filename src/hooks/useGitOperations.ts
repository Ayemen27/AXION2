/**
 * Custom Hook لإدارة عمليات Git
 */

import { useState, useEffect } from 'react';
import { gitService, repoStatusService, type GitOperation, type RepositoryStatus } from '@/services/gitService';
import { replitGitService, type FileChange, type ChangeDetectionResult } from '@/services/replitGitService';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export function useGitOperations() {
  const { user } = useAuth();
  const [operations, setOperations] = useState<GitOperation[]>([]);
  const [repositories, setRepositories] = useState<RepositoryStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    todayOps: 0,
    avgDuration: 0,
  });
  const [detectedChanges, setDetectedChanges] = useState<ChangeDetectionResult | null>(null);
  const [detectingChanges, setDetectingChanges] = useState(false);

  const loadOperations = async () => {
    setLoading(true);
    const { data } = await gitService.getRecentOperations(100);
    setOperations(data);
    setLoading(false);
  };

  const loadRepositories = async () => {
    const { data } = await repoStatusService.getAll();
    setRepositories(data);
  };

  const loadStats = async () => {
    const { data } = await gitService.getStatistics();
    if (data) setStats(data);
  };

  useEffect(() => {
    loadOperations();
    loadRepositories();
    loadStats();
    
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(() => {
      loadOperations();
      loadRepositories();
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const createOperation = async (
    operation: 'push' | 'pull' | 'fetch' | 'clone' | 'status',
    repository: string,
    branch = 'main'
  ) => {
    const { data } = await gitService.createOperation({
      operation,
      repository,
      branch,
      status: 'pending',
      user_id: user?.id,
      user_name: user?.full_name || user?.email || 'مستخدم',
    });
    
    if (data) {
      setOperations(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const updateOperation = async (
    id: string,
    updates: Partial<GitOperation>
  ) => {
    const { data } = await gitService.updateOperation(id, updates);
    if (data) {
      setOperations(prev => prev.map(op => op.id === id ? data : op));
      loadStats();
    }
  };

  const deleteOperation = async (id: string) => {
    await gitService.deleteOperation(id);
    setOperations(prev => prev.filter(op => op.id !== id));
    loadStats();
  };

  const addRepository = async (repository_url: string, repository_name: string) => {
    const { data, error } = await repoStatusService.create({
      repository_url,
      repository_name,
      is_connected: true,
      last_check: new Date().toISOString(),
      total_operations: 0,
      failed_operations: 0,
    });
    if (data) {
      setRepositories(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const ensureRepository = async (repository: string) => {
    let repo = repositories.find(r => r.repository_url === repository);
    if (!repo) {
      const repoName = repository.split('/').slice(-1)[0] || repository;
      repo = await addRepository(repository, repoName);
    }
    return repo;
  };

  const realPush = async (repository: string, branch = 'main', files: Array<{ path: string; content: string }>, commitMessage: string) => {
    await ensureRepository(repository);
    const op = await createOperation('push', repository, branch);
    if (!op) return { success: false, error: 'Failed to create operation' };
    
    const startTime = Date.now();
    
    try {
      // استدعاء Edge Function لتنفيذ Push حقيقي
      const { data, error } = await supabase.functions.invoke('git-operations', {
        body: {
          operation: 'push',
          repository,
          branch,
          commit_message: commitMessage,
          files,
        },
      });

      const duration = Date.now() - startTime;

      if (error || !data.success) {
        await updateOperation(op.id, {
          status: 'failed',
          message: error?.message || data?.error || 'فشل في رفع الملفات',
          error_details: data?.details || error?.message,
          duration_ms: duration,
        });
        
        const existingRepo = repositories.find(r => r.repository_url === repository);
        await repoStatusService.updateStatus(repository, {
          repository_name: existingRepo?.repository_name || repository.split('/').slice(-1)[0],
          is_connected: false,
          last_check: new Date().toISOString(),
          total_operations: (existingRepo?.total_operations ?? 0) + 1,
          failed_operations: (existingRepo?.failed_operations ?? 0) + 1,
        });
        
        loadRepositories();
        return { success: false, error: data?.error || error?.message };
      }

      // نجحت العملية
      await updateOperation(op.id, {
        status: 'success',
        message: `تم رفع ${data.data.filesChanged} ملف`,
        commit_hash: data.data.commitSha?.substring(0, 7),
        files_changed: data.data.filesChanged,
        duration_ms: duration,
      });
      
      const existingRepo = repositories.find(r => r.repository_url === repository);
      await repoStatusService.updateStatus(repository, {
        repository_name: existingRepo?.repository_name || repository.split('/').slice(-1)[0],
        last_push: new Date().toISOString(),
        is_connected: true,
        last_check: new Date().toISOString(),
        total_operations: (existingRepo?.total_operations ?? 0) + 1,
      });
      
      loadRepositories();
      return { success: true, data: data.data };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await updateOperation(op.id, {
        status: 'failed',
        message: 'خطأ في الاتصال',
        error_details: err.message,
        duration_ms: duration,
      });
      return { success: false, error: err.message };
    }
  };

  const realPull = async (repository: string, branch = 'main') => {
    await ensureRepository(repository);
    const op = await createOperation('pull', repository, branch);
    if (!op) return { success: false, error: 'Failed to create operation' };
    
    const startTime = Date.now();
    
    try {
      // استدعاء Edge Function لتنفيذ Pull حقيقي
      const { data, error } = await supabase.functions.invoke('git-operations', {
        body: {
          operation: 'pull',
          repository,
          branch,
        },
      });

      const duration = Date.now() - startTime;

      if (error || !data.success) {
        await updateOperation(op.id, {
          status: 'failed',
          message: error?.message || data?.error || 'فشل في سحب التحديثات',
          error_details: data?.details || error?.message,
          duration_ms: duration,
        });
        
        const existingRepo = repositories.find(r => r.repository_url === repository);
        await repoStatusService.updateStatus(repository, {
          repository_name: existingRepo?.repository_name || repository.split('/').slice(-1)[0],
          is_connected: false,
          last_check: new Date().toISOString(),
          total_operations: (existingRepo?.total_operations ?? 0) + 1,
          failed_operations: (existingRepo?.failed_operations ?? 0) + 1,
        });
        
        loadRepositories();
        return { success: false, error: data?.error || error?.message };
      }

      // نجحت العملية
      await updateOperation(op.id, {
        status: 'success',
        message: `تم سحب ${data.data.filesChanged} ملف`,
        commit_hash: data.data.latestCommit?.sha?.substring(0, 7),
        files_changed: data.data.filesChanged,
        duration_ms: duration,
      });
      
      const existingRepo = repositories.find(r => r.repository_url === repository);
      await repoStatusService.updateStatus(repository, {
        repository_name: existingRepo?.repository_name || repository.split('/').slice(-1)[0],
        last_pull: new Date().toISOString(),
        is_connected: true,
        last_check: new Date().toISOString(),
        total_operations: (existingRepo?.total_operations ?? 0) + 1,
      });
      
      loadRepositories();
      return { success: true, data: data.data };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await updateOperation(op.id, {
        status: 'failed',
        message: 'خطأ في الاتصال',
        error_details: err.message,
        duration_ms: duration,
      });
      return { success: false, error: err.message };
    }
  };

  const deleteRepository = async (id: string) => {
    const { error } = await repoStatusService.delete(id);
    if (!error) {
      setRepositories(prev => prev.filter(r => r.id !== id));
      loadStats();
    }
    return { error };
  };

  const detectChanges = async (repository: string, branch = 'main') => {
    setDetectingChanges(true);
    try {
      // Get GitHub token from settings
      const { data: settings } = await supabase
        .from('user_github_settings')
        .select('github_token')
        .eq('user_id', user?.id)
        .single();

      if (!settings?.github_token) {
        throw new Error('GitHub token not found. Please configure your GitHub credentials.');
      }

      const result = await replitGitService.detectChanges(
        repository,
        branch,
        settings.github_token
      );
      
      setDetectedChanges(result);
      return result;
    } catch (error: any) {
      console.error('Change detection failed:', error);
      return null;
    } finally {
      setDetectingChanges(false);
    }
  };

  const stageChanges = async (changes: FileChange[]) => {
    return await replitGitService.stageFiles(changes);
  };

  const calculateDiff = (oldContent: string, newContent: string) => {
    return replitGitService.calculateDiff(oldContent, newContent);
  };

  return {
    operations,
    repositories,
    stats,
    loading,
    createOperation,
    updateOperation,
    deleteOperation,
    addRepository,
    deleteRepository,
    realPush,
    realPull,
    detectChanges,
    stageChanges,
    calculateDiff,
    detectedChanges,
    detectingChanges,
    refresh: () => {
      loadOperations();
      loadRepositories();
      loadStats();
    },
  };
}
