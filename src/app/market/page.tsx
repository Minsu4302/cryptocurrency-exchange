// src/app/market/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Tooltip,
    Legend,
} from 'chart.js';
import Image from 'next/image';
import {
    CoinTrending,
    NFTTrending,
    Asset,
    Exchange,
    Category,
    Company,
} from '../../types/types'; // ← 프로젝트 구조에 맞게 경로 확인

ChartJS.register(LineElement, LinearScale, CategoryScale, PointElement, Tooltip, Legend);

type TabType = 'tab1' | 'tab2' | 'tab3' | 'tab4';

// ---------- 숫자/서식 유틸 ----------
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const fmtPct = (v: unknown, digits = 2) => (isNumber(v) ? `${v.toFixed(digits)}%` : 'N/A');
const fmtUSD = (v: unknown) => (isNumber(v) ? `$${v.toLocaleString()}` : 'N/A');
const fmtBTC = (v: unknown) => (isNumber(v) ? `${v.toLocaleString()} BTC` : 'N/A');
const fmtInt = (v: unknown) => (isNumber(v) ? v.toLocaleString() : 'N/A');

const MarketPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('tab1');
    const [tabDataLoaded, setTabDataLoaded] = useState<Record<TabType, boolean>>({
        tab1: false,
        tab2: false,
        tab3: false,
        tab4: false,
    });

    const [coins, setCoins] = useState<{ item: CoinTrending }[]>([]);
    const [nfts, setNfts] = useState<NFTTrending[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTrending();
        handleTabChange('tab1');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchTrending = async () => {
        try {
            const res = await fetch('/api/dashboard/trending');
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();
            setCoins((data.coins || []).slice(0, 5));
            setNfts((data.nfts || []).slice(0, 5));
        } catch {
            // 콘솔만 남김(UX 영향 X)
            // eslint-disable-next-line no-console
            console.error('트렌딩 로드 실패');
        }
    };

    const handleTabChange = async (tab: TabType) => {
        setActiveTab(tab);
        if (!tabDataLoaded[tab]) {
            setLoading(true);
            try {
                if (tab === 'tab1') {
                    const res = await fetch(
                        '/api/dashboard/assets?vs=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true'
                    );
                    if (!res.ok) throw new Error('Network error');
                    setAssets(await res.json());
                } else if (tab === 'tab2') {
                    const res = await fetch('/api/dashboard/exchanges');
                    if (!res.ok) throw new Error('Network error');
                    setExchanges(await res.json());
                } else if (tab === 'tab3') {
                    const res = await fetch('/api/dashboard/categories');
                    if (!res.ok) throw new Error('Network error');
                    setCategories(await res.json());
                } else if (tab === 'tab4') {
                    const res = await fetch('/api/dashboard/holders?asset=bitcoin');
                    if (!res.ok) throw new Error('Network error');
                    const data = await res.json();
                    setCompanies(data.companies || []);
                }
                setTabDataLoaded((prev) => ({ ...prev, [tab]: true }));
            } catch {
                setError('API 호출 실패');
            } finally {
                setLoading(false);
            }
        }
    };

    const renderSparkline = (data?: number[], color?: string) => {
        if (!Array.isArray(data) || data.length < 2) {
            return <span>-</span>;
        }

        const chartData = {
            labels: data.map((_, i) => i),
            datasets: [
                {
                    data,
                    borderColor: color || 'rgba(0,0,0,0.5)',
                    fill: false,
                    pointRadius: 0,
                    borderWidth: 1,
                },
            ],
        };

        return (
            <Line
                data={chartData}
                options={{
                    responsive: false,
                    scales: { x: { display: false }, y: { display: false } },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                }}
                width={100}
                height={50}
            />
        );
    };

    return (
        <div>
            <div className="trending">
                <div className="coins-wrapper">
                    <div className="header">
                        <h3>Trending Coins</h3>
                    </div>
                    <div className="container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Coin</th>
                                    <th>Price</th>
                                    <th>Market Cap</th>
                                    <th>Volume</th>
                                    <th>24h%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coins.map((c) => {
                                    const usdChange = c.item.data?.price_change_percentage_24h?.usd;
                                    const usdChangeIsNum = isNumber(usdChange);
                                    return (
                                        <tr
                                            key={c.item.id}
                                            onClick={() => (window.location.href = `/coin/${c.item.id}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <Image
                                                    src={c.item.thumb}
                                                    alt={c.item.name}
                                                    width={20}
                                                    height={20}
                                                />{' '}
                                                {c.item.name} ({c.item.symbol.toUpperCase()})
                                            </td>
                                            <td>{parseFloat(c.item.price_btc).toFixed(6)} BTC</td>
                                            <td>{fmtUSD(c.item.data?.market_cap)}</td>
                                            <td>{fmtUSD(c.item.data?.total_volume)}</td>
                                            <td className={usdChangeIsNum ? (usdChange! >= 0 ? 'green' : 'red') : ''}>
                                                {fmtPct(usdChange)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="nfts-wrapper">
                    <div className="header">
                        <h3>Trending NFTs</h3>
                    </div>
                    <div className="container">
                        <table>
                            <thead>
                                <tr>
                                    <th>NFT</th>
                                    <th>Floor Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nfts.map((n) => (
                                    <tr key={n.id}>
                                        <td>
                                            <img src={n.thumb} alt={n.name} width={20} height={20} /> {n.name}
                                        </td>
                                        <td>{n.data?.floor_price ?? 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="tab-container">
                <div className="tabs">
                    <button
                        className={`tab-button ${activeTab === 'tab1' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tab1')}
                    >
                        Assets
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'tab2' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tab2')}
                    >
                        Exchanges
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'tab3' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tab3')}
                    >
                        Categories
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'tab4' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tab4')}
                    >
                        Holders
                    </button>
                </div>

                {loading && <div className="spinner">Loading...</div>}
                {error && <div className="error-message">{error}</div>}

                {!loading && activeTab === 'tab1' && (
                    <div className="tab-content">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Coin</th>
                                    <th>Price (USD)</th>
                                    <th>24h %</th>
                                    <th>7D Chart</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset) => {
                                    const pct24h = asset.price_change_percentage_24h as unknown;
                                    const pctIsNum = isNumber(pct24h);
                                    const spark = asset.sparkline_in_7d?.price;
                                    const sparkColor =
                                        Array.isArray(spark) && spark.length > 1
                                            ? spark[0] <= spark[spark.length - 1]
                                                ? 'green'
                                                : 'red'
                                            : undefined;
                                    return (
                                        <tr key={asset.id}>
                                            <td>{fmtInt(asset.market_cap_rank)}</td>
                                            <td>
                                                <img src={asset.image} alt={asset.name} />{' '}
                                                <span
                                                    onClick={() => (window.location.href = `/coin/${asset.id}`)}
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    title="코인 상세(거래소)로 이동"
                                                >
                                                    {asset.name}
                                                </span>
                                            </td>
                                            <td>{fmtUSD(asset.current_price)}</td>
                                            <td className={pctIsNum ? ((pct24h as number) >= 0 ? 'green' : 'red') : ''}>
                                                {fmtPct(pct24h)}
                                            </td>
                                            <td>{renderSparkline(spark, sparkColor)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && activeTab === 'tab2' && (
                    <div className="tab-content">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Exchange</th>
                                    <th>TRUST Score(USD)</th>
                                    <th>24h Trade</th>
                                    <th>24h Trade (Normal)</th>
                                    <th>Country</th>
                                    <th>Website</th>
                                    <th>Year</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exchanges.slice(0, 20).map((ex) => (
                                    <tr key={ex.id}>
                                        <td>{fmtInt(ex.trust_score_rank)}</td>
                                        <td>
                                            <img src={ex.image} alt={ex.name} /> {ex.name}
                                        </td>
                                        <td>{fmtInt(ex.trust_score)}</td>
                                        <td>{fmtBTC(ex.trade_volume_24h_btc)}</td>
                                        <td>{fmtBTC(ex.trade_volume_24h_btc_normalized)}</td>
                                        <td>{ex.country || 'N/A'}</td>
                                        <td>{ex.url}</td>
                                        <td>{ex.year_established || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && activeTab === 'tab3' && (
                    <div className="tab-content">
                        <table>
                            <thead>
                                <tr>
                                    <th>Top Coins</th>
                                    <th>Category</th>
                                    <th>Market Cap (USD)</th>
                                    <th>24h Market Cap %</th>
                                    <th>24h volume (USD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.slice(0, 20).map((cat) => (
                                    <tr key={cat.id}>
                                        <td>
                                            {cat.top_3_coins.map((coin: string, i: number) => (
                                                <img key={i} src={coin} alt="coin" />
                                            ))}
                                        </td>
                                        <td>{cat.name}</td>
                                        <td>{fmtUSD(cat.market_cap)}</td>
                                        <td
                                            className={
                                                isNumber(cat.market_cap_change_24h)
                                                    ? cat.market_cap_change_24h! >= 0
                                                        ? 'green'
                                                        : 'red'
                                                    : ''
                                            }
                                        >
                                            {fmtPct(cat.market_cap_change_24h)}
                                        </td>
                                        <td>{fmtUSD(cat.volume_24h)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && activeTab === 'tab4' && (
                    <div className="tab-content">
                        <table>
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Total BTC</th>
                                    <th>Entry Value (USD)</th>
                                    <th>Total Current Value (USD)</th>
                                    <th>Total %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((comp) => (
                                    <tr key={comp.name}>
                                        <td>{comp.name}</td>
                                        <td>{fmtInt(comp.total_holdings)}</td>
                                        <td>{fmtUSD(comp.total_entry_value_usd)}</td>
                                        <td>{fmtUSD(comp.total_current_value_usd)}</td>
                                        <td>{fmtPct(comp.percentage_of_total_supply)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketPage;
