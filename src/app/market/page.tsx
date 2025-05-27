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

ChartJS.register(
    LineElement,
    LinearScale,
    CategoryScale,
    PointElement,
    Tooltip,
    Legend
);

type TabType = 'tab1' | 'tab2' | 'tab3' | 'tab4';

const DashboardPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('tab1');
    const [tabDataLoaded, setTabDataLoaded] = useState<{ [key in TabType]: boolean }>({
        tab1: false,
        tab2: false,
        tab3: false,
        tab4: false,
    });

    const [coins, setCoins] = useState<any[]>([]);
    const [nfts, setNfts] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [exchanges, setExchanges] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTrending();
        handleTabChange('tab1');
    }, []);

    const fetchTrending = async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
            const data = await res.json();
            setCoins(data.coins.slice(0, 5));
            setNfts(data.nfts.slice(0, 5));
        } catch {
            console.error('트렌딩 로드 실패');
        }
    };

    const handleTabChange = async (tab: TabType) => {
        setActiveTab(tab);
        if (!tabDataLoaded[tab]) {
            setLoading(true);
            try {
                if (tab === 'tab1') {
                    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true');
                    setAssets(await res.json());
                } else if (tab === 'tab2') {
                    const res = await fetch('https://api.coingecko.com/api/v3/exchanges');
                    setExchanges(await res.json());
                } else if (tab === 'tab3') {
                    const res = await fetch('https://api.coingecko.com/api/v3/coins/categories');
                    setCategories(await res.json());
                } else if (tab === 'tab4') {
                    const res = await fetch('https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin');
                    const data = await res.json();
                    setCompanies(data.companies);
                }
                setTabDataLoaded(prev => ({ ...prev, [tab]: true }));
            } catch {
                setError('API 호출 실패');
            } finally {
                setLoading(false);
            }
        }
    };
    
    const renderSparkline = (data: number[], color: string) => {
        const chartData = {
            labels: data.map((_, i) => i),
            datasets: [
                {
                    data,
                    borderColor: color,
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
            {/* Trending Section */}
            <div className="trending">
                <div className="coins-wrapper">
                    <div className="header"><h3>Trending Coins</h3></div>
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
                                {coins.map(c => (
                                    <tr key={c.item.id} onClick={() => window.location.href = `/coin/${c.item.id}`}>
                                        <td><img src={c.item.thumb} alt={c.item.name} /> {c.item.name} ({c.item.symbol.toUpperCase()})</td>
                                        <td>{parseFloat(c.item.price_btc).toFixed(6)} BTC</td>
                                        <td>
                                        {typeof c.item.data?.market_cap === 'number'
                                            ? `$${c.item.data.market_cap.toLocaleString()}`
                                            : 'N/A'}
                                        </td>
                                        <td>
                                        {typeof c.item.data?.total_volume === 'number'
                                            ? `$${c.item.data.total_volume.toLocaleString()}`
                                            : 'N/A'}
                                        </td>
                                        <td className={
                                            c.item.data?.price_change_percentage_24h?.usd !== undefined
                                                ? c.item.data.price_change_percentage_24h.usd >= 0
                                                    ? 'green'
                                                    : 'red'
                                                : ''
                                        }>
                                            {c.item.data?.price_change_percentage_24h?.usd !== undefined
                                                ? `${c.item.data.price_change_percentage_24h.usd.toFixed(2)}%`
                                                : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="nfts-wrapper">
                    <div className="header"><h3>Trending NFTs</h3></div>
                    <div className="container">
                        <table>
                            <thead>
                            <tr>
                            <th>NFT</th>
                            <th>Market</th>
                            <th>Price</th>
                            <th>24h Vol</th>
                            <th>24h%</th>
                            </tr>
                            </thead>
                            <tbody>
                                {nfts.map(n => (
                                    <tr key={n.id}>
                                        <td><img src={n.thumb} alt={n.name} /> {n.name}</td>
                                        <td>{n.data.floor_price}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Tabs Section */}
            <div className="tab-container">
                <div className="tabs">
                    <button className={`tab-button ${activeTab === 'tab1' ? 'active' : ''}`} onClick={() => handleTabChange('tab1')}>Assets</button>
                    <button className={`tab-button ${activeTab === 'tab2' ? 'active' : ''}`} onClick={() => handleTabChange('tab2')}>Exchanges</button>
                    <button className={`tab-button ${activeTab === 'tab3' ? 'active' : ''}`} onClick={() => handleTabChange('tab3')}>Categories</button>
                    <button className={`tab-button ${activeTab === 'tab4' ? 'active' : ''}`} onClick={() => handleTabChange('tab4')}>Holders</button>
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
                            <th>Price (KRW)</th>
                            <th>24h %</th>
                            <th>7D Chart</th>
                            </tr>
                        </thead>
                            <tbody>
                                {assets.map(asset => (
                                    <tr key={asset.id}>
                                        <td>{asset.market_cap_rank}</td>
                                        <td><img src={asset.image} alt={asset.name} /> {asset.name}</td>
                                        <td>{asset.current_price.toLocaleString()}</td>
                                        <td className={asset.price_change_percentage_24h >= 0 ? 'green' : 'red'}>
                                            {asset.price_change_percentage_24h.toFixed(2)}%
                                        </td>
                                        <td>{renderSparkline(asset.sparkline_in_7d.price, asset.sparkline_in_7d.price[0] <= asset.sparkline_in_7d.price[asset.sparkline_in_7d.price.length - 1] ? 'green' : 'red')}</td>
                                    </tr>
                                ))}
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
                                {exchanges.slice(0, 20).map(ex => (
                                    <tr key={ex.id}>
                                        <td>{ex.trust_score_rank}</td>
                                        <td><img src={ex.image} alt={ex.name} /> {ex.name}</td>
                                        <td>{ex.trust_score}</td>
                                        <td>{ex.trade_volume_24h_btc.toLocaleString()} BTC</td>
                                        <td>{ex.trade_volume_24h_btc_normalized.toLocaleString()} BTC</td>
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
                            <th>Market Cap (원)</th>
                            <th>24h Market Cap (원)</th>
                            <th>24h volume (원)</th>
                            </tr>
                            </thead>
                            <tbody>
                                {categories.slice(0, 20).map(cat => (
                                    <tr key={cat.id}>
                                        <td>{cat.top_3_coins.map((coin: string, i: number) => <img key={i} src={coin} alt="coin" />)}</td>
                                        <td>{cat.name}</td>
                                        <td>{cat.market_cap?.toLocaleString()} USD</td>
                                        <td className={cat.market_cap_change_24h >= 0 ? 'green' : 'red'}>{cat.market_cap_change_24h?.toFixed(2)}%</td>
                                        <td>{cat.volume_24h?.toLocaleString()} USD</td>
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
                            <th>Entry Value (KRW)</th>
                            <th>Total Current Value (KRW)</th>
                            <th>Total %</th>
                            </tr>
                        </thead>
                            <tbody>
                                {companies.map(comp => (
                                    <tr key={comp.name}>
                                        <td>{comp.name}</td>
                                        <td>{comp.total_holdings}</td>
                                        <td>{comp.total_entry_value_usd.toLocaleString()} USD</td>
                                        <td>{comp.total_current_value_usd.toLocaleString()} USD</td>
                                        <td>{comp.percentage_of_total_supply.toFixed(2)}%</td>
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

export default DashboardPage;
