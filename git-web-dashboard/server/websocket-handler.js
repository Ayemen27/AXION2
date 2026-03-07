// ══════════════════════════════════════════════════════════════════════════════
// WebSocket Handler — Real-time Git updates
// ══════════════════════════════════════════════════════════════════════════════

const gitOperations = require('./git-operations');
const fs = require('fs');
const path = require('path');

const REPO_PATH = process.env.REPO_PATH || path.resolve(__dirname, '../../..');

// Track file changes using fs.watch
let watcher = null;
let updateTimeout = null;

function setupWebSocket(wss) {
  console.log('🔌 WebSocket server initialized');
  
  wss.on('connection', (ws) => {
    console.log('✅ Client connected');
    
    // Send initial status
    sendStatus(ws);
    
    // Handle client messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'get_status':
            await sendStatus(ws);
            break;
          
          case 'get_commits':
            await sendCommits(ws, data.limit);
            break;
          
          case 'get_diff':
            await sendDiff(ws, data.file);
            break;
          
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('❌ Client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Watch for file changes
  startFileWatcher(wss);
}

// Send current status to client
async function sendStatus(ws) {
  try {
    const status = await gitOperations.getStatus();
    ws.send(JSON.stringify({
      type: 'status_update',
      data: status
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Send commits to client
async function sendCommits(ws, limit = 50) {
  try {
    const commits = await gitOperations.getCommits(limit);
    ws.send(JSON.stringify({
      type: 'commits_update',
      data: commits
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Send diff to client
async function sendDiff(ws, file = null) {
  try {
    const diff = await gitOperations.getDiff(file);
    ws.send(JSON.stringify({
      type: 'diff_update',
      data: { diff, file }
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

// Watch for file changes and notify clients
function startFileWatcher(wss) {
  if (watcher) {
    watcher.close();
  }
  
  try {
    watcher = fs.watch(REPO_PATH, { recursive: true }, (eventType, filename) => {
      // Ignore .git folder changes
      if (filename && filename.includes('.git')) {
        return;
      }
      
      // Debounce updates (wait 500ms after last change)
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(async () => {
        console.log(`📝 File changed: ${filename}`);
        
        // Broadcast status update to all clients
        const status = await gitOperations.getStatus();
        
        wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: 'file_changed',
              data: {
                filename,
                status
              }
            }));
          }
        });
      }, 500);
    });
    
    console.log('👀 Watching for file changes...');
  } catch (error) {
    console.error('Failed to start file watcher:', error);
  }
}

module.exports = { setupWebSocket };
