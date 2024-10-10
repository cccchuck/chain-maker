import { UniswapClient, dextools, erc20, telegramClient } from '@/apis'
import { strategies } from '@/config/strategies'
import { type Strategy } from '@/config/strategies/types'
import { SWAP_ROUTER_2_ADDRESS } from '@/const'
import { redisClient } from '@/db'
import { client, walletClient } from '@/rpc'
import { Position, TokenMetadata } from '@/types'
import { logger } from '@/utils'
import { Address, formatUnits } from 'viem'

const MAX_ALLOWANCE = 2n ** 256n - 1n

import { buildTokenInfoKey, buildPositionKey, getPairAddress } from '@/utils'

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

        const tokenMetadataKey = buildTokenInfoKey(strategy.address as Address)
        const positionKey = buildPositionKey(
          strategy.address as Address,
          strategy.name
        )
        let tokenMetadata: TokenMetadata | null = JSON.parse(
          (await redisClient.get(tokenMetadataKey)) || 'null'
        )
        const positions = JSON.parse(
          (await redisClient.get(positionKey)) || '[]'
        ) as Position[]

        if (!tokenMetadata) {
          logger.info(`[${strategy.name}] Initializing Strategy`)
          logger.info(`[${strategy.name}] Get Token: ${strategy.address} Info`)
          tokenMetadata = await uniswapClient.getTokenMetadata(
            strategy.address as Address
          )
          if (tokenMetadata === null) continue

          await redisClient.set(tokenMetadataKey, JSON.stringify(tokenMetadata))

          logger.info(
            `[${strategy.name}] [${tokenMetadata.symbol}] Get Allowance`
          )
          const allowance = await erc20.getAllowance(
            tokenMetadata.address as Address,
            walletClient.account.address as Address,
            SWAP_ROUTER_2_ADDRESS as Address
          )
          logger.info(
            `[${strategy.name}] [${tokenMetadata.symbol}] Allowance: ${allowance}`
          )

          if (allowance < (MAX_ALLOWANCE * 2n) / 10n) {
            logger.info(
              `[${strategy.name}] [${tokenMetadata.symbol}] Set Allowance`
            )
            await erc20.approve(
              tokenMetadata.address as Address,
              SWAP_ROUTER_2_ADDRESS as Address,
              MAX_ALLOWANCE
            )
            logger.info(
              `[${strategy.name}] [${tokenMetadata.symbol}] Set Allowance Success`
            )
          }
        }

        const pairAddress = getPairAddress(
          strategy.address as Address,
          tokenMetadata.decimals
        )
        const ohlcv = await dextools.fetchOHLCV(pairAddress)
        if (positions.length < strategy.maxPositions) {
          const isEntry = await strategy.isEntry(
            ohlcv,
            tokenMetadata,
            positions
          )
          if (isEntry) {
            isSwapping = true
            const beforeBalance = await erc20.getBalance(
              tokenMetadata.address as Address,
              walletClient.account.address as Address
            )
            const hash = await uniswapClient.swap(
              true,
              strategy.address as Address,
              strategy.orderSize.toString(),
              strategy.slippage
            )
            if (hash !== null) {
              const afterBalance = await erc20.getBalance(
                tokenMetadata.address as Address,
                walletClient.account.address as Address
              )
              const entryVolume = formatUnits(
                afterBalance - beforeBalance,
                tokenMetadata.decimals
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
                `[${strategy.name}] [${tokenMetadata.symbol}] Entry Success`
              )
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenMetadata.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
              logger.info(
                `[${strategy.name}] [${tokenMetadata.symbol}] Entry Success`
              )
              logger.info(
                `[${strategy.name}] [${tokenMetadata.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
            }
            isSwapping = false
          }
        } else {
          const exitPositions = await strategy.isExit(
            ohlcv,
            tokenMetadata,
            positions
          )
          for (const position of exitPositions) {
            isSwapping = true
            const hash = await uniswapClient.swap(
              true,
              strategy.address as Address,
              strategy.orderSize.toString(),
              strategy.slippage
            )
            if (hash) {
              const newPositions = positions.filter(
                (p) => p.entryTime !== position.entryTime
              )
              await redisClient.set(positionKey, JSON.stringify(newPositions))
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenMetadata.symbol}] Exit Success`
              )
              await telegramClient.sendMessage(
                `[${strategy.name}] [${tokenMetadata.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
              )
              logger.info(
                `[${strategy.name}] [${tokenMetadata.symbol}] Exit Success`
              )
              logger.info(
                `[${strategy.name}] [${tokenMetadata.symbol}] Swap Hash: ${hash}; Swap Price: ${ohlcv[0][4]}`
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
