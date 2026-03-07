#!/usr/bin/env node

// ══════════════════════════════════════════════════════════════════════════════
// AXION Git CLI Dashboard — Interactive Terminal UI with ink.js
// ══════════════════════════════════════════════════════════════════════════════

const React = require('react');
const { render, Box, Text } = require('ink');
const SelectInput = require('ink-select-input').default;
const Spinner = require('ink-spinner').default;
const simpleGit = require('simple-git');

const git = simpleGit();

// ── Main App Component ────────────────────────────────────────────────────────
function App() {
  const [view, setView] = React.useState('menu');
  const [status, setStatus] = React.useState(null);
  const [commits, setCommits] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Load data
  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statusData, logData, branchData] = await Promise.all([
        git.status(),
        git.log({ maxCount: 10 }),
        git.branchLocal()
      ]);
      
      setStatus(statusData);
      setCommits(logData.all);
      setBranches(branchData.all);
    } catch (error) {
      console.error('Failed to load Git data:', error);
    }
    setLoading(false);
  }

  // Menu items
  const menuItems = [
    { label: '📊 Repository Status', value: 'status' },
    { label: '📜 Commit History', value: 'commits' },
    { label: '🌿 Branches', value: 'branches' },
    { label: '🔄 Refresh Data', value: 'refresh' },
    { label: '❌ Exit', value: 'exit' }
  ];

  const handleMenuSelect = (item) => {
    if (item.value === 'exit') {
      process.exit(0);
    } else if (item.value === 'refresh') {
      loadData();
    } else {
      setView(item.value);
    }
  };

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">
          <Spinner type="dots" /> Loading Git data...
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box borderStyle="double" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">
          🎯 AXION Git Dashboard
        </Text>
      </Box>
      
      <Box marginTop={1}>
        {view === 'menu' && (
          <>
            <Text color="yellow">Select an option:</Text>
            <Box marginTop={1}>
              <SelectInput items={menuItems} onSelect={handleMenuSelect} />
            </Box>
          </>
        )}
        
        {view === 'status' && <StatusView status={status} onBack={() => setView('menu')} />}
        {view === 'commits' && <CommitsView commits={commits} onBack={() => setView('menu')} />}
        {view === 'branches' && <BranchesView branches={branches} onBack={() => setView('menu')} />}
      </Box>
    </Box>
  );
}

// ── Status View ───────────────────────────────────────────────────────────────
function StatusView({ status, onBack }) {
  React.useEffect(() => {
    const timer = setTimeout(onBack, 10000);
    return () => clearTimeout(timer);
  }, [onBack]);

  if (!status) return <Text>No status data</Text>;

  return (
    <Box flexDirection="column">
      <Text bold underline color="cyan">Repository Status</Text>
      
      <Box marginTop={1} flexDirection="column">
        <Text>📍 Branch: <Text color="green">{status.current}</Text></Text>
        <Text>📤 Ahead: <Text color="yellow">{status.ahead}</Text></Text>
        <Text>📥 Behind: <Text color="yellow">{status.behind}</Text></Text>
        
        {status.modified.length > 0 && (
          <>
            <Text marginTop={1} bold>Modified Files:</Text>
            {status.modified.map(file => (
              <Text key={file} color="yellow">  • {file}</Text>
            ))}
          </>
        )}
        
        {status.created.length > 0 && (
          <>
            <Text marginTop={1} bold>New Files:</Text>
            {status.created.map(file => (
              <Text key={file} color="green">  • {file}</Text>
            ))}
          </>
        )}
        
        {status.deleted.length > 0 && (
          <>
            <Text marginTop={1} bold>Deleted Files:</Text>
            {status.deleted.map(file => (
              <Text key={file} color="red">  • {file}</Text>
            ))}
          </>
        )}
      </Box>
      
      <Text marginTop={1} dimColor>Press any key to go back...</Text>
    </Box>
  );
}

// ── Commits View ──────────────────────────────────────────────────────────────
function CommitsView({ commits, onBack }) {
  React.useEffect(() => {
    const timer = setTimeout(onBack, 15000);
    return () => clearTimeout(timer);
  }, [onBack]);

  return (
    <Box flexDirection="column">
      <Text bold underline color="cyan">Recent Commits</Text>
      
      <Box marginTop={1} flexDirection="column">
        {commits.map((commit, idx) => (
          <Box key={commit.hash} flexDirection="column" marginBottom={1}>
            <Text>
              <Text color="yellow">{commit.hash.substring(0, 7)}</Text>
              {' - '}
              <Text>{commit.message}</Text>
            </Text>
            <Text dimColor>
              {commit.author_name} • {new Date(commit.date).toLocaleDateString()}
            </Text>
          </Box>
        ))}
      </Box>
      
      <Text marginTop={1} dimColor>Press any key to go back...</Text>
    </Box>
  );
}

// ── Branches View ─────────────────────────────────────────────────────────────
function BranchesView({ branches, onBack }) {
  React.useEffect(() => {
    const timer = setTimeout(onBack, 10000);
    return () => clearTimeout(timer);
  }, [onBack]);

  return (
    <Box flexDirection="column">
      <Text bold underline color="cyan">Branches</Text>
      
      <Box marginTop={1} flexDirection="column">
        {branches.map(branch => (
          <Text key={branch} color="green">  • {branch}</Text>
        ))}
      </Box>
      
      <Text marginTop={1} dimColor>Press any key to go back...</Text>
    </Box>
  );
}

// ── Render App ────────────────────────────────────────────────────────────────
render(<App />);
