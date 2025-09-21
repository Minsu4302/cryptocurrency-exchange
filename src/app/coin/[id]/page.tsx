// coin/[id]/page.tsx
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
    image: {
        thumb: string;
    };
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
    description: {
        en: string;
    };
}

export default function CoinPage() {
    const { id } = useParams() as { id: string };
    const [coin, setCoin] = useState<CoinData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { theme } = useTheme();

    // 매수/매도
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');

    // 주문유형: 시장가 / 지정가
    const [priceType, setPriceType] = useState<'market' | 'limit'>('limit');

    // 사용자 잔액 (KRW)
    const [userBalance, setUserBalance] = useState<number>(0);

    // 주문 수량
    const [qty, setQty] = useState<string>("");

    // 가격 입력 상태
    const [priceInput, setPriceInput] = useState<number>(0);

    useEffect(() => {
        fetch(`/api/coins/${id}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => setCoin(data as CoinData))
            .catch(() => setError('네트워크가 불안정합니다. 잠시 후 다시 시도해 주세요.'));
    }, [id]);

    // 로컬스토리지에서 사용자 잔액 로드
    useEffect(() => {
        try {
            const raw = localStorage.getItem("AUTH");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const b = Number(parsed?.balance ?? 0);
            if (!Number.isNaN(b)) {
                setUserBalance(b);
            }
        } catch {}
    }, []);

    const priceKRW = useMemo(() => coin?.market_data.current_price.krw ?? 0, [coin]);

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

        addScript('ticker-widget', {
            symbol,
            width: '100%',
            isTransparent: true,
            colorTheme: themeConfig.theme,
            locale: 'en'
        }, 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js');

        addScript('mini-chart-widget', {
            symbols: [[`${symbol}|1D`]],
            chartOnly: false,
            width: '100%',
            height: '100%',
            locale: 'en',
            colorTheme: themeConfig.theme,
            backgroundColor: themeConfig.backgroundColor,
            gridLineColor: themeConfig.gridColor,
            autosize: true,
            showVolume: false,
            chartType: 'area',
            lineWidth: 2,
            fontSize: '10'
        }, 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js');
    }, [coin, theme]);

    if (error) return <div className="error-message">{error}</div>;
    if (!coin) return <div>Loading...</div>;

    const selectedBtnStyle = {
        background: 'var(--background-color-secondary)',
        color: 'var(--color-white)'
    } as const;

    const formatPrice = (value: number) =>
        Number.isFinite(value) ? `${value.toLocaleString()} 원` : '';

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        let num = Number(raw);
        if (Number.isNaN(num)) num = 0;
        setPriceInput(num);
    };

    const stepPriceUp = () => setPriceInput(prev => prev + 1000);
    const stepPriceDown = () => setPriceInput(prev => prev - 1000);

    const qtyNum = (() => {
        const n = Number(qty);
        return Number.isFinite(n) ? n : 0;
    })();

    const totalKRW = priceInput * qtyNum;

    const handleSelectPriceType = (type: 'market' | 'limit') => {
        setPriceType(type);
        if (type === 'market') setQty("");
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
                                <button
                                    className="buy"
                                    type="button"
                                    onClick={() => setOrderType('buy')}
                                    style={orderType === 'buy' ? selectedBtnStyle : undefined}
                                >
                                    매수
                                </button>
                                <button
                                    className="sell"
                                    type="button"
                                    onClick={() => setOrderType('sell')}
                                    style={orderType === 'sell' ? selectedBtnStyle : undefined}
                                >
                                    매도
                                </button>
                            </div>

                            <div className="item">
                                <p className="str">주문유형</p>
                                <button
                                    className="orderType"
                                    type="button"
                                    onClick={() => handleSelectPriceType('limit')}
                                    style={priceType === 'limit' ? selectedBtnStyle : undefined}
                                >
                                    지정가
                                </button>
                                <button
                                    className="orderType"
                                    type="button"
                                    onClick={() => handleSelectPriceType('market')}
                                    style={priceType === 'market' ? selectedBtnStyle : undefined}
                                >
                                    시장가
                                </button>
                            </div>

                            <div className="item">
                                <p className="str">주문가능</p>
                                <p className="num">{userBalance.toLocaleString()} 원</p>
                            </div>

                            <div className="item">
                                <p className="str">{orderType === 'buy' ? '매수가격' : '매도가격'}</p>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                                    <input
                                        type="text"
                                        className="orderPrice"
                                        inputMode="numeric"
                                        placeholder={`${priceKRW.toLocaleString()} 원`}
                                        value={formatPrice(priceInput)}
                                        onChange={handlePriceChange}
                                        style={{ textAlign: 'right', flex: 1 }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={stepPriceUp}
                                            style={{
                                                padding: '1px 5px',
                                                borderRadius: 8,
                                                border: '1px solid var(--background-color-secondary)',
                                                background: 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            onClick={stepPriceDown}
                                            style={{
                                                padding: '1px 5px',
                                                borderRadius: 8,
                                                border: '1px solid var(--background-color-secondary)',
                                                background: 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {priceType === 'limit' && (
                                <>
                                    <div className="item">
                                        <p className="str">주문수량</p>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            className="orderNum"
                                            placeholder="0"
                                            value={qty}
                                            onChange={(e) => setQty(e.target.value)}
                                            style={{ textAlign: 'right' }}
                                        />
                                    </div>
                                    <div className="item">
                                        <p className="str">주문총액</p>
                                        <p className="num">
                                            {Number.isFinite(totalKRW) ? Math.ceil(totalKRW).toLocaleString() : '—'} 원
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <button className="order_btn">주문하기</button>
                    </div>
                </div>
            </div>

            <div className="coin-desc">
                <h3>About Asset</h3>
                <p
                    dangerouslySetInnerHTML={{
                        __html: sanitize(coin.description.en) || '<p>No description available</p>'
                    }}
                />
            </div>
        </main>
    );
}
