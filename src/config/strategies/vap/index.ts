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
    if (ohlcv.length === 0) return false

    const [ts, open, high, low, close, volume] = ohlcv[0]
    logger.info(
      `[${this.name}] [${symbol}] Time: ${dayjs(ts).format(
        'YYYY-MM-DD HH:mm:ss'
      )} OPEN: ${open} HIGH: ${high} LOW: ${low} CLOSE: ${close} VOLUME: ${volume}`
    )
    logger.info(`[${this.name}] [${symbol}] Latest Price: ${close}`)

    const volumeTrend = ohlcv[0][5] > ohlcv[1][5] && ohlcv[1][5] > ohlcv[2][5]
    const priceTrend =
      ohlcv[0][1] - ohlcv[0][4] > ohlcv[1][1] - ohlcv[1][4] &&
      ohlcv[1][1] - ohlcv[1][4] > ohlcv[2][1] - ohlcv[2][4] &&
      ohlcv[0][1] - ohlcv[0][4] < 0 &&
      ohlcv[1][1] - ohlcv[1][4] < 0 &&
      ohlcv[2][1] - ohlcv[2][4] < 0

    if (volumeTrend && priceTrend) {
      return true
    }

    const volumeMean =
      ohlcv.reduce((acc, item) => acc + Number(item[5]), 0) / ohlcv.length
    if (
      ohlcv[0][5] > volumeMean * 2 &&
      ohlcv[0][1] - ohlcv[0][4] < ohlcv[0][4] - ohlcv[0][3] &&
      ohlcv[0][1] - ohlcv[0][4] > 0 &&
      ohlcv[0][4] - ohlcv[0][3] > 0
    ) {
      return true
    }

    return false
  }

  async isExit(ohlcv: OHLCV[], { symbol }: TokenInfo, position: Position) {
    if (ohlcv.length === 0) return false

    const [ts, open, high, low, close, volume] = ohlcv[0]
    logger.info(
      `[${this.name}] [${symbol}] Time: ${dayjs(ts).format(
        'YYYY-MM-DD HH:mm:ss'
      )} OPEN: ${open} HIGH: ${high} LOW: ${low} CLOSE: ${close} VOLUME: ${volume}`
    )
    logger.info(`[${this.name}] [${symbol}] Latest Price: ${close}`)

    const isExit = close / position.entryPrice - 1 >= this.targetPNL
    return isExit
  }
}
