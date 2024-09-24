import { VapStrategy } from './vap'
import { type Strategy } from './types'

export const strategies: Strategy[] = [
  new VapStrategy({
    address: '0x812ba41e071c7b7fa4ebcfb62df5f45f6fa853ee',
  }),
  new VapStrategy({
    address: '0xCBdE0453d4E7D748077c1b0Ac2216C011DD2f406',
  }),
]
