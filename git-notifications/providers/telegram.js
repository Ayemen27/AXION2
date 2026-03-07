// ══════════════════════════════════════════════════════════════════════════════
// Telegram Notification Provider
// ══════════════════════════════════════════════════════════════════════════════

const TelegramBot = require('node-telegram-bot-api');

class TelegramNotifier {
  constructor() {
    this.name = 'Telegram';
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  async send(message) {
    const text = `
*${message.title}*

${message.message}

${Object.entries(message.fields || {}).map(([key, value]) => 
  `*${key}:* ${value}`
).join('\n')}

_AXION Git Notifications_
    `.trim();
    
    await this.bot.sendMessage(this.chatId, text, {
      parse_mode: 'Markdown'
    });
    
    console.log(`✅ Sent via ${this.name}`);
  }
}

module.exports = TelegramNotifier;
