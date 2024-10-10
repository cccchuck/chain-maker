import initCycleTLS, { CycleTLSClient } from 'cycletls'
import { type CandlesResponse, type OHLCV } from '@/types'
import { getTimestamp, timeFrames } from '@/utils'

let cycleTLS: CycleTLSClient | null = null

const cycleTLSOptions = {
  ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0',
  headers: {
    'x-api-version': '1',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
  },
}

export const fetchOHLCV = async (
  address: string,
  timeFrame: (typeof timeFrames)[number] = '5m'
): Promise<OHLCV[]> => {
  if (!cycleTLS) {
    cycleTLS = await initCycleTLS()
  }
  const url = `https://core-api.dextools.io/pool/candles/ether/${address}/usd/${timeFrame}/week/latest?ts=${getTimestamp()}&tz=8`
  const response = await cycleTLS.get(url, cycleTLSOptions)
  if (response.status !== 200 || (response.body as any).statusCode !== 200) {
    return []
  } else {
    const data = response.body as CandlesResponse
    const ohlcv = data.data.candles.map(
      (item: any, index: number, array: any[]) => [
        item.ts,
        index < array.length - 1 ? array[index + 1].close : item.open,
        item.high,
        item.low,
        item.close,
        item.volume,
      ]
    ) as OHLCV[]

    return ohlcv
  }
}
