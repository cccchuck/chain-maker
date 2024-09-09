import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

if (!process.env.MAINNET_RPC_HTTP || !process.env.PRIVATE_KEY) {
  throw new Error('MAINNET_RPC_HTTP or PRIVATE_KEY is not set')
}

export const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_HTTP as `https://${string}`),
})

export const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_HTTP as `https://${string}`),
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
})
