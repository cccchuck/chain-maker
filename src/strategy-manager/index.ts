import { UniswapClient, dextools, erc20 } from '@/apis'
import { strategies } from '@/config/strategies'
import { type Strategy } from '@/config/strategies/types'
import { SWAP_ROUTER_2_ADDRESS } from '@/const'
import { client, walletClient } from '@/rpc'
import { Position, TokenInfo } from '@/types'
import { logger } from '@/utils'
import { Address, formatUnits } from 'viem'

const MAX_ALLOWANCE = 2n ** 256n - 1n

export class StrategyManager {
  static strategies: Strategy[] = strategies

  static async run() {
    const uniswapClient = new UniswapClient(client, walletClient)
    // const ohlcvMap = new Map<string, OHLCV[]>()
    // Key = strategy.name + token address
    const tokenInfoMap = new Map<string, TokenInfo>()
    // Key = strategy.name + token address
    const positionMap = new Map<string, Position>()

    const runInterval = async (strategies: Strategy[]) => {
      for (const strategy of strategies) {
        const tokenInfoKey = `${strategy.name}-${strategy.address}`
        let tokenInfo: TokenInfo | undefined = tokenInfoMap.get(tokenInfoKey)
        if (!tokenInfo) {
          logger.info(`[${strategy.name}] Initializing Strategy`)
          logger.info(`[${strategy.name}] Get Token: ${strategy.address} Info`)
          tokenInfo = await dextools.fetchTokenInfo(strategy.address)
          tokenInfoMap.set(tokenInfoKey, tokenInfo)

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
        const position = positionMap.get(tokenInfoKey)
        if (!position) {
          const isEntry = await strategy.isEntry(ohlcv, tokenInfo)
          if (isEntry) {
            logger.info(`[${strategy.name}] [${tokenInfo.symbol}] Entry`)
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
              positionMap.set(tokenInfoKey, {
                entryTime: ohlcv[0][0],
                entryPrice: ohlcv[0][4],
                entryVolume: entryVolume,
              })
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
            logger.info(`[${strategy.name}] [${tokenInfo.symbol}] Exit`)
            const { hash } = (await uniswapClient.swapExactTokensForETH(
              tokenInfo.address as Address,
              tokenInfo.decimals,
              position.entryVolume,
              strategy.slippage
            )) || { hash: null }
            if (hash) {
              positionMap.delete(tokenInfoKey)
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

    setInterval(async () => {
      await runInterval(strategies)
    }, 5000)
  }
}
