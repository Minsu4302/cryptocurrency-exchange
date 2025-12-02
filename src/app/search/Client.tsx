'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Coin = { id: string; name: string; symbol: string; market_cap_rank: number; thumb: string }
type Exchange = { name: string; market_type: string; thumb: string }
type NFT = { name: string; symbol: string; thumb: string }

export default function Client({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = useState<string>(initialQuery)
  const [coins, setCoins] = useState<Coin[]>([])
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fetchedQueryRef = useRef<string>('')

  const filterResults = useCallback((data: any) => {
    const filteredCoins = (data.coins || []).filter((coin: Coin) => coin.thumb !== 'missing_thumb.png')
    const filteredExchanges = (data.exchanges || []).filter((ex: Exchange) => ex.thumb !== 'missing_thumb.png')
    const filteredNfts = (data.nfts || []).filter((nf: NFT) => nf.thumb !== 'missing_thumb.png')
    return { filteredCoins, filteredExchanges, filteredNfts }
  }, [])

  const fetchData = useCallback(async (searchQuery: string) => {
    if (!searchQuery || fetchedQueryRef.current === searchQuery) return;
    fetchedQueryRef.current = searchQuery;

    // 이전 요청 취소
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setLoading(true);
      setError(false);

      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`, {
        // 강력한 브라우저 캐싱 - 같은 검색어 재검색 시 즉시 응답
        cache: 'force-cache',
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const { filteredCoins, filteredExchanges, filteredNfts } = filterResults(data);
      setCoins(filteredCoins);
      setExchanges(filteredExchanges);
      setNfts(filteredNfts);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [filterResults]);

  useEffect(() => {
    if (!query) {
      setCoins([]);
      setExchanges([]);
      setNfts([]);
      fetchedQueryRef.current = '';
      return;
    }

    fetchData(query);

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, fetchData])

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
          {loading ? (
            <div className="spinner" />
          ) : coins.length ? (
            createTable(['Rank', 'Coin'], CoinsRows)
          ) : error ? (
            <div className="error-message">API 요청 실패. 잠시 후 다시 시도해주세요.</div>
          ) : query ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              &quot;{query}&quot;에 대한 코인 결과가 없습니다.
            </p>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>검색어를 입력하세요.</p>
          )}
        </div>
        <div className="item">
          <h4>Exchange Results</h4>
          {loading ? (
            <div className="spinner" />
          ) : exchanges.length ? (
            createTable(['Exchange', 'Market'], ExchangesRows)
          ) : error ? (
            <div className="error-message">API 요청 실패. 잠시 후 다시 시도해주세요.</div>
          ) : query ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              &quot;{query}&quot;에 대한 거래소 결과가 없습니다.
            </p>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>검색어를 입력하세요.</p>
          )}
        </div>
        <div className="item">
          <h4>NFT Results</h4>
          {loading ? (
            <div className="spinner" />
          ) : nfts.length ? (
            createTable(['NFT', 'Symbol'], NFTRows)
          ) : error ? (
            <div className="error-message">API 요청 실패. 잠시 후 다시 시도해주세요.</div>
          ) : query ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              &quot;{query}&quot;에 대한 NFT 결과가 없습니다.
            </p>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>검색어를 입력하세요.</p>
          )}
        </div>
      </div>
      <button onClick={() => window.scrollTo(0, 0)} id="scrollTop">
        <i className="ri-arrow-up-s-line"></i>
      </button>
    </div>
  )
}
