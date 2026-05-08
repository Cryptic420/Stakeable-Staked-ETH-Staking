'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

const STAKING_CONTRACT = '0x7f6be8867d75daca634910cc0224fb2120f71d0c'

const TOKEN_TO_APPROVE =
  '0x109FBF388863f3f44a81c736054d79595C063306'

const SPENDER =
  '0x7f6be8867d75daca634910cc0224fb2120f71d0c'

const MAX_UINT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935'

const stakingAbi = [
  'function claimReward() external',
  'function stake(uint256 amount) external',
  'function earnedA(address account) view returns (uint256)',
  'function earnedB(address account) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]

const erc20Abi = [
  'function approve(address spender, uint256 amount) external returns (bool)',
]

export default function Home() {
  const [wallet, setWallet] = useState('')
  const [signer, setSigner] = useState<any>(null)

  const [earnedA, setEarnedA] = useState('0')
  const [earnedB, setEarnedB] = useState('0')
  const [stakedBalance, setStakedBalance] = useState('0')

  const [stakeAmount, setStakeAmount] = useState('')

  async function connectWallet() {
    try {
      if (!(window as any).ethereum) {
        alert('MetaMask required')
        return
      }

      const provider = new ethers.BrowserProvider(
        (window as any).ethereum
      )

      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x171' }],
      })

      await provider.send('eth_requestAccounts', [])

      const signer = await provider.getSigner()

      const address = await signer.getAddress()

      setSigner(signer)
      setWallet(address)

      loadData(signer)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadData(activeSigner: any) {
    try {
      const address = await activeSigner.getAddress()

      const contract = new ethers.Contract(
        STAKING_CONTRACT,
        stakingAbi,
        activeSigner
      )

      const earnedAResult = await contract.earnedA(address)
      const earnedBResult = await contract.earnedB(address)
      const stakedResult = await contract.balanceOf(address)

      setEarnedA(ethers.formatUnits(earnedAResult, 18))
      setEarnedB(ethers.formatUnits(earnedBResult, 18))
      setStakedBalance(ethers.formatUnits(stakedResult, 18))
    } catch (err) {
      console.error(err)
    }
  }

  async function approveToken() {
    try {
      if (!signer) return

      const token = new ethers.Contract(
        TOKEN_TO_APPROVE,
        erc20Abi,
        signer
      )

      const tx = await token.approve(SPENDER, MAX_UINT)

      await tx.wait()

      alert('Approval successful')
    } catch (err) {
      console.error(err)
      alert('Approval failed')
    }
  }

  async function stakeTokens() {
    try {
      if (!signer) return

      const contract = new ethers.Contract(
        STAKING_CONTRACT,
        stakingAbi,
        signer
      )

      const parsed = ethers.parseUnits(stakeAmount, 18)

      const tx = await contract.stake(parsed)

      await tx.wait()

      alert('Stake successful')

      loadData(signer)
    } catch (err) {
      console.error(err)
      alert('Stake failed')
    }
  }

  async function claimReward() {
    try {
      if (!signer) return

      const contract = new ethers.Contract(
        STAKING_CONTRACT,
        stakingAbi,
        signer
      )

      const tx = await contract.claimReward()

      await tx.wait()

      alert('Rewards claimed')

      loadData(signer)
    } catch (err) {
      console.error(err)
      alert('Claim failed')
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">
          PulseChain Staking Dashboard
        </h1>

        {!wallet ? (
          <button
            onClick={connectWallet}
            className="bg-purple-600 px-6 py-3 rounded-xl"
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <div className="bg-zinc-900 p-6 rounded-2xl">
              <p className="text-zinc-400">Wallet</p>
              <p>{wallet}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900 p-6 rounded-2xl">
                <p className="text-zinc-400">Claimable stETH Rewards</p>
                <p className="text-2xl font-bold">
                  {Number(earnedA).toLocaleString()}
                </p>
              </div>

              <div className="bg-zinc-900 p-6 rounded-2xl">
                <p className="text-zinc-400">Claimable stETH/WPLS LP Rewrds</p>
                <p className="text-2xl font-bold">
                  {Number(earnedB).toLocaleString()}
                </p>
              </div>

              <div className="bg-zinc-900 p-6 rounded-2xl">
                <p className="text-zinc-400">Staked</p>
                <p className="text-2xl font-bold">
                  {Number(stakedBalance).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={approveToken}
              className="bg-blue-600 px-6 py-3 rounded-xl w-full"
            >
              Approve Max
            </button>

            <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">
              <input
                type="number"
                placeholder="Stake Amount"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full bg-zinc-800 p-3 rounded-xl"
              />

              <button
                onClick={stakeTokens}
                className="bg-green-600 px-6 py-3 rounded-xl w-full"
              >
                Stake
              </button>
            </div>

            <button
              onClick={claimReward}
              className="bg-yellow-600 px-6 py-3 rounded-xl w-full"
            >
              Claim Rewards
            </button>
          </>
        )}
      </div>
    </main>
  )
}