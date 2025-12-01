'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Coin = { id: string; name: string; symbol: string; market_cap_rank: number; thumb: string }
type Exchange = { name: string; market_type: string; thumb: string }
type NFT = { name: string; symbol: string; thumb: string }

export default function Client({ initial, initialQuery }: { initial: { coins: Coin[]; exchanges: Exchange[]; nfts: NFT[] } | null; initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = useState<string>(initialQuery)
  const [coins, setCoins] = useState<Coin[]>(initial?.coins || [])
  const [exchanges, setExchanges] = useState<Exchange[]>(initial?.exchanges || [])
  const [nfts, setNfts] = useState<NFT[]>(initial?.nfts || [])
  const [loading, setLoading] = useState({ coins: false, exchanges: false, nfts: false })
  const [errors, setErrors] = useState({ coins: false, exchanges: false, nfts: false })
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const filterResults = useCallback((data: any) => {
    let filteredCoins = (data.coins || []).filter((coin: Coin) => coin.thumb !== 'missing_thumb.png')
    let filteredExchanges = (data.exchanges || []).filter((ex: Exchange) => ex.thumb !== 'missing_thumb.png')
    let filteredNfts = (data.nfts || []).filter((nf: NFT) => nf.thumb !== 'missing_thumb.png')
    const minCount = Math.min(filteredCoins.length, filteredExchanges.length, filteredNfts.length)
    if (filteredCoins.length && filteredExchanges.length && filteredNfts.length) {
      filteredCoins = filteredCoins.slice(0, minCount)
      filteredExchanges = filteredExchanges.slice(0, minCount)
      filteredNfts = filteredNfts.slice(0, minCount)
    }
    return { filteredCoins, filteredExchanges, filteredNfts }
  }, [])

  useEffect(() => {
    if (!query) return
    if (initial) return // server provided data
    
    // Debounce: 사용자가 타이핑 중이면 대기
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current?.abort()
      abortRef.current = ctrl
      ;(async () => {
        try {
          setLoading({ coins: true, exchanges: true, nfts: true })
          setErrors({ coins: false, exchanges: false, nfts: false })
          
          // 더 짧은 타임아웃과 keepalive로 성능 개선
          const timeoutId = setTimeout(() => ctrl.abort(), 3000)
          const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`, { 
            cache: 'force-cache', 
            signal: ctrl.signal,
            keepalive: true
          })
          clearTimeout(timeoutId)
          
          if (!res.ok) throw new Error('Network error')
          const data = await res.json()
          const { filteredCoins, filteredExchanges, filteredNfts } = filterResults(data)
          setCoins(filteredCoins)
          setExchanges(filteredExchanges)
          setNfts(filteredNfts)
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setErrors({ coins: true, exchanges: true, nfts: true })
          }
        } finally {
          setLoading({ coins: false, exchanges: false, nfts: false })
        }
      })()
    }, 300) // 300ms debounce
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [query, initial, filterResults])

  const CoinsRows = useMemo(() => coins.map((coin, idx) => (
    <tr key={idx} onClick={() => router.push(`/coin/${coin.id}`)} style={{ cursor: 'pointer' }}>
      <td>{coin.market_cap_rank}</td>
      <td className="name-column">
        <Image src={coin.thumb} alt={coin.name} width={20} height={20} /> {coin.name} <span>({coin.symbol.toUpperCase()})</span>
      </td>
    </tr>
  )), [coins, router])

  const ExchangesRows = useMemo(() => exchanges.map((ex, idx) => (
    <tr key={idx}>
      <td className="name-column">
        <Image src={ex.thumb} alt={ex.name} width={20} height={20} /> {ex.name}
      </td>
      <td>{ex.market_type}</td>
    </tr>
  )), [exchanges])

  const NFTRows = useMemo(() => nfts.map((nf, idx) => (
    <tr key={idx}>
      <td className="name-column">
        <Image src={nf.thumb} alt={nf.name} width={20} height={20} /> {nf.name}
      </td>
      <td className="name-column">{nf.symbol}</td>
    </tr>
  )), [nfts])

  const createTable = (headers: string[], rows: React.JSX.Element[]) => (
    <table>
      <thead>
        <tr>
          {headers.map((header, idx) => (
            <th key={idx}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  )

  return (
    <div className="main">
      <h3 id="searchHeading">Search results for &quot;{query || 'Please search something...'}&quot;</h3>
      <div className="search-container">
        <div className="item">
          <h4>Asset Results</h4>
          {loading.coins ? (
            <div className="spinner" />
          ) : coins.length ? (
            createTable(['Rank', 'Coin'], CoinsRows)
          ) : errors.coins ? (
            <div className="error-message">API limit reached. Please try again later.</div>
          ) : (
            <p style={{ color: 'red', textAlign: 'center' }}>No results found for coins.</p>
          )}
        </div>
        <div className="item">
          <h4>Exchange Results</h4>
          {loading.exchanges ? (
            <div className="spinner" />
          ) : exchanges.length ? (
            createTable(['Exchange', 'Market'], ExchangesRows)
          ) : errors.exchanges ? (
            <div className="error-message">API limit reached. Please try again later.</div>
          ) : (
            <p style={{ color: 'red', textAlign: 'center' }}>No results found for exchanges.</p>
          )}
        </div>
        <div className="item">
          <h4>NFT Results</h4>
          {loading.nfts ? (
            <div className="spinner" />
          ) : nfts.length ? (
            createTable(['NFT', 'Symbol'], NFTRows)
          ) : errors.nfts ? (
            <div className="error-message">API limit reached. Please try again later.</div>
          ) : (
            <p style={{ color: 'red', textAlign: 'center' }}>No results found for nfts.</p>
          )}
        </div>
      </div>
      <button onClick={() => window.scrollTo(0, 0)} id="scrollTop">
        <i className="ri-arrow-up-s-line"></i>
      </button>
    </div>
  )
}
