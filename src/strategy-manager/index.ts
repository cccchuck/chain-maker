import { UniswapClient, dextools } from '@/apis'
import { strategies } from '@/config/strategies'
import { type Strategy } from '@/config/strategies/types'
import { client, walletClient } from '@/rpc'
import { Position, TokenInfo } from '@/types'
import { logger } from '@/utils'

export class StrategyManager {
  static strategies: Strategy[] = strategies

  static async run() {
    const uniswapClient = new UniswapClient(client, walletClient)
    // const ohlcvMap = new Map<string, OHLCV[]>()
    // Key = strategy.name + token address
    const tokenInfoMap = new Map<string, TokenInfo>()
    // Key = strategy.name + token address
    const positionMap = new Map<string, Position | null>()

    const runInterval = async (strategies: Strategy[]) => {
      for (const strategy of strategies) {
        const tokenInfoKey = `${strategy.name}-${strategy.address}`
        let tokenInfo: TokenInfo | undefined = tokenInfoMap.get(tokenInfoKey)
        if (!tokenInfo) {
          logger.info(`[${strategy.name}] Initializing Strategy`)
          logger.info(`[${strategy.name}] Get Token: ${strategy.address} Info`)
          tokenInfo = await dextools.fetchTokenInfo(strategy.address)
          tokenInfoMap.set(tokenInfoKey, tokenInfo)
        }

        const ohlcv = await dextools.fetchOHLCV(tokenInfo.pair)
        const position = positionMap.get(tokenInfoKey)
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
      }
    }

    await runInterval(strategies)

    setInterval(async () => {
      await runInterval(strategies)
    }, 5000)
  }
}
