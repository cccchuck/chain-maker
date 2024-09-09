import { OHLCV, Position, TokenInfo } from '@/types'

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

  isEntry: (ohlcv: OHLCV[], tokenInfo: TokenInfo) => Promise<boolean>
  isExit: (
    ohlcv: OHLCV[],
    tokenInfo: TokenInfo,
    position: Position
  ) => Promise<boolean>
}
