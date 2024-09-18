import { logger } from '@/utils'
import TelegramBot from 'node-telegram-bot-api'

export class TelegramClient {
  private bot: TelegramBot
  private chatId: string
  private messageThreadId: number

  constructor(token: string, chatId: string, messageThreadId: number) {
    this.bot = new TelegramBot(token, { polling: true })
    this.chatId = chatId
    this.messageThreadId = messageThreadId
  }

  async sendMessage(message: string) {
    if (!this.bot) {
      logger.error('Telegram bot is not initialized')
      return
    }
    await this.bot.sendMessage(this.chatId, message, {
      message_thread_id: this.messageThreadId,
    })
  }
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set')
}
if (!process.env.TELEGRAM_CHAT_ID) {
  throw new Error('TELEGRAM_CHAT_ID is not set')
}
if (!process.env.TELEGRAM_MESSAGE_THREAD_ID) {
  throw new Error('TELEGRAM_MESSAGE_THREAD_ID is not set')
}

export const telegramClient = new TelegramClient(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID,
  parseInt(process.env.TELEGRAM_MESSAGE_THREAD_ID)
)
