import { Position, TokenInfo, type OHLCV } from '@/types'
import { logger } from '@/utils'
import { type Strategy } from '../types'

export class VapStrategy implements Strategy {
  name = 'VAP'
  address: string
  orderSize = 0.3
  targetPNL = 0.1
  slippage = 50

  constructor(address: string) {
    this.address = address
  }

  async isEntry(ohlcv: OHLCV[], { symbol }: TokenInfo) {
    if (ohlcv.length === 0) return false

    const currentClose = ohlcv[0][4]
    const [, open, , low, close, volume] = ohlcv[1]
    logger.info(`[${this.name}] [${symbol}] Current Price: ${currentClose}`)

    const realBody = close - open
    const lowerShadow = low - close
    const volumeMean =
      ohlcv.reduce((acc, item) => acc + Number(item[5]), 0) / ohlcv.length
    const volumeStandardDeviation = Math.sqrt(
      ohlcv.reduce(
        (acc, item) => acc + Math.pow(Number(item[5]) - volumeMean, 2),
        0
      ) / ohlcv.length
    )

    if (
      realBody < 0 &&
      lowerShadow < 0 &&
      Math.abs(lowerShadow) > 2 * Math.abs(realBody) &&
      volume >= volumeMean + volumeStandardDeviation
    ) {
      logger.info(`[${this.name}] [${symbol}] Entry Condition Met;`)
      logger.info(
        `[${this.name}] [${symbol}] Open: ${open}; Low: ${low}; Close: ${close}; RealBody: ${realBody}; LowerShadow: ${lowerShadow}; Volume: ${volume}`
      )
      logger.info(
        `[${this.name}] [${symbol}] Volume: ${volume}; VolumeMean: ${volumeMean}; VolumeStandardDeviation: ${volumeStandardDeviation}`
      )
      return true
    }

    return false
  }

  async isExit(ohlcv: OHLCV[], { symbol }: TokenInfo, position: Position) {
    if (ohlcv.length === 0) return false

    const close = ohlcv[0][4]
    logger.info(`[${this.name}] [${symbol}] Current Price: ${close};`)

    const isExit = close / position.entryPrice - 1 >= this.targetPNL
    if (isExit) {
      logger.info(`[${this.name}] [${symbol}] Exit Condition Met;`)
      logger.info(
        `[${this.name}] [${symbol}] Entry Price: ${
          position.entryPrice
        }; Current Price: ${close}; PNL: ${close / position.entryPrice - 1}`
      )
    }
    return isExit
  }
}
