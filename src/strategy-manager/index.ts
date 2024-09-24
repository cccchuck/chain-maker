import { UniswapClient, dextools, erc20, telegramClient } from '@/apis'
import { strategies } from '@/config/strategies'
import { type Strategy } from '@/config/strategies/types'
import { SWAP_ROUTER_2_ADDRESS } from '@/const'
import { redisClient } from '@/db'
import { client, walletClient } from '@/rpc'
import { Position, TokenInfo } from '@/types'
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

    let isSwapping = false
    const uniswapClient = new UniswapClient(client, walletClient)

    const runInterval = async (strategies: Strategy[]) => {
      for (const strategy of strategies) {
        if (isSwapping) {
          continue
        }

        const tokenInfoKey = `tokenInfo-${strategy.name}-${strategy.address}`
        const positionKey = `position-${strategy.name}-${strategy.address}`
        let tokenInfo: TokenInfo | undefined = JSON.parse(
          (await redisClient.get(tokenInfoKey)) || 'null'
        )
        const positions = JSON.parse(
          (await redisClient.get(positionKey)) || '[]'
        ) as Position[]

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
        if (!positions) {
          const isEntry = await strategy.isEntry(ohlcv, tokenInfo, positions)
          if (isEntry) {
            isSwapping = true
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
                JSON.stringify([
                  ...positions,
                  {
                    entryTime: ohlcv[0][0],
                    entryPrice: ohlcv[0][4],
                    entryVolume: entryVolume,
                  },
                ])
              )
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenInfo.symbol}] Entry Success`
              )
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenInfo.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Entry Success`
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
            }
            isSwapping = false
          }
        } else {
          const exitPositions = await strategy.isExit(
            ohlcv,
            tokenInfo,
            positions
          )
          for (const position of exitPositions) {
            isSwapping = true
            const { hash } = (await uniswapClient.swapExactTokensForETH(
              tokenInfo.address as Address,
              tokenInfo.decimals,
              position.entryVolume,
              strategy.slippage
            )) || { hash: null }
            if (hash) {
              const newPositions = positions.filter(
                (p) => p.entryTime !== position.entryTime
              )
              await redisClient.set(positionKey, JSON.stringify(newPositions))
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenInfo.symbol}] Exit Success`
              )
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenInfo.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Exit Success`
              )
              logger.info(
                `[${strategy.name}] [${tokenInfo.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
            }
            isSwapping = false
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
