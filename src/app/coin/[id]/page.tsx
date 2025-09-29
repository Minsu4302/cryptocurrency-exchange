// app/coin/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import 'remixicon/fonts/remixicon.css';
import '../../globals.css';
import { useTheme } from '../../../context/ThemeContext';
import { sanitize } from '../../../../lib/sanitize';

interface CoinData {
    id: string;
    name: string;
    symbol: string;
    image: { thumb: string };
    market_cap_rank: number;
    market_data: {
        market_cap: { krw: number };
        current_price: { krw: number };
        ath: { krw: number };
        atl: { krw: number };
        high_24h: { krw: number };
        low_24h: { krw: number };
        total_volume: { krw: number };
        total_supply: number | null;
        max_supply: number | null;
        circulating_supply: number | null;
    };
    description: { en: string };
}

export default function CoinPage() {
    const { id } = useParams() as { id: string };
    const [coin, setCoin] = useState<CoinData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { theme } = useTheme();

    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
    const [priceType, setPriceType] = useState<'market' | 'limit'>('limit');
    const [userBalance, setUserBalance] = useState<number>(0);
    const [qty, setQty] = useState<string>('');
    const [priceInput, setPriceInput] = useState<number>(0);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [userId, setUserId] = useState<number | null>(null);

    function persistBalance(nextBal: number) {
        const floored = Math.floor(nextBal);
        setUserBalance(floored);
        try {
            const raw = localStorage.getItem('AUTH');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            parsed.balance = floored;
            localStorage.setItem('AUTH', JSON.stringify(parsed));
        } catch {}
    }

    function newIdemKey(uid: number) {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
        return `${uid}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }

    useEffect(() => {
        fetch(`/api/coins/${id}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => setCoin(data as CoinData))
            .catch(() => setError('네트워크가 불안정합니다. 잠시 후 다시 시도해 주세요.'));
    }, [id]);

    useEffect(() => {
        function toNum(v: unknown): number | null {
            if (v == null) return null;
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string' && v.trim() !== '') {
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
            }
            return null;
        }

        async function boot() {
            try {
                const candidateKeys = ['AUTH', 'auth', 'USER', 'user', 'SESSION', 'session'];
                let raw: string | null = null;
                for (const k of candidateKeys) {
                    const v = localStorage.getItem(k);
                    if (v) { raw = v; break; }
                }
                if (!raw) return;

                const parsed = JSON.parse(raw);
                const balCandidates: unknown[] = [parsed?.balance, parsed?.wallet?.krw, parsed?.funds?.krw, parsed?.user?.balance];
                let bal: number = 0;
                for (const c of balCandidates) {
                    const n = toNum(c);
                    if (n != null) { bal = n; break; }
                }
                setUserBalance(Math.floor(bal));

                const directUidCandidates: unknown[] = [parsed?.userId, parsed?.id, parsed?.uid, parsed?.sub, parsed?.user?.id, parsed?.user?.userId];
                let uid: number | null = null;
                for (const c of directUidCandidates) {
                    uid = toNum(c);
                    if (uid != null) break;
                }
                if (uid != null) { setUserId(uid); return; }

                const email: string | undefined = parsed?.email ?? parsed?.user?.email ?? parsed?.account?.email;
                if (email && typeof email === 'string') {
                    const r = await fetch(`/api/users/resolve-by-email?email=${encodeURIComponent(email)}`);
                    if (r.ok) {
                        const j = await r.json();
                        if (j?.userId && Number.isFinite(Number(j.userId))) setUserId(Number(j.userId));
                    }
                }
            } catch {}
        }
        boot();
    }, []);

    const priceKRWRaw = useMemo(() => coin?.market_data.current_price.krw ?? 0, [coin]);
    const priceKRW = Math.floor(priceKRWRaw);

    useEffect(() => {
        if (priceKRW > 0) setPriceInput(priceKRW);
    }, [priceKRW]);

    useEffect(() => {
        if (!coin) return;

        const isDark = theme !== 'light-theme';
        const root = getComputedStyle(document.documentElement);
        const themeConfig = {
            theme: isDark ? 'dark' : 'light',
            backgroundColor: root.getPropertyValue(isDark ? '--chart-dark-bg' : '--chart-light-bg').trim(),
            gridColor: root.getPropertyValue(isDark ? '--chart-dark-border' : '--chart-light-border').trim()
        };

        const exchange = ['BTC', 'ETH', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'AVAX'].includes(coin.symbol.toUpperCase()) ? 'UPBIT' : 'BITHUMB';
        const symbol = `${exchange}:${coin.symbol.toUpperCase()}KRW`;

        const addScript = (id: string, config: Record<string, unknown>, src: string) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = '';
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.innerHTML = JSON.stringify(config);
            container.appendChild(script);
        };

        addScript('ticker-widget', { symbol, width: '100%', isTransparent: true, colorTheme: themeConfig.theme, locale: 'en' },
            'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js');

        addScript('mini-chart-widget', {
            symbols: [[`${symbol}|1D`]], chartOnly: false, width: '100%', height: '100%', locale: 'en',
            colorTheme: themeConfig.theme, backgroundColor: themeConfig.backgroundColor, gridLineColor: themeConfig.gridColor,
            autosize: true, showVolume: false, chartType: 'area', lineWidth: 2, fontSize: '10'
        }, 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js');
    }, [coin, theme]);

    if (error) return <div className="error-message">{error}</div>;
    if (!coin) return <div>Loading...</div>;

    const selectedBtnStyle = { background: 'var(--background-color-secondary)', color: 'var(--color-white)' } as const;

    const formatPrice = (value: number) => Number.isFinite(value) ? `${Math.floor(value).toLocaleString()} 원` : '';

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        let num = Number(raw);
        if (Number.isNaN(num)) num = 0;
        setPriceInput(Math.floor(num));
    };

    // 수량 증감 스텝 (기본 0.001)
    const QTY_STEP = 0.001;

    const qtyNum = (() => {
        const n = Number(qty);
        return Number.isFinite(n) ? n : 0;
    })();

    const stepPriceUp = () => setPriceInput(prev => Math.max(0, Math.floor(prev + 1000)));
    const stepPriceDown = () => setPriceInput(prev => Math.max(0, Math.floor(prev - 1000)));

    const stepQtyUp = () => {
        const next = +(qtyNum + QTY_STEP).toFixed(6);
        setQty(String(next));
    };
    const stepQtyDown = () => {
        const next = Math.max(0, +(qtyNum - QTY_STEP).toFixed(6));
        setQty(String(next));
    };

    const totalKRW = Math.floor(priceInput * qtyNum);

    const handleSelectPriceType = (type: 'market' | 'limit') => {
        setPriceType(type);
        if (type === 'market') setQty('');
    };

    const handleSubmitOrder = async () => {
        if (submitting) return;
        if (!coin) { alert('코인 정보가 로드되지 않았습니다. 잠시 후 다시 시도하세요.'); return; }
        if (userId == null) { alert('로그인 세션을 확인하지 못했습니다. 새로고침 후 다시 시도하세요.'); return; }

        const side = orderType === 'buy' ? 'BUY' : 'SELL';
        const orderKind = priceType === 'market' ? 'MARKET' : 'LIMIT';

        if (orderKind === 'LIMIT') {
            if (priceInput <= 0) { alert('가격을 올바르게 입력하세요.'); return; }
            if (!qty || Number(qty) <= 0) { alert('수량을 올바르게 입력하세요.'); return; }
        } else {
            if (!qty || Number(qty) <= 0) { alert('시장가 주문 수량을 입력하세요.'); return; }
        }

        const nowIso = new Date().toISOString();
        const idemKey = newIdemKey(userId!);

        const payload = {
            userId,
            symbol: coin.symbol.toUpperCase(),
            side,
            orderType: orderKind,
            quantity: String(Number(qty)),
            price: String(orderKind === 'MARKET' ? Math.floor(priceKRW) : Math.floor(priceInput)),
            fee: '0',
            feeCurrency: 'KRW',
            priceSource: 'coingecko',
            ...(orderKind === 'MARKET' ? { priceAsOf: nowIso } : {}),
            idempotencyKey: idemKey
        };

        try {
            setSubmitting(true);
            const res = await fetch('/api/trades/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(`주문 실패: ${data?.error ?? 'unknown'}`);
                return;
            }

            const data = await res.json();
            const nextBalanceFromServer = Number(data?.nextBalance);
            if (Number.isFinite(nextBalanceFromServer)) {
                persistBalance(Math.max(0, Math.floor(nextBalanceFromServer)));
            }

            alert('주문이 체결되었습니다.');
        } catch {
            alert('요청 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="main">
            <div className="coin-container">
                <div className="left-section">
                    <div className="ticker">
                        <div className="tradingview-widget-container" id="ticker-widget" />
                    </div>
                    <h3>Statistics</h3>
                    <div className="coin-info">
                        <div className="logo">
                            <Image src={coin.image.thumb} alt={coin.name} width={32} height={32} />
                            <h4>{coin.name} <span>({coin.symbol.toUpperCase()})</span></h4>
                            <p>#{coin.market_cap_rank}</p>
                        </div>
                        <div className="status">
                            <div className="item"><p className="str">Market Cap</p><p className="num">{coin.market_data.market_cap.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">Current Price</p><p className="num">{priceKRW.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">All Time High</p><p className="num">{coin.market_data.ath.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">All Time Low</p><p className="num">{coin.market_data.atl.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">Total Volume</p><p className="num">{coin.market_data.total_volume.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">Total Supply</p><p className="num">{coin.market_data.total_supply?.toLocaleString() ?? 'N/A'}</p></div>
                            <div className="item"><p className="str">Max Supply</p><p className="num">{coin.market_data.max_supply?.toLocaleString() ?? 'N/A'}</p></div>
                            <div className="item"><p className="str">Circulating Supply</p><p className="num">{coin.market_data.circulating_supply?.toLocaleString() ?? 'N/A'}</p></div>
                        </div>
                    </div>
                </div>

                <div className="main-section">
                    <div className="mini-chart">
                        <div className="tradingview-widget-container" id="mini-chart-widget" />
                    </div>
                </div>

                <div className="right-section">
                    <div className="status">
                        <h3>Historical Info</h3>
                        <div className="container">
                            <div className="item"><p className="str">ATH</p><p className="num">{coin.market_data.ath.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">ATL</p><p className="num">{coin.market_data.atl.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">24h High</p><p className="num">{coin.market_data.high_24h.krw.toLocaleString()} 원</p></div>
                            <div className="item"><p className="str">24h Low</p><p className="num">{coin.market_data.low_24h.krw.toLocaleString()} 원</p></div>
                        </div>

                        <h3>Trading</h3>
                        <div className="container">
                            <div className="item">
                                <button className="buy" type="button" onClick={() => setOrderType('buy')}
                                    style={orderType === 'buy' ? selectedBtnStyle : undefined}>매수</button>
                                <button className="sell" type="button" onClick={() => setOrderType('sell')}
                                    style={orderType === 'sell' ? selectedBtnStyle : undefined}>매도</button>
                            </div>

                            <div className="item">
                                <p className="str">주문유형</p>
                                <button className="orderType" type="button" onClick={() => handleSelectPriceType('limit')}
                                    style={priceType === 'limit' ? selectedBtnStyle : undefined}>지정가</button>
                                <button className="orderType" type="button" onClick={() => handleSelectPriceType('market')}
                                    style={priceType === 'market' ? selectedBtnStyle : undefined}>시장가</button>
                            </div>

                            <div className="item">
                                <p className="str">주문가능</p>
                                <p className="num">{Math.floor(userBalance).toLocaleString()} 원</p>
                            </div>

                            {/* 가격 입력 (▲▼ 유지) */}
                            <div className="item">
                                <p className="str">{orderType === 'buy' ? '매수가격' : '매도가격'}</p>
                                <div className="trade-input">
                                    <input
                                        type="text"
                                        className="orderPrice"
                                        inputMode="numeric"
                                        placeholder={`${priceKRW.toLocaleString()} 원`}
                                        value={formatPrice(priceInput)}
                                        onChange={handlePriceChange}
                                    />
                                    <div className="side-actions">
                                        <button type="button" onClick={stepPriceUp}>▲</button>
                                        <button type="button" onClick={stepPriceDown}>▼</button>
                                    </div>
                                </div>
                            </div>

                            {/* 수량 입력: 가격 입력과 동일 스타일 + side buttons */}
                            <div className="item">
                                <p className="str">주문수량</p>
                                <div className="trade-input">
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        className="orderNum"
                                        placeholder="0"
                                        value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                    />
                                    <div className="side-actions">
                                        <button type="button" onClick={stepQtyUp}>▲</button>
                                        <button type="button" onClick={stepQtyDown}>▼</button>
                                    </div>
                                </div>
                            </div>

                            {priceType === 'limit' && (
                                <div className="item">
                                    <p className="str">주문총액</p>
                                    <p className="num">{Number.isFinite(totalKRW) ? totalKRW.toLocaleString() : '—'} 원</p>
                                </div>
                            )}
                        </div>

                        <button className="order_btn" onClick={handleSubmitOrder} disabled={submitting}>
                            {submitting ? '전송중...' : '주문하기'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="coin-desc">
                <h3>About Asset</h3>
                <p dangerouslySetInnerHTML={{ __html: sanitize(coin.description.en) || '<p>No description available</p>' }} />
            </div>

            {/* Trading input 전용 스타일 - nav 검색창 스타일 차용 + number 스핀 제거 */}
            <style jsx>{`
                .trade-input{
                    display: flex;
                    align-items: center;
                    background: var(--background-color-secondary);
                    padding: 0 10px;
                    border-radius: 12px;
                    width: 120%;
                    border: 1px solid var(--border-color, #D4D4D4);
                    gap: 8px;
                }
                @media (max-width: 520px){ .trade-input{ width: 100%; } }

                .trade-input input{
                    padding: 5px;
                    background: var(--background-color-secondary);
                    color: var(--color-white);
                    font-size: 14px;
                    border: none;
                    outline: none;
                    width: 100%;
                    text-align: right;
                }
                .trade-input input::placeholder,
                .trade-input i{ color: var(--text-secondary); }

                /* ✅ 주문수량 number 스핀 버튼 제거 (크로스브라우저) */
                .trade-input .orderNum::-webkit-outer-spin-button,
                .trade-input .orderNum::-webkit-inner-spin-button{
                    -webkit-appearance: none;
                    margin: 0;
                }
                .trade-input .orderNum[type="number"]{
                    -moz-appearance: textfield; /* Firefox */
                }

                .trade-input .side-actions{
                    display: inline-flex;
                    gap: 6px;
                }
                .trade-input .side-actions button{
                    padding: 1px 6px;
                    border-radius: 8px;
                    border: 1px solid var(--background-color-secondary);
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                }
                .trade-input .side-actions button:hover{ filter: brightness(1.05); }
            `}</style>
        </main>
    );
}
