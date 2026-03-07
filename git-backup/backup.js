// ══════════════════════════════════════════════════════════════════════════════
// AXION Git Backup System — Automated Cloud Backups
// ══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const simpleGit = require('simple-git');
const cron = require('node-cron');
require('dotenv').config();

const S3Storage = require('./storage/s3');
const GDriveStorage = require('./storage/gdrive');
const DropboxStorage = require('./storage/dropbox');

// ── Configuration ─────────────────────────────────────────────────────────────
const REPO_PATH = process.env.REPO_PATH || process.cwd();
const BACKUP_DIR = path.join(REPO_PATH, '.git-backups');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-me';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ── Backup Functions ──────────────────────────────────────────────────────────

async function createBackup() {
  console.log('🔄 Starting backup process...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `axion-backup-${timestamp}`;
  const archivePath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);
  const encryptedPath = path.join(BACKUP_DIR, `${backupName}.enc`);
  
  try {
    // Step 1: Create archive
    console.log('📦 Creating archive...');
    await createArchive(archivePath);
    console.log('✅ Archive created');
    
    // Step 2: Encrypt archive
    console.log('🔒 Encrypting archive...');
    await encryptArchive(archivePath, encryptedPath);
    console.log('✅ Archive encrypted');
    
    // Step 3: Upload to cloud storage
    const storage = getStorage();
    console.log(`☁️  Uploading to ${storage.name}...`);
    await storage.upload(encryptedPath, backupName);
    console.log('✅ Upload complete');
    
    // Step 4: Cleanup local files
    console.log('🧹 Cleaning up...');
    fs.unlinkSync(archivePath);
    fs.unlinkSync(encryptedPath);
    console.log('✅ Cleanup complete');
    
    console.log(`\n✅ Backup completed successfully: ${backupName}.enc\n`);
    
    return { success: true, backupName };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return { success: false, error: error.message };
  }
}

// Create compressed archive
function createArchive(outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });
    
    output.on('close', resolve);
    archive.on('error', reject);
    
    archive.pipe(output);
    
    // Add .git directory
    archive.directory(path.join(REPO_PATH, '.git'), '.git');
    
    // Add all tracked files
    const git = simpleGit(REPO_PATH);
    git.raw(['ls-files'], (err, result) => {
      if (err) return reject(err);
      
      const files = result.trim().split('\n');
      files.forEach(file => {
        const filePath = path.join(REPO_PATH, file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
        }
      });
      
      archive.finalize();
    });
  });
}

// Encrypt archive using AES-256
function encryptArchive(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    
    input.pipe(cipher).pipe(output);
    
    output.on('finish', resolve);
    output.on('error', reject);
  });
}

// Get storage provider based on config
function getStorage() {
  const storage = process.argv.find(arg => arg.startsWith('--storage='))?.split('=')[1] || process.env.BACKUP_STORAGE || 's3';
  
  switch (storage) {
    case 's3':
      return new S3Storage();
    case 'gdrive':
      return new GDriveStorage();
    case 'dropbox':
      return new DropboxStorage();
    default:
      throw new Error(`Unknown storage provider: ${storage}`);
  }
}

// ── Scheduling ────────────────────────────────────────────────────────────────

function setupSchedule() {
  // Daily backup at 2 AM
  cron.schedule('0 2 * * *', () => {
    console.log('⏰ Running scheduled daily backup...');
    createBackup();
  });
  
  // Weekly backup on Sunday at 3 AM
  cron.schedule('0 3 * * 0', () => {
    console.log('⏰ Running scheduled weekly backup...');
    createBackup();
  });
  
  console.log('📅 Backup schedule configured:');
  console.log('  • Daily:  2:00 AM');
  console.log('  • Weekly: Sunday 3:00 AM');
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--schedule')) {
    console.log('🕐 Starting backup scheduler...\n');
    setupSchedule();
    console.log('\n✅ Scheduler running. Press Ctrl+C to stop.\n');
  } else {
    createBackup();
  }
}

module.exports = { createBackup, setupSchedule };
