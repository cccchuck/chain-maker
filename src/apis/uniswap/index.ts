import {
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
  WETH9,
} from '@uniswap/sdk-core'
import { Pair, Route, Trade } from '@uniswap/v2-sdk'
import {
  Address,
  parseAbi,
  parseEther,
  parseUnits,
  PublicClient,
  WalletClient,
} from 'viem'
import { SWAP_ROUTER_2_ADDRESS } from '@/const'
import { logger } from '@/utils'

export class UniswapClient {
  public client: PublicClient
  public walletClient: WalletClient

  constructor(client: PublicClient, walletClient: WalletClient) {
    this.client = client
    this.walletClient = walletClient
  }

  /**
   * @description Create a pair of tokens
   * @param token0 Token0
   * @param token1 Token1
   * @returns Pair
   */
  public async createPair(token0: Token, token1: Token) {
    const pairAddress = Pair.getAddress(token0, token1)

    const [reserve0, reserve1] = await this.client.readContract({
      address: pairAddress as `0x${string}`,
      abi: parseAbi([
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      ]),
      functionName: 'getReserves',
    })

    const tokens = [token0, token1]
    const [tokenA, tokenB] = tokens[0].sortsBefore(tokens[1])
      ? [tokens[0], tokens[1]]
      : [tokens[1], tokens[0]]

    const pair = new Pair(
      CurrencyAmount.fromRawAmount(tokenA, reserve0.toString()),
      CurrencyAmount.fromRawAmount(tokenB, reserve1.toString())
    )

    return pair
  }

  /**
   * @description Get swap exact ETH for tokens params
   * @param tokenAddress Token address
   * @param tokenDecimals Token decimals
   * @param amountOfETH Amount of ETH
   * @param slippage Slippage(100 = 1%)
   * @returns Swap exact ETH for tokens params
   */
  public async getSwapExactETHForTokensParams(
    tokenAddress: Address,
    tokenDecimals: number,
    amountOfETH: number,
    slippage: number
  ) {
    const token = new Token(1, tokenAddress, tokenDecimals)
    const WETH = new Token(1, WETH9[1].address, 18)
    const pair = await this.createPair(token, WETH)

    const route = new Route([pair], WETH, token)
    const trade = new Trade(
      route,
      CurrencyAmount.fromRawAmount(
        WETH,
        parseEther(amountOfETH.toString()).toString()
      ),
      TradeType.EXACT_INPUT
    )
    const amountOutMin = trade
      .minimumAmountOut(new Percent(slippage, 10000))
      .toExact()
    const path = trade.route.path.map((token) => token.address) as Address[]
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10

    return {
      path,
      deadline: BigInt(deadline),
      to: this.walletClient.account!.address as Address,
      amountOutMin: parseUnits(amountOutMin, tokenDecimals),
    }
  }

  /**
   * @description Get swap exact tokens for ETH params
   * @param tokenAddress Token address
   * @param tokenDecimals Token decimals
   * @param amountOfTokens Amount of tokens
   * @param slippage Slippage(100 = 1%)
   * @returns Swap exact tokens for ETH params
   */
  public async getSwapExactTokensForETHParams(
    tokenAddress: Address,
    tokenDecimals: number,
    amountOfTokens: string,
    slippage: number
  ) {
    const token = new Token(1, tokenAddress, tokenDecimals)
    const WETH = new Token(1, WETH9[1].address, 18)
    const pair = await this.createPair(token, WETH)

    const route = new Route([pair], token, WETH)
    const trade = new Trade(
      route,
      CurrencyAmount.fromRawAmount(
        token,
        parseUnits(amountOfTokens, tokenDecimals).toString()
      ),
      TradeType.EXACT_INPUT
    )

    const amountOutMin = trade
      .minimumAmountOut(new Percent(slippage, 10000))
      .toExact()
    const path = trade.route.path.map((token) => token.address) as Address[]
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10

    return {
      path,
      deadline: BigInt(deadline),
      amountOutMin: parseUnits(amountOutMin, 18),
      to: this.walletClient.account!.address as Address,
    }
  }

  /**
   * @description Swap exact ETH for tokens
   * @param tokenAddress Token address
   * @param tokenDecimals Token decimals
   * @param amountOfETH Amount of ETH
   * @param slippage Slippage(100 = 1%)
   * @returns Swap exact ETH for tokens result and hash
   */
  public async swapExactETHForTokens(
    tokenAddress: Address,
    tokenDecimals: number,
    amountOfETH: number,
    slippage: number
  ) {
    const params = await this.getSwapExactETHForTokensParams(
      tokenAddress,
      tokenDecimals,
      amountOfETH,
      slippage
    )

    const { request, result } = await this.client.simulateContract({
      chain: this.client.chain!,
      account: this.walletClient.account!,
      address: SWAP_ROUTER_2_ADDRESS,
      abi: parseAbi([
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
      ]),
      functionName: 'swapExactETHForTokens',
      args: [
        params.amountOutMin,
        params.path as Address[],
        params.to,
        params.deadline,
      ],
      value: parseEther(amountOfETH.toString()),
    })

    try {
      const hash = await this.walletClient.writeContract(request)
      await this.client.waitForTransactionReceipt({
        hash,
      })
      return {
        hash,
        result,
      }
    } catch (error) {
      logger.error(`Swap Error: ${(error as Error).message}`)
      return null
    }
  }

  /**
   * @description Swap exact tokens for ETH
   * @param tokenAddress Token address
   * @param tokenDecimals Token decimals
   * @param amountOfTokens Amount of tokens
   * @param slippage Slippage(100 = 1%)
   * @returns Swap exact tokens for ETH result and hash
   */
  public async swapExactTokensForETH(
    tokenAddress: Address,
    tokenDecimals: number,
    amountOfTokens: string,
    slippage: number
  ) {
    const params = await this.getSwapExactTokensForETHParams(
      tokenAddress,
      tokenDecimals,
      amountOfTokens,
      slippage
    )

    const { request, result } = await this.client.simulateContract({
      chain: this.client.chain!,
      account: this.walletClient.account!,
      address: SWAP_ROUTER_2_ADDRESS,
      abi: parseAbi([
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
      ]),
      functionName: 'swapExactTokensForETH',
      args: [
        parseUnits(amountOfTokens, tokenDecimals),
        params.amountOutMin,
        params.path as Address[],
        params.to,
        params.deadline,
      ],
    })

    try {
      const hash = await this.walletClient.writeContract(request)
      await this.client.waitForTransactionReceipt({
        hash,
      })

      return {
        hash,
        result,
      }
    } catch (error) {
      logger.error(`Swap Error: ${(error as Error).message}`)
      return null
    }
  }
}
