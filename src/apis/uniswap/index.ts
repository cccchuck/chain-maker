import { Address, PublicClient, WalletClient } from 'viem'
import { logger } from '@/utils'
import { serviceRequest } from '@/utils/request'
import { mainnet } from 'viem/chains'
import axios from 'axios'
import type { TokenMetadata } from '@/types'

type GetPrepareSwapParams = {
  from: Address
  to: Address
  tokenAddress: Address
  amountIn: string
  slippage?: number
  deadline?: number
}

type GetPrepareBuyParams = GetPrepareSwapParams

type GetPrepareSellParams = GetPrepareSwapParams

type GetPrepareSwapResponse = {
  nonce: number
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  gas: number
  to: Address
  value?: string
  data: string
}

type BeaverBuildResponse = {
  id: number
  jsonrpc: string
  error?: {
    code: number
    message: string
  }
  result?: `0x${string}`
}

const broadcastTransaction = async (
  rawTransaction: string
): Promise<[Error, null] | [null, `0x${string}`]> => {
  try {
    const res = await axios.post<BeaverBuildResponse>(
      'https://rpc.beaverbuild.org/',
      {
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [rawTransaction],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    if (res.status === 200 && res.data.result) {
      return [null, res.data.result]
    } else if (res.data.error) {
      return [new Error(res.data.error.message), null]
    } else {
      return [new Error(res.statusText), null]
    }
  } catch (error) {
    return [error as Error, null]
  }
}

export class UniswapClient {
  public client: PublicClient
  public walletClient: WalletClient

  constructor(client: PublicClient, walletClient: WalletClient) {
    this.client = client
    this.walletClient = walletClient
  }

  public async getTokenMetadata(
    tokenAddress: Address
  ): Promise<TokenMetadata | null> {
    const [err, tokenMetadata] = await serviceRequest.get<TokenMetadata>(
      '/get-token-metadata',
      {
        params: {
          tokenAddress,
        },
      }
    )
    if (err) {
      logger.error(`Get Token Metadata Error: ${err.message}`)
      return null
    }
    return tokenMetadata
  }

  public async getPrepareBuyParams(data: GetPrepareBuyParams) {
    return await serviceRequest.post<GetPrepareSwapResponse>(
      '/get-prepare-buy-params',
      data
    )
  }

  public async getPrepareSellParams(data: GetPrepareSellParams) {
    return await serviceRequest.post<GetPrepareSwapResponse>(
      '/get-prepare-sell-params',
      data
    )
  }

  public buildTransaction(
    data: GetPrepareSwapResponse,
    isBuy: boolean = false
  ) {
    const transaction = {
      ...data,
      data: data.data as `0x${string}`,
      account: this.walletClient,
      chain: mainnet,
      gas: BigInt(data.gas),
      maxFeePerGas: BigInt(data.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(data.maxPriorityFeePerGas),
    }
    if (isBuy) {
      return {
        ...transaction,
        value: BigInt(data.value!),
      }
    }
    return transaction
  }

  public async swap(
    isBuy: boolean,
    tokenAddress: Address,
    amountIn: string,
    slippage?: number,
    deadline?: number
  ) {
    try {
      const fn = isBuy ? this.getPrepareBuyParams : this.getPrepareSellParams
      const [swapParamsErr, swapParams] = await fn({
        from: this.walletClient.account?.address!,
        to: this.walletClient.account?.address!,
        tokenAddress,
        amountIn,
        slippage,
        deadline,
      })
      if (swapParamsErr)
        throw new Error(
          `Get Prepare Swap Params Error: ${swapParamsErr.message}`
        )

      const transaction = this.buildTransaction(swapParams, isBuy)
      const rawTransaction = await this.walletClient.signTransaction(
        transaction
      )
      const [broadcastErr, hash] = await broadcastTransaction(rawTransaction)

      if (broadcastErr)
        throw new Error(`Broadcast Error: ${broadcastErr.message}`)

      const receipt = await this.client.waitForTransactionReceipt({
        hash,
      })

      if (receipt.status === 'reverted')
        throw new Error(`Swap Failed; Hash: ${hash}`)
      return hash
    } catch (error) {
      logger.error((error as Error).message)
      return null
    }
  }
}
