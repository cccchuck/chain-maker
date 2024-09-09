import { Address } from 'viem'

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
