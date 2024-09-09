import { ERC20_ABI } from '@/abis'
import { client, walletClient } from '@/rpc'
import { Address } from 'viem'

export const getBalance = async (tokenAddress: Address, address: Address) => {
  return await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  })
}

export const getAllowance = async (
  tokenAddress: Address,
  owner: Address,
  spender: Address
) => {
  return await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

export const approve = async (
  tokenAddress: Address,
  spender: Address,
  amount: bigint
) => {
  return await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  })
}
