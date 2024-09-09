import dayjs from 'dayjs'
import { Position, TokenInfo, type OHLCV } from '@/types'
import { logger } from '@/utils'
import { type Strategy } from '../types'

export class VapStrategy implements Strategy {
  name = 'VAP'
  address: string
  orderSize = 0.5
  targetPNL = 0.3
  slippage = 50

  constructor(address: string) {
    this.address = address
  }

  async isEntry(ohlcv: OHLCV[], { symbol }: TokenInfo) {
    const [ts, open, high, low, close, volume] = ohlcv[0]
    logger.info(
      `[${this.name}] [${symbol}] Time: ${dayjs(ts).format(
        'YYYY-MM-DD HH:mm:ss'
      )} OPEN: ${open} HIGH: ${high} LOW: ${low} CLOSE: ${close} VOLUME: ${volume}`
    )
    logger.info(`[${this.name}] [${symbol}] Latest Price: ${close}`)

    const isEntry = close > open
    return isEntry
  }

  async isExit(ohlcv: OHLCV[], { symbol }: TokenInfo, position: Position) {
    const [ts, open, high, low, close, volume] = ohlcv[0]
    logger.info(
      `[${this.name}] [${symbol}] Time: ${dayjs(ts).format(
        'YYYY-MM-DD HH:mm:ss'
      )} OPEN: ${open} HIGH: ${high} LOW: ${low} CLOSE: ${close} VOLUME: ${volume}`
    )
    logger.info(`[${this.name}] [${symbol}] Latest Price: ${close}`)

    const isExit = close / position.entryPrice - 1 > this.targetPNL
    return isExit
  }
}
