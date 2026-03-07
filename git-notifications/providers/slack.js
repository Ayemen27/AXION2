// ══════════════════════════════════════════════════════════════════════════════
// Slack Notification Provider
// ══════════════════════════════════════════════════════════════════════════════

const { IncomingWebhook } = require('@slack/webhook');

class SlackNotifier {
  constructor() {
    this.name = 'Slack';
    this.webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
  }

  async send(message) {
    const payload = {
      text: message.title,
      attachments: [{
        color: message.color,
        text: message.message,
        fields: Object.entries(message.fields || {}).map(([key, value]) => ({
          title: key,
          value: value,
          short: true
        })),
        footer: 'AXION Git Notifications',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await this.webhook.send(payload);
    console.log(`✅ Sent via ${this.name}`);
  }
}

module.exports = SlackNotifier;
