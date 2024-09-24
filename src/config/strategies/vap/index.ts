import { Position, TokenInfo, type OHLCV } from '@/types'
import { logger } from '@/utils'
import { type Strategy } from '../types'

export class VapStrategy implements Strategy {
  name = 'VAP'
  address: string
  orderSize: number
  targetPNL: number
  slippage: number
  maxPositions: number
  maxLoss: number

  constructor({
    address,
    orderSize = 0.3,
    targetPNL = 0.1,
    slippage = 50,
    maxPositions = 2,
    maxLoss = 0.5,
  }: {
    address: string
    orderSize?: number
    targetPNL?: number
    slippage?: number
    maxPositions?: number
    maxLoss?: number
  }) {
    this.address = address
    this.orderSize = orderSize
    this.targetPNL = targetPNL
    this.slippage = slippage
    this.maxPositions = maxPositions
    this.maxLoss = maxLoss
  }

  async isEntry(ohlcv: OHLCV[], { symbol }: TokenInfo, positions: Position[]) {
    if (ohlcv.length === 0) return false
    if (positions.length >= this.maxPositions) return false

    const currentClose = ohlcv[0][4]
    const [, open, , low, close, volume] = ohlcv[1]
    logger.info(`[${this.name}] [${symbol}] Current Price: ${currentClose}`)

    const realBody = close - open
    const lowerShadow = low - close
    const volumeMean =
      ohlcv.slice(0, 12).reduce((acc, item) => acc + Number(item[5]), 0) /
      ohlcv.length

    if (
      realBody < 0 &&
      lowerShadow < 0 &&
      Math.abs(lowerShadow) >= 2 * Math.abs(realBody) &&
      volume >= 2 * volumeMean
    ) {
      logger.info(`[${this.name}] [${symbol}] Entry Condition Met;`)
      logger.info(
        `[${this.name}] [${symbol}] Open: ${open}; Low: ${low}; Close: ${close}; RealBody: ${realBody}; LowerShadow: ${lowerShadow}`
      )
      logger.info(
        `[${this.name}] [${symbol}] Volume: ${volume}; VolumeMean: ${volumeMean}`
      )
      return true
    }

    return false
  }

  async isExit(ohlcv: OHLCV[], { symbol }: TokenInfo, positions: Position[]) {
    if (ohlcv.length === 0) return []

    const close = ohlcv[0][4]
    logger.info(`[${this.name}] [${symbol}] Current Price: ${close};`)

    positions.filter((position) => {
      const isExit =
        close / position.entryPrice - 1 >= this.targetPNL ||
        close / position.entryPrice - 1 >= -this.maxLoss
      if (isExit) {
        logger.info(`[${this.name}] [${symbol}] Exit Condition Met;`)
        logger.info(
          `[${this.name}] [${symbol}] Entry Price: ${
            position.entryPrice
          }; Current Price: ${close}; PNL: ${close / position.entryPrice - 1}`
        )
      }
      return isExit
    })

    return positions
  }
}
