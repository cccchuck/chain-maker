import { UniswapClient, dextools } from '@/apis'
import { strategies } from '@/config/strategies'
import { type Strategy } from '@/config/strategies/types'
import { client, walletClient } from '@/rpc'
import { OHLCV, Position, TokenInfo } from '@/types'
import { logger } from '@/utils'
import dayjs from 'dayjs'

export class StrategyManager {
  static strategies: Strategy[] = strategies

  static async run() {
    const uniswapClient = new UniswapClient(client, walletClient)
    // const ohlcvMap = new Map<string, OHLCV[]>()
    // Key = token address
    const tokenInfoMap = new Map<string, TokenInfo>()
    // Key = strategy.name + tokenInfo.pair
    const positionMap = new Map<string, Position | null>()

    for (const strategy of this.strategies) {
      logger.info(`[${strategy.name}] Initializing Strategy`)

      logger.info(`[${strategy.name}] Get Token: ${strategy.address} Info`)
      const tokenInfo = await dextools.fetchTokenInfo(strategy.address)
      tokenInfoMap.set(strategy.address, tokenInfo)

      logger.info(`[${strategy.name}] Start Interval, Interval: 5000ms`)
      setInterval(async () => {
        const ohlcv = await dextools.fetchOHLCV(tokenInfo.pair)
        const position = positionMap.get(`${strategy.name}-${tokenInfo.pair}`)
        if (!position) {
          const isEntry = await strategy.isEntry(ohlcv, tokenInfo)
          if (isEntry) {
            logger.info(`[${strategy.name}] [${tokenInfo.symbol}] Entry`)
          }
        } else {
          const isExit = await strategy.isExit(ohlcv, tokenInfo, position)
          if (isExit) {
            logger.info(`[${strategy.name}] [${tokenInfo.symbol}] Exit`)
          }
        }
      }, 5000)

      // logger.info(`[${strategy.name}] Get Token: ${strategy.address} OHLCV`)
      // const ohlcv = await DataProvider.fetchOHLCV(tokenInfo.pair)
      // ohlcvMap.set(tokenInfo.pair, ohlcv)

      // logger.info(`[${strategy.name}] Start Interval, Interval: 5000ms`)
      // setInterval(async () => {
      //   const ohlcv = await DataProvider.fetchOHLCV(tokenInfo.pair)
      //   ohlcvMap.set(tokenInfo.pair, ohlcv)
      //   const [ts, open, high, low, close, volume] = ohlcv[0]
      //   logger.info(
      //     `[${strategy.name}] [${tokenInfo.symbol}] Time: ${dayjs(ts).format(
      //       'YYYY-MM-DD HH:mm:ss'
      //     )} OPEN: ${open} HIGH: ${high} LOW: ${low} CLOSE: ${close} VOLUME: ${volume}`
      //   )
      //   logger.info(
      //     `[${strategy.name}] [${tokenInfo.symbol}] Latest Price: ${close}`
      //   )
      //   const position = positionMap.get(tokenInfo.pair)
      //   if (position) {
      //     // 是否需要平仓
      //   } else {
      //     // 是否需要开仓
      //   }
      // }, 5000)

      // DataProvider.subscribe(tokenInfo.pair, strategy.run)
    }
  }
}
