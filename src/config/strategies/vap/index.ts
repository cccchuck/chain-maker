import dayjs from 'dayjs'
import { DataProvider } from '@/data-provider'
import { type OHLCV, type Position } from '@/types'
import { logger } from '@/utils'
import { type Strategy } from '../types'

export class VapStrategy implements Strategy {
  name = 'VAP'
  address: string

  constructor(address: string) {
    this.address = address
  }

  async run() {
    const ohlcvMap = new Map<string, OHLCV[]>()
    const positionMap = new Map<string, Position | null>()

    logger.info(`[${this.name}] Initializing Strategy`)

    logger.info(`[${this.name}] Get Token: ${this.address} Info`)
    const tokenInfo = await DataProvider.fetchTokenInfo(this.address)

    logger.info(`[${this.name}] Get Token: ${this.address} OHLCV`)
    const ohlcv = await DataProvider.fetchOHLCV(tokenInfo.pair)
    ohlcvMap.set(tokenInfo.pair, ohlcv)

    logger.info(`[${this.name}] Start Interval, Interval: 5000ms`)
    setInterval(async () => {
      const ohlcv = await DataProvider.fetchOHLCV(tokenInfo.pair)
      ohlcvMap.set(tokenInfo.pair, ohlcv)
      const [ts, open, high, low, close, volume] = ohlcv[0]
      logger.info(
        `[${this.name}] [${tokenInfo.symbol}] Time: ${dayjs(ts).format(
          'YYYY-MM-DD HH:mm:ss'
        )} OPEN: ${open} HIGH: ${high} LOW: ${low} CLOSE: ${close} VOLUME: ${volume}`
      )
      logger.info(`[${this.name}] [${tokenInfo.symbol}] Latest Price: ${close}`)
      const position = positionMap.get(tokenInfo.pair)
      if (position) {
        // 是否需要平仓
      } else {
        // 是否需要开仓
      }
    }, 5000)
  }
}
