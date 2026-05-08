'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

// ============================================
// CONFIG
// ============================================

const STAKING_CONTRACT = '0x7f6Be8867d75DaCa634910cC0224FB2120F71d0C'

const TOKEN_TO_APPROVE = '0x109FBF388863f3f44a81c736054d79595C063306'
const SPENDER = '0x7f6be8867d75daca634910cc0224fb2120f71d0c'

const MAX_UINT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935'

// ============================================
// STAKING ABI
// ============================================

const stakingAbi = [
  'function claimReward() external',
  'function stake(uint256 amount) external',
  'function earnedA(address account) view returns (uint256)',
  'function earnedB(address account) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]

// ============================================
// ERC20 ABI
// ============================================

const erc20Abi = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address account) view returns (uint256)',
]

export default function Home() {
  const [wallet, setWallet] = useState('')
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)

  const [earnedA, setEarnedA] = useState('0')
  const [earnedB, setEarnedB] = useState('0')
  const [stakedBalance, setStakedBalance] = useState('0')

  const [stakeAmount, setStakeAmount] = useState('')
  const [loading, setLoading] = useState(false)

  // ============================================
  // CONNECT WALLET
  // ============================================

  async function connectWallet() {
    try {
      if (!(window as any).ethereum) {
        alert('MetaMask required')
        return
      }

      const browserProvider = new ethers.BrowserProvider(
        (window as any).ethereum
      )

      await browserProvider.send('eth_requestAccounts', [])

      const signer = await browserProvider.getSigner()
      const address = await signer.getAddress()

      setProvider(browserProvider)
      setSigner(signer)
      setWallet(address)
    } catch (err) {
      console.error(err)
}