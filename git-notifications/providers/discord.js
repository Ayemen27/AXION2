// ══════════════════════════════════════════════════════════════════════════════
// Discord Notification Provider
// ══════════════════════════════════════════════════════════════════════════════

const axios = require('axios');

class DiscordNotifier {
  constructor() {
    this.name = 'Discord';
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  }

  async send(message) {
    const payload = {
      embeds: [{
        title: message.title,
        description: message.message,
        color: parseInt(message.color.replace('#', ''), 16),
        fields: Object.entries(message.fields || {}).map(([key, value]) => ({
          name: key,
          value: value,
          inline: true
        })),
        footer: {
          text: 'AXION Git Notifications'
        },
        timestamp: new Date().toISOString()
      }]
    };
    
    await axios.post(this.webhookUrl, payload);
    console.log(`✅ Sent via ${this.name}`);
  }
}

module.exports = DiscordNotifier;
