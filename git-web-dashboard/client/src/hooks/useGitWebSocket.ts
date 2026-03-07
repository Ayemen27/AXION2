import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface GitStatus {
  current: string;
  tracking: string;
  ahead: number;
  behind: number;
  modified: string[];
  created: string[];
  deleted: string[];
  renamed: any[];
  conflicted: string[];
  staged: string[];
  not_added: string[];
  branches: string[];
  currentBranch: string;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  refs: string;
}

export function useGitWebSocket() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      
      // Request initial data
      ws.send(JSON.stringify({ type: 'get_status' }));
      ws.send(JSON.stringify({ type: 'get_commits', limit: 50 }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'status_update':
          case 'file_changed':
            setStatus(message.data.status || message.data);
            break;
          
          case 'commits_update':
            setCommits(message.data);
            break;
          
          case 'pull_complete':
            toast.success('تم السحب بنجاح');
            ws.send(JSON.stringify({ type: 'get_status' }));
            break;
          
          case 'push_complete':
            toast.success('تم الرفع بنجاح');
            ws.send(JSON.stringify({ type: 'get_status' }));
            break;
          
          case 'commit_created':
            toast.success('تم الحفظ بنجاح');
            ws.send(JSON.stringify({ type: 'get_status' }));
            ws.send(JSON.stringify({ type: 'get_commits', limit: 50 }));
            break;
          
          case 'error':
            toast.error(message.message);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('خطأ في الاتصال');
    };

    ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      toast.error('انقطع الاتصال');
      
      // Attempt reconnection after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { status, commits, isConnected, ws: wsRef.current };
}
