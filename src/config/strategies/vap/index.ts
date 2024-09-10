import dayjs from 'dayjs'
import { Position, TokenInfo, type OHLCV } from '@/types'
import { logger } from '@/utils'
import { type Strategy } from '../types'

export class VapStrategy implements Strategy {
  name = 'VAP'
  address: string
  orderSize = 0.3
  targetPNL = 0.15
  slippage = 50

  constructor(address: string) {
    this.address = address
  }

  async isEntry(ohlcv: OHLCV[], { symbol }: TokenInfo) {
    if (ohlcv.length === 0) return false

    const close = ohlcv[0][4]
    logger.info(`[${this.name}] [${symbol}] Latest Price: ${close}; Wait Entry`)

    const volume2 = ohlcv[2][5]
    const volume1 = ohlcv[1][5]
    const volume0 = ohlcv[0][5]
    const volumeTrend = volume0 > volume1 && volume1 > volume2
    const priceDiff2 = ohlcv[2][4] - ohlcv[2][1]
    const priceDiff1 = ohlcv[1][4] - ohlcv[1][1]
    const priceDiff0 = ohlcv[0][4] - ohlcv[0][1]
    const priceTrend =
      priceDiff0 > priceDiff1 &&
      priceDiff1 > priceDiff2 &&
      priceDiff0 < 0 &&
      priceDiff1 < 0 &&
      priceDiff2 < 0

    if (volumeTrend && priceTrend) {
      return true
    }

    const volumeMean =
      ohlcv.reduce((acc, item) => acc + Number(item[5]), 0) / ohlcv.length
    const priceDiff = ohlcv[0][4] - ohlcv[0][1]
    if (
      priceDiff < 0 &&
      ohlcv[0][5] > volumeMean &&
      Math.abs(priceDiff) < Math.abs(ohlcv[0][3] - ohlcv[0][4])
    ) {
      return true
    }

    return false
  }

  async isExit(ohlcv: OHLCV[], { symbol }: TokenInfo, position: Position) {
    if (ohlcv.length === 0) return false

    const close = ohlcv[0][4]
    logger.info(`[${this.name}] [${symbol}] Latest Price: ${close}; Wait Exit`)

    const isExit = close / position.entryPrice - 1 >= this.targetPNL
    return isExit
  }
}
