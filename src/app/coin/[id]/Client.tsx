"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTheme } from '../../../context/ThemeContext'
import Image from 'next/image'
import { sanitize } from '../../../../lib/sanitize'

type CoinData = any

export default function CoinClient({ initial }: { initial: CoinData | null }) {
  const { theme } = useTheme()
  const { id } = useParams() as { id: string }
  const [coin, setCoin] = useState<CoinData | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy')
  const [priceType, setPriceType] = useState<'market' | 'limit'>('limit')
  const [userBalance, setUserBalance] = useState<number>(0)
  const [qty, setQty] = useState<string>('')
  const [priceInput, setPriceInput] = useState<number>(0)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    if (coin) return
    let aborted = false
    const ctrl = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/coins/${id}`, { cache: 'force-cache', signal: ctrl.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!aborted) setCoin(data)
      } catch (e) {
        if (!aborted) setError('데이터를 불러오지 못했습니다.')
      } finally {
        if (!aborted) setLoading(false)
      }
    })()
    return () => {
      aborted = true
      ctrl.abort()
    }
  }, [coin, id])
  const priceKRW = useMemo(() => Math.floor(coin?.market_data?.current_price?.krw ?? 0), [coin])

  useEffect(() => { if (priceKRW > 0) setPriceInput(priceKRW) }, [priceKRW])

  useEffect(() => {
    if (!coin) return
    const isDark = theme !== 'light-theme'
    const root = getComputedStyle(document.documentElement)
    const themeConfig = {
      theme: isDark ? 'dark' : 'light',
      backgroundColor: root.getPropertyValue(isDark ? '--chart-dark-bg' : '--chart-light-bg').trim(),
      gridColor: root.getPropertyValue(isDark ? '--chart-dark-border' : '--chart-light-border').trim(),
    }
    const exchange = ['BTC', 'ETH', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'AVAX'].includes(String(coin.symbol).toUpperCase()) ? 'UPBIT' : 'BITHUMB'
    const symbol = `${exchange}:${String(coin.symbol).toUpperCase()}KRW`
    const addScript = (id: string, config: Record<string, unknown>, src: string) => {
      const container = document.getElementById(id)
      if (!container) return
      container.innerHTML = ''
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.innerHTML = JSON.stringify(config)
      container.appendChild(script)
    }
    addScript('ticker-widget', { symbol, width: '100%', isTransparent: true, colorTheme: themeConfig.theme, locale: 'en' }, 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js')
    addScript('mini-chart-widget', { symbols: [[`${symbol}|1D`]], chartOnly: false, width: '100%', height: '100%', locale: 'en', colorTheme: themeConfig.theme, backgroundColor: themeConfig.backgroundColor, gridLineColor: themeConfig.gridColor, autosize: true, showVolume: false, chartType: 'area', lineWidth: 2, fontSize: '10' }, 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js')
  }, [coin, theme])

  useEffect(() => {
    function toNum(v: unknown): number | null {
      if (v == null) return null
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '') { const n = Number(v); return Number.isFinite(n) ? n : null }
      return null
    }
    async function boot() {
      try {
        const keys = ['AUTH', 'auth', 'USER', 'user', 'SESSION', 'session']
        let raw: string | null = null
        for (const k of keys) { const v = localStorage.getItem(k); if (v) { raw = v; break } }
        if (!raw) {
          // 로컬 저장소가 없으면 서버 세션 확인으로 폴백
          try {
            let token: string | null = null
            try {
              const authCandidates = [
                localStorage.getItem('AUTH'),
                localStorage.getItem('auth'),
                localStorage.getItem('SESSION'),
                localStorage.getItem('session'),
                localStorage.getItem('USER'),
                localStorage.getItem('user'),
              ]
              for (const raw of authCandidates) {
                if (!raw) continue
                try {
                  const p = JSON.parse(raw)
                  const possible = [
                    p?.token,
                    p?.accessToken,
                    p?.access_token,
                    p?.idToken,
                    p?.id_token,
                    p?.session?.token,
                    p?.data?.token,
                    p?.user?.token,
                  ]
                  const found = possible.find((t) => typeof t === 'string' && String(t).length > 0)
                  if (found) { token = String(found); break }
                } catch {}
              }
            } catch {}
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
            const meRes = await fetch('/api/me', { cache: 'no-store', headers, credentials: 'include' })
            if (meRes.ok) {
              const me = await meRes.json()
              const meId = toNum(me?.user?.id) ?? toNum(me?.id)
              if (meId != null) setUserId(meId)
              const meBal = toNum(me?.user?.balance) ?? toNum(me?.balance) ?? toNum(me?.wallet?.krw)
              if (meBal != null) setUserBalance(Math.floor(meBal))
            }
          } catch {}
          return
        }
        const parsed = JSON.parse(raw)
        const balC: unknown[] = [parsed?.balance, parsed?.wallet?.krw, parsed?.funds?.krw, parsed?.user?.balance]
        let bal = 0
        for (const c of balC) { const n = toNum(c); if (n != null) { bal = n; break } }
        setUserBalance(Math.floor(bal))
        const uidC: unknown[] = [parsed?.userId, parsed?.id, parsed?.uid, parsed?.sub, parsed?.user?.id, parsed?.user?.userId]
        let uid: number | null = null
        for (const c of uidC) { const n = toNum(c); if (n != null) { uid = n; break } }
        if (uid != null) { setUserId(uid); return }
        const email: string | undefined = parsed?.email ?? parsed?.user?.email ?? parsed?.account?.email
        if (email && typeof email === 'string') {
          const r = await fetch(`/api/users/resolve-by-email?email=${encodeURIComponent(email)}`)
          if (r.ok) { const j = await r.json(); if (j?.userId && Number.isFinite(Number(j.userId))) setUserId(Number(j.userId)) }
        }
        // 최종 폴백: /api/me로 세션 확인 및 잔고/유저ID 설정
        if (uid == null) {
          try {
            let token: string | null = null
            try {
              const authCandidates = [
                localStorage.getItem('AUTH'),
                localStorage.getItem('auth'),
                localStorage.getItem('SESSION'),
                localStorage.getItem('session'),
                localStorage.getItem('USER'),
                localStorage.getItem('user'),
              ]
              for (const raw of authCandidates) {
                if (!raw) continue
                try {
                  const p = JSON.parse(raw)
                  const possible = [
                    p?.token,
                    p?.accessToken,
                    p?.access_token,
                    p?.idToken,
                    p?.id_token,
                    p?.session?.token,
                    p?.data?.token,
                    p?.user?.token,
                  ]
                  const found = possible.find((t) => typeof t === 'string' && String(t).length > 0)
                  if (found) { token = String(found); break }
                } catch {}
              }
            } catch {}
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
            const meRes = await fetch('/api/me', { cache: 'no-store', headers, credentials: 'include' })
            if (meRes.ok) {
              const me = await meRes.json()
              const meId = toNum(me?.data?.user?.id) ?? toNum(me?.user?.id) ?? toNum(me?.id)
              if (meId != null) setUserId(meId)
              const meBal = toNum(me?.data?.user?.balance) ?? toNum(me?.user?.balance) ?? toNum(me?.balance) ?? toNum(me?.wallet?.krw)
              if (meBal != null) setUserBalance(Math.floor(meBal))
            }
          } catch {}
        }
      } catch {}
    }
    boot()
  }, [])

  const formatPrice = (value: number) => Number.isFinite(value) ? `${Math.floor(value).toLocaleString()} 원` : ''
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    let num = Number(raw); if (Number.isNaN(num)) num = 0; setPriceInput(Math.floor(num))
  }
  const QTY_STEP = 0.001
  const qtyNum = (() => { const n = Number(qty); return Number.isFinite(n) ? n : 0 })()
  const stepPriceUp = () => setPriceInput(prev => Math.max(0, Math.floor(prev + 1000)))
  const stepPriceDown = () => setPriceInput(prev => Math.max(0, Math.floor(prev - 1000)))
  const stepQtyUp = () => { const next = +(qtyNum + QTY_STEP).toFixed(6); setQty(String(next)) }
  const stepQtyDown = () => { const next = Math.max(0, +(qtyNum - QTY_STEP).toFixed(6)); setQty(String(next)) }
  const totalKRW = Math.floor(priceInput * qtyNum)
  const handleSelectPriceType = (type: 'market' | 'limit') => { setPriceType(type); if (type === 'market') setQty('') }
  function persistBalance(nextBal: number) {
    const floored = Math.floor(nextBal)
    setUserBalance(floored)
    try { const raw = localStorage.getItem('AUTH'); if (!raw) return; const parsed = JSON.parse(raw); parsed.balance = floored; localStorage.setItem('AUTH', JSON.stringify(parsed)) } catch {}
  }
  function newIdemKey(uid: number) { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return `${uid}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
  const handleSubmitOrder = async () => {
    if (submitting) return
    if (!coin) { alert('코인 정보가 로드되지 않았습니다. 잠시 후 다시 시도하세요.'); return }
    let effectiveUserId: number | null = userId
    if (effectiveUserId == null) {
      // 주문 직전에 한 번 더 세션 확인 시도
      try {
        let token: string | null = null
        try {
          const authCandidates = [
            localStorage.getItem('AUTH'),
            localStorage.getItem('auth'),
            localStorage.getItem('SESSION'),
            localStorage.getItem('session'),
            localStorage.getItem('USER'),
            localStorage.getItem('user'),
          ]
          for (const raw of authCandidates) {
            if (!raw) continue
            try {
              const p = JSON.parse(raw)
              const possible = [p?.token, p?.accessToken, p?.access_token, p?.idToken, p?.id_token, p?.session?.token, p?.data?.token, p?.user?.token]
              const found = possible.find((t) => typeof t === 'string' && String(t).length > 0)
              if (found) { token = String(found); break }
            } catch {}
          }
        } catch {}
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const meRes = await fetch('/api/me', { cache: 'no-store', headers, credentials: 'include' })
        if (meRes.ok) {
          const me = await meRes.json()
          const meId = (() => { const v = me?.data?.user?.id ?? me?.user?.id ?? me?.id; const n = Number(v); return Number.isFinite(n) ? n : null })()
          if (meId != null) { effectiveUserId = meId; setUserId(meId) }
          const meBal = (() => { const v = me?.data?.user?.balance ?? me?.user?.balance ?? me?.balance ?? me?.wallet?.krw; const n = Number(v); return Number.isFinite(n) ? n : null })()
          if (meBal != null) setUserBalance(Math.floor(meBal))
        }
      } catch {}
      if (effectiveUserId == null) { alert('로그인 세션을 확인하지 못했습니다. 새로고침 후 다시 시도하세요.'); return }
    }
    const side = orderType === 'buy' ? 'BUY' : 'SELL'; const orderKind = priceType === 'market' ? 'MARKET' : 'LIMIT'
    if (orderKind === 'LIMIT') { if (priceInput <= 0) { alert('가격을 올바르게 입력하세요.'); return } if (!qty || Number(qty) <= 0) { alert('수량을 올바르게 입력하세요.'); return } }
    else { if (!qty || Number(qty) <= 0) { alert('시장가 주문 수량을 입력하세요.'); return } }
    const idemKey = newIdemKey((effectiveUserId!) )
    const payload = { 
      userId: effectiveUserId, 
      symbol: String(coin.symbol).toUpperCase(), 
      side, 
      orderType: orderKind, 
      quantity: String(Number(qty)), 
      price: String(orderKind === 'MARKET' ? Math.floor(priceKRW) : Math.floor(priceInput)), 
      fee: '0', 
      feeCurrency: 'KRW', 
      priceSource: 'coingecko', 
      idempotencyKey: idemKey,
      ...(orderKind === 'MARKET' && { priceAsOf: new Date().toISOString() })
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/trades/create', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload), 
        credentials: 'include',
        keepalive: true
      })
      if (!res.ok) { 
        const data = await res.json().catch(() => ({}))
        setTimeout(() => alert(`주문 실패: ${data?.error ?? 'unknown'}`), 0)
        return 
      }
      const data = await res.json()
      const nextBalanceFromServer = Number(data?.data?.nextBalance ?? data?.nextBalance)
      if (Number.isFinite(nextBalanceFromServer)) {
        const newBalance = Math.max(0, Math.floor(nextBalanceFromServer))
        persistBalance(newBalance)
        // Layout에 Balance 업데이트 알림 (즉시)
        window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: { balance: newBalance } }))
      }
      // 수량 초기화
      setQty('')
      // alert를 non-blocking으로 실행
      setTimeout(() => alert('주문이 체결되었습니다.'), 0)
    } catch (e) { 
      setTimeout(() => alert('요청 중 오류가 발생했습니다.'), 0)
    } finally { 
      setSubmitting(false) 
    }
  }

  if (error) return <main className={`page ${theme}`}><div className="error-message">{error}</div></main>
  if (loading || !coin) return <main className={`page ${theme}`}><div>Loading...</div></main>

  return (
    <main className="main">
      <div className="coin-container">
        <div className="left-section">
          <div className="ticker"><div className="tradingview-widget-container" id="ticker-widget" /></div>
          <h3>Statistics</h3>
          <div className="coin-info">
            <div className="logo">
              {coin?.image?.thumb && (<Image src={coin.image.thumb} alt={coin.name} width={32} height={32} />)}
              <h4>{coin?.name} <span>({String(coin?.symbol).toUpperCase()})</span></h4>
              {coin?.market_cap_rank != null && <p>#{coin.market_cap_rank}</p>}
            </div>
            <div className="status">
              <div className="item"><p className="str">Market Cap</p><p className="num">{coin?.market_data?.market_cap?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">Current Price</p><p className="num">{priceKRW ? `${priceKRW.toLocaleString()} 원` : '—'}</p></div>
              <div className="item"><p className="str">All Time High</p><p className="num">{coin?.market_data?.ath?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">All Time Low</p><p className="num">{coin?.market_data?.atl?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">Total Volume</p><p className="num">{coin?.market_data?.total_volume?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">Total Supply</p><p className="num">{coin?.market_data?.total_supply?.toLocaleString?.() ?? 'N/A'}</p></div>
              <div className="item"><p className="str">Max Supply</p><p className="num">{coin?.market_data?.max_supply?.toLocaleString?.() ?? 'N/A'}</p></div>
              <div className="item"><p className="str">Circulating Supply</p><p className="num">{coin?.market_data?.circulating_supply?.toLocaleString?.() ?? 'N/A'}</p></div>
            </div>
          </div>
        </div>

        <div className="main-section">
          <div className="mini-chart"><div className="tradingview-widget-container" id="mini-chart-widget" /></div>
        </div>

        <div className="right-section">
          <div className="status">
            <h3>Historical Info</h3>
            <div className="container">
              <div className="item"><p className="str">ATH</p><p className="num">{coin?.market_data?.ath?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">ATL</p><p className="num">{coin?.market_data?.atl?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">24h High</p><p className="num">{coin?.market_data?.high_24h?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
              <div className="item"><p className="str">24h Low</p><p className="num">{coin?.market_data?.low_24h?.krw?.toLocaleString?.() ?? '—'} 원</p></div>
            </div>

            <h3>Trading</h3>
            <div className="container">
              <div className="item">
                <button className={`buy ${orderType === 'buy' ? 'active' : ''}`} type="button" onClick={() => setOrderType('buy')}>매수</button>
                <button className={`sell ${orderType === 'sell' ? 'active' : ''}`} type="button" onClick={() => setOrderType('sell')}>매도</button>
              </div>
              <div className="item">
                <p className="str">주문유형</p>
                <button className={`orderType ${priceType === 'limit' ? 'active' : ''}`} type="button" onClick={() => handleSelectPriceType('limit')}>지정가</button>
                <button className={`orderType ${priceType === 'market' ? 'active' : ''}`} type="button" onClick={() => handleSelectPriceType('market')}>시장가</button>
              </div>
              <div className="item">
                <p className="str">주문가능</p>
                <p className="num">{Math.floor(userBalance).toLocaleString()} 원</p>
              </div>
              <div className="item">
                <p className="str">{orderType === 'buy' ? '매수가격' : '매도가격'}</p>
                <div className="trade-input">
                  <input type="text" className="orderPrice" inputMode="numeric" placeholder={`${priceKRW.toLocaleString()} 원`} value={formatPrice(priceInput)} onChange={handlePriceChange} />
                  <div className="side-actions"><button type="button" onClick={stepPriceUp}>▲</button><button type="button" onClick={stepPriceDown}>▼</button></div>
                </div>
              </div>
              <div className="item">
                <p className="str">주문수량</p>
                <div className="trade-input">
                  <input type="number" step="any" min="0" className="orderNum" placeholder="0" value={qty} onChange={(e) => setQty(e.target.value)} />
                  <div className="side-actions"><button type="button" onClick={stepQtyUp}>▲</button><button type="button" onClick={stepQtyDown}>▼</button></div>
                </div>
              </div>
              {priceType === 'limit' && (<div className="item"><p className="str">주문총액</p><p className="num">{Number.isFinite(totalKRW) ? totalKRW.toLocaleString() : '—'} 원</p></div>)}
            </div>
            <button className={`order_btn ${submitting ? 'disabled' : ''}`} onClick={handleSubmitOrder} disabled={submitting}>{submitting ? '전송중...' : '주문하기'}</button>
          </div>
        </div>
      </div>
      <div className="coin-desc"><h3>About Asset</h3><p dangerouslySetInnerHTML={{ __html: sanitize(coin?.description?.en ?? '') || '<p>No description available</p>' }} /></div>
      {/* 스타일은 globals.css와 기존 클래스(.main, .coin-container 등)에 위임하여 색상/간격을 이전과 동일하게 유지합니다. */}
    </main>
  )
}
