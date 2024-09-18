import { UniswapClient, dextools, erc20 } from '@/apis'
import { strategies } from '@/config/strategies'
import { type Strategy } from '@/config/strategies/types'
import { SWAP_ROUTER_2_ADDRESS } from '@/const'
import { redisClient } from '@/db'
import { client, walletClient } from '@/rpc'
import { TokenInfo } from '@/types'
import { logger } from '@/utils'
import { Address, formatUnits } from 'viem'

const MAX_ALLOWANCE = 2n ** 256n - 1n

export class StrategyManager {
  static strategies: Strategy[] = strategies

  static async run() {
    while (!redisClient.isReady) {
      logger.error('Redis Client is not ready')
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    logger.info('Redis Client is ready')

    const uniswapClient = new UniswapClient(client, walletClient)

    const runInterval = async (strategies: Strategy[]) => {
      for (const strategy of strategies) {
        const tokenInfoKey = `tokenInfo-${strategy.name}-${strategy.address}`
        const positionKey = `position-${strategy.name}-${strategy.address}`
        let tokenInfo: TokenInfo | undefined = JSON.parse(
          (await redisClient.get(tokenInfoKey)) || 'null'
        )
        const position = JSON.parse(
          (await redisClient.get(positionKey)) || 'null'
        )
        if (!tokenInfo) {
          logger.info(`[${strategy.name}] Initializing Strategy`)
          logger.info(`[${strategy.name}] Get Token: ${strategy.address} Info`)
          tokenInfo = await dextools.fetchTokenInfo(strategy.address)
          // tokenInfoMap.set(tokenInfoKey, tokenInfo)
          await redisClient.set(tokenInfoKey, JSON.stringify(tokenInfo))

          logger.info(`[${strategy.name}] [${tokenInfo.symbol}] Get Allowance`)
          const allowance = await erc20.getAllowance(
            tokenInfo.address as Address,
            walletClient.account.address as Address,
            SWAP_ROUTER_2_ADDRESS as Address
          )
          logger.info(
            `[${strategy.name}] [${tokenInfo.symbol}] Allowance: ${allowance}`
          )

          if (allowance < (MAX_ALLOWANCE * 2n) / 10n) {
            logger.info(
              `[${strategy.name}] [${tokenInfo.symbol}] Set Allowance`
            )
            await erc20.approve(
              tokenInfo.address as Address,
              SWAP_ROUTER_2_ADDRESS as Address,
              MAX_ALLOWANCE
            )
            logger.info(
              `[${strategy.name}] [${tokenInfo.symbol}] Set Allowance Success`
            )
          }
        }

        const ohlcv = await dextools.fetchOHLCV(tokenInfo.pair)
        if (!position) {
          const isEntry = await strategy.isEntry(ohlcv, tokenInfo)
          if (isEntry) {
            const { hash } = (await uniswapClient.swapExactETHForTokens(
              tokenInfo.address as Address,
              tokenInfo.decimals,
              strategy.orderSize,
              strategy.slippage
            )) || { hash: null }
            if (hash) {
              const entryVolume = formatUnits(
                await erc20.getBalance(
                  tokenInfo.address as Address,
                  walletClient.account.address as Address
                ),
                tokenInfo.decimals
              )
              await redisClient.set(
                positionKey,
                JSON.stringify({
                  entryTime: ohlcv[0][0],
                  entryPrice: ohlcv[0][4],
                  entryVolume: entryVolume,
                })
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Entry Success`
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
            }
          }
        } else {
          const isExit = await strategy.isExit(ohlcv, tokenInfo, position)
          if (isExit) {
            const { hash } = (await uniswapClient.swapExactTokensForETH(
              tokenInfo.address as Address,
              tokenInfo.decimals,
              position.entryVolume,
              strategy.slippage
            )) || { hash: null }
            if (hash) {
              await redisClient.del(positionKey)
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Exit Success`
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
            }
          }
        }
      }
    }

    await runInterval(strategies)

    const interval = setInterval(async () => {
      await runInterval(strategies)
    }, 5000)

    return () => clearInterval(interval)
  }
}
