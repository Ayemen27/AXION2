// ══════════════════════════════════════════════════════════════════════════════
// AXION Git Web Dashboard — Express + WebSocket Server
// ══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const gitOperations = require('./git-operations');
const { setupWebSocket } = require('./websocket-handler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// ── WebSocket Setup ───────────────────────────────────────────────────────────
setupWebSocket(wss);

// ── API Routes ────────────────────────────────────────────────────────────────

// Get current status
app.get('/api/status', async (req, res) => {
  try {
    const status = await gitOperations.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get commit history
app.get('/api/commits', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const commits = await gitOperations.getCommits(parseInt(limit));
    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get branches
app.get('/api/branches', async (req, res) => {
  try {
    const branches = await gitOperations.getBranches();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get diff
app.get('/api/diff', async (req, res) => {
  try {
    const { file } = req.query;
    const diff = await gitOperations.getDiff(file);
    res.json({ diff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pull changes
app.post('/api/pull', async (req, res) => {
  try {
    const result = await gitOperations.pull();
    
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'pull_complete',
          data: result
        }));
      }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Push changes
app.post('/api/push', async (req, res) => {
  try {
    const result = await gitOperations.push();
    
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'push_complete',
          data: result
        }));
      }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Commit changes
app.post('/api/commit', async (req, res) => {
  try {
    const { message } = req.body;
    const result = await gitOperations.commit(message);
    
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'commit_created',
          data: result
        }));
      }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Switch branch
app.post('/api/branch/switch', async (req, res) => {
  try {
    const { branch } = req.body;
    const result = await gitOperations.switchBranch(branch);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create branch
app.post('/api/branch/create', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await gitOperations.createBranch(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete branch
app.delete('/api/branch/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await gitOperations.deleteBranch(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Serve React App ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              AXION Git Web Dashboard Server                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

🚀 Server running on http://localhost:${PORT}
🔌 WebSocket ready for real-time updates
📁 Repository: ${process.env.REPO_PATH || process.cwd()}

  `);
});
