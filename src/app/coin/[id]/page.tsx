'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import 'remixicon/fonts/remixicon.css';
import '../../globals.css'
import { useTheme } from '../../../context/ThemeContext';

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

    // 주문 유형 상태(초기값: 매수)
    const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');

    useEffect(() => {
        fetch(`https://api.coingecko.com/api/v3/coins/${id}`)
            .then(res => res.json())
            .then((data) => setCoin(data as CoinData))
            .catch(() => setError('API limit reached. Please try again later.'));
    }, [id]);

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

    // 선택된 버튼에만 nav 스타일과 동일한 색상(배경/글자색) 유지
    const selectedBtnStyle = {
        background: 'var(--background-color-secondary)',
        color: 'var(--color-white)'
    } as const;

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
                            <div className="item"><p className="str">Current Price</p><p className="num">{coin.market_data.current_price.krw.toLocaleString()} 원</p></div>
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
                                <button className="orderType">시장가</button>
                                <button className="orderType">지정가</button>
                            </div>

                            <div className="item">
                                <p className="str">주문가능</p>
                                <p className="num">—</p>
                            </div>

                            <div className="item">
                                <p className="str">{orderType === 'buy' ? '매수가격' : '매도가격'}</p>
                                <p className="num">{coin.market_data.current_price.krw.toLocaleString()} 원</p>
                            </div>

                            <div className="item">
                                <p className="str">주문수량</p>
                                <p className="num">—</p>
                            </div>

                            <div className="item">
                                <p className="str">주문총액</p>
                                <p className="num">—</p>
                            </div>
                        </div>
                        <button className="order_btn">주문하기</button>
                    </div>
                </div>
            </div>

            <div className="coin-desc">
                <h3>About Asset</h3>
                <p
                    dangerouslySetInnerHTML={{
                        __html: coin.description.en || '<p>No description available</p>'
                    }}
                />
            </div>
        </main>
    );
}
