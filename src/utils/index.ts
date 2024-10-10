import { CurrencyAmount, Token, WETH9 } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { Address } from 'viem'
import { mainnet } from 'viem/chains'

export * from './logger'

export const sortTokens = (
  tokenA: Address,
  tokenB: Address
): [Address, Address] => {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA]
}

export const timeFrames = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const

export const getTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

export const buildTokenMetadataKey = (address: Address) =>
  `TOKEN_METADATA:${address.toUpperCase()}`

export const buildPositionKey = (address: Address, strategyName: string) =>
  `POSITION_${strategyName.toUpperCase()}:${address.toUpperCase()}`

export const getPairAddress = (address: Address, decimals: number) => {
  const token = new Token(mainnet.id, address, decimals)
  const WETH = new Token(
    mainnet.id,
    WETH9[mainnet.id].address,
    WETH9[mainnet.id].decimals
  )
  return Pair.getAddress(token, WETH)
}
