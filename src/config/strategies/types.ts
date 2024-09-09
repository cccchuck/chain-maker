import { OHLCV, Position, TokenInfo } from '@/types'

export type Strategy = {
  name: string
  address: string

  isEntry: (ohlcv: OHLCV[], tokenInfo: TokenInfo) => Promise<boolean>
  isExit: (
    ohlcv: OHLCV[],
    tokenInfo: TokenInfo,
    position: Position
  ) => Promise<boolean>
}
