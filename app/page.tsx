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

  async function getTokenPrice(tokenAddress: string) {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      )
  
      const data = await res.json()
  
      const pair = data.pairs?.[0]
  
      return {
        priceUsd: Number(pair?.priceUsd || 0),
        liquidityUsd: Number(pair?.liquidity?.usd || 0),
      }
    } catch (e) {
      console.error('Price error', e)
      return { priceUsd: 0, liquidityUsd: 0 }
    }
  }

  async function getLpValue(lpAddress: string, signer: any) {
    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function decimals() view returns (uint8)',
    ]
  
    const lp = new ethers.Contract(lpAddress, erc20Abi, signer)
  
    const totalSupply = await lp.totalSupply()
    const lpBalance = await lp.balanceOf(lpAddress)
  
    return {
      totalSupply,
      lpBalance,
    }
  }

  async function loadData(activeSigner: any) {
    try {
      const address = await activeSigner.getAddress()
  
      const staking = new ethers.Contract(
        STAKING_CONTRACT,
        stakingAbi,
        activeSigner
      )
  
      const lpAddress = await staking.lpToken()

      const stETHAddress =
        '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'

      const wplsAddress =
        '0xA1077a294dDE1B09bB078844df40758a5D0f9a27'

      const erc20Abi = [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ]
  
      const steth = new ethers.Contract(stETHAddress, erc20Abi, activeSigner)
      const wpls = new ethers.Contract(wplsAddress, erc20Abi, activeSigner)
  
      // ─────────────────────────────
      // Rewards
      // ─────────────────────────────
      const earnedA = await staking.earnedA(address)
      const earnedB = await staking.earnedB(address)
  
      // ─────────────────────────────
      // Staked LP balance
      // ─────────────────────────────
      const staked = await staking.balanceOf(address)
  
      // ─────────────────────────────
      // LP composition (REAL VALUE)
      // ─────────────────────────────
      const lp = new ethers.Contract(lpAddress, erc20Abi, activeSigner)

      const lpBalanceInPool = await wpls.balanceOf(lpAddress)
      const totalLpSupply = await lp.totalSupply()

      // proportional ownership of pool
      const userShare = staked * BigInt(1e18) / totalLpSupply

      const wplsInPool = await wpls.balanceOf(lpAddress)
      const stethInPool = await steth.balanceOf(lpAddress)
  
      const userWpls = (wplsInPool * userShare) / BigInt(1e18)
      const userSteth = (stethInPool * userShare) / BigInt(1e18)
  
      // ─────────────────────────────
      // Prices from Dexscreener
      // ─────────────────────────────
      const wplsPrice = await getTokenPrice(wplsAddress)
      const stethPrice = await getTokenPrice(stETHAddress)

      // ─────────────────────────────
      // USD values
      // ─────────────────────────────
      const stethUsd =
        Number(ethers.formatUnits(earnedA, 18)) *
        stethPrice.priceUsd

      const lpUsd =
        (Number(ethers.formatUnits(userWpls, 18)) *
          wplsPrice.priceUsd) +
        (Number(ethers.formatUnits(userSteth, 18)) *
          stethPrice.priceUsd)

      // ─────────────────────────────
      // Set UI values
      // ─────────────────────────────
      setEarnedA(ethers.formatUnits(earnedA, 18))
      setEarnedB(ethers.formatUnits(earnedB, 18))

      setStakedBalance(ethers.formatUnits(staked, 18))

      // OPTIONAL: if you want USD display
      setRewardsUsd({
        steth: stethUsd.toFixed(2),
        lp: lpUsd.toFixed(2),
      })
  
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