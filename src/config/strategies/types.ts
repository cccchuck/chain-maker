import { OHLCV, Position, TokenMetadata } from '@/types'

export type Strategy = {
  // Strategy name
  name: string
  // Strategy token address
  address: string
  // Order size
  orderSize: number
  // Target PNL
  targetPNL: number
  // Slippage(100 = 1%)
  slippage: number
  // Max positions
  maxPositions: number
  // Max loss
  maxLoss: number

  isEntry: (
    ohlcv: OHLCV[],
    tokenMetadata: TokenMetadata,
    positions: Position[]
  ) => Promise<boolean>
  isExit: (
    ohlcv: OHLCV[],
    tokenMetadata: TokenMetadata,
    positions: Position[]
  ) => Promise<Position[]>
}
