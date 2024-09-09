// [timestamp, open, high, low, close, volume]
export type OHLCV = [number, number, number, number, number, number]

export type TokenInfo = {
  name: string
  symbol: string
  decimals: number
  address: string
  chainId: number
  pair: string
}

export type Position = {
  entryTime: number
  entryPrice: number
  entryVolume: string
}

export type DexToolsResponse<T> = {
  statusCode: number
  data: T
}

export type CandlesResponse = DexToolsResponse<{
  next: {
    ts: number
    res: string
  }
  interval: {
    from: number
    to: number
  }
  first: number
  last: number
  total: number
  res: string
  span: string
  candles: Array<{
    _id: number
    ts: number
    firstBlock: number
    firstIndex: number
    firstTimestamp: number
    lastBlock: number
    lastIndex: number
    lastTimestamp: number
    sellsNumber: number
    sellsVolume: number
    buysNumber: number
    buysVolume: number
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}>
