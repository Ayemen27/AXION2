// ══════════════════════════════════════════════════════════════════════════════
// AXION Git Notifications System
// إرسال إشعارات عبر: Slack, Discord, Email, Telegram
// ══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();

const SlackNotifier = require('./providers/slack');
const DiscordNotifier = require('./providers/discord');
const EmailNotifier = require('./providers/email');
const TelegramNotifier = require('./providers/telegram');

// ── Notification Types ────────────────────────────────────────────────────────
const NotificationType = {
  PUSH: 'push',
  MERGE_CONFLICT: 'merge_conflict',
  LARGE_FILE: 'large_file',
  CI_FAILED: 'ci_failed',
  CI_SUCCESS: 'ci_success'
};

// ── Notification Manager ──────────────────────────────────────────────────────
class NotificationManager {
  constructor() {
    this.providers = [];
    
    // Initialize enabled providers
    if (process.env.SLACK_WEBHOOK_URL) {
      this.providers.push(new SlackNotifier());
    }
    
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.providers.push(new DiscordNotifier());
    }
    
    if (process.env.SMTP_HOST) {
      this.providers.push(new EmailNotifier());
    }
    
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.providers.push(new TelegramNotifier());
    }
  }

  async send(type, data) {
    const message = this.formatMessage(type, data);
    
    const promises = this.providers.map(provider =>
      provider.send(message).catch(error => {
        console.error(`Failed to send via ${provider.name}:`, error);
      })
    );
    
    await Promise.all(promises);
  }

  formatMessage(type, data) {
    switch (type) {
      case NotificationType.PUSH:
        return {
          title: '🚀 New Push',
          message: `${data.author} pushed ${data.commits} commit(s) to ${data.branch}`,
          color: '#00FF00',
          fields: {
            'Repository': data.repo,
            'Branch': data.branch,
            'Commits': data.commits,
            'Author': data.author
          }
        };
      
      case NotificationType.MERGE_CONFLICT:
        return {
          title: '⚠️ Merge Conflict Detected',
          message: `Merge conflict in ${data.files.length} file(s)`,
          color: '#FF9900',
          fields: {
            'Branch': data.branch,
            'Files': data.files.join('\n')
          }
        };
      
      case NotificationType.LARGE_FILE:
        return {
          title: '📦 Large File Detected',
          message: `File exceeds size limit: ${data.file} (${data.size})`,
          color: '#FF9900',
          fields: {
            'File': data.file,
            'Size': data.size,
            'Limit': data.limit
          }
        };
      
      case NotificationType.CI_FAILED:
        return {
          title: '❌ CI/CD Failed',
          message: `Build failed for ${data.branch}`,
          color: '#FF0000',
          fields: {
            'Branch': data.branch,
            'Job': data.job,
            'Error': data.error
          }
        };
      
      case NotificationType.CI_SUCCESS:
        return {
          title: '✅ CI/CD Success',
          message: `Build passed for ${data.branch}`,
          color: '#00FF00',
          fields: {
            'Branch': data.branch,
            'Job': data.job,
            'Duration': data.duration
          }
        };
      
      default:
        return {
          title: '📢 Git Notification',
          message: JSON.stringify(data),
          color: '#0099FF'
        };
    }
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = {
  NotificationManager,
  NotificationType
};

// ── CLI Usage ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  const manager = new NotificationManager();
  
  // Test notification
  manager.send(NotificationType.PUSH, {
    repo: 'AXION',
    branch: 'main',
    commits: 3,
    author: 'Developer'
  }).then(() => {
    console.log('✅ Test notification sent');
  }).catch(error => {
    console.error('❌ Failed to send notification:', error);
  });
}
