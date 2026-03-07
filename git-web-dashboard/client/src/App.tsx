import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import GitStatus from './components/GitStatus';
import CommitHistory from './components/CommitHistory';
import DiffViewer from './components/DiffViewer';
import BranchManager from './components/BranchManager';
import { useGitWebSocket } from './hooks/useGitWebSocket';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'commits' | 'diff' | 'branches'>('status');
  const { status, commits, isConnected } = useGitWebSocket();

  return (
    <div className="app">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="app-header">
        <h1>🎯 AXION Git Dashboard</h1>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'متصل' : 'غير متصل'}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          📊 الحالة
        </button>
        <button
          className={`tab ${activeTab === 'commits' ? 'active' : ''}`}
          onClick={() => setActiveTab('commits')}
        >
          📜 السجل
        </button>
        <button
          className={`tab ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          🔍 الفروقات
        </button>
        <button
          className={`tab ${activeTab === 'branches' ? 'active' : ''}`}
          onClick={() => setActiveTab('branches')}
        >
          🌿 الفروع
        </button>
      </nav>

      {/* Content */}
      <main className="app-content">
        {activeTab === 'status' && <GitStatus status={status} />}
        {activeTab === 'commits' && <CommitHistory commits={commits} />}
        {activeTab === 'diff' && <DiffViewer />}
        {activeTab === 'branches' && <BranchManager status={status} />}
      </main>
    </div>
  );
}

export default App;
