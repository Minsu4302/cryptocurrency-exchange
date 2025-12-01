// app/wallet/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

type Asset = {
    symbol: string;
    name: string;
    balance: string;
    percentage: string;
    krwValue: string;
    icon: string;
};

type Transaction = {
    id: string;
    type: "deposit" | "withdraw";
    asset: string;
    amount: string;
    status: "completed" | "pending" | "failed";
    date: string;
    time: string;
};

type PortfolioHolding = {
    symbol: string;
    name: string;
    amount: string;
};

// CoinGecko 가격 캐시 (5분)
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// CoinGecko symbol 매핑
const COINGECKO_IDS: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'USDC': 'usd-coin',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'TRX': 'tron',
    'TON': 'the-open-network',
    'LINK': 'chainlink',
    'MATIC': 'matic-network',
    'DOT': 'polkadot',
    'AVAX': 'avalanche-2',
    'SHIB': 'shiba-inu',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash'
};

export default function DepositWithdrawPage() {
    const { theme } = useTheme();
    const [bgColor, setBgColor] = useState<string>("");

    // 사용자 정보
    const [userId, setUserId] = useState<number | null>(null);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [loading, setLoading] = useState(true);
    const [coinPrices, setCoinPrices] = useState<Record<string, number>>({});

    // 검색 상태
    const [searchTerm, setSearchTerm] = useState("");
    
    // CoinGecko 가격 조회 함수 (캐싱 적용)
    const fetchCoinPrices = async (symbols: string[]) => {
        const now = Date.now();
        const symbolsToFetch: string[] = [];
        const cachedPrices: Record<string, number> = {};

        // 캐시 확인
        symbols.forEach(symbol => {
            const cached = priceCache.get(symbol);
            if (cached && now - cached.timestamp < CACHE_DURATION) {
                cachedPrices[symbol] = cached.price;
            } else {
                symbolsToFetch.push(symbol);
            }
        });

        // 새로 가져올 것이 있으면 API 호출
        if (symbolsToFetch.length > 0) {
            try {
                const ids = symbolsToFetch
                    .map(s => COINGECKO_IDS[s.toUpperCase()])
                    .filter(Boolean)
                    .join(',');
                
                if (ids) {
                    const res = await fetch(
                        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=krw`,
                        { next: { revalidate: 300 } } // 5분 캐싱
                    );
                    
                    if (res.ok) {
                        const data = await res.json();
                        
                        symbolsToFetch.forEach(symbol => {
                            const coinId = COINGECKO_IDS[symbol.toUpperCase()];
                            if (coinId && data[coinId]?.krw) {
                                const price = data[coinId].krw;
                                cachedPrices[symbol] = price;
                                priceCache.set(symbol, { price, timestamp: now });
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('CoinGecko API error:', error);
            }
        }

        return cachedPrices;
    };
    
    // Assets 변환 (가격 정보 포함)
    const assets: Asset[] = useMemo(() => {
        const result: Asset[] = [
            {
                symbol: "KRW",
                name: "원화",
                balance: userBalance.toLocaleString(),
                percentage: "0.00%",
                krwValue: `${userBalance.toLocaleString()} KRW`,
                icon: "₩"
            }
        ];

        // 코인 자산들의 총 개수 계산 (비율 계산용)
        let totalCoinAmount = 0;
        const coinAssets: (Asset & { _amount?: number })[] = [];

        holdings.forEach(h => {
            const amount = parseFloat(h.amount) || 0;
            const price = coinPrices[h.symbol.toUpperCase()] || 0;
            const krwValue = amount * price;
            totalCoinAmount += amount;

            coinAssets.push({
                symbol: h.symbol,
                name: h.name || h.symbol,
                balance: amount.toLocaleString(undefined, { 
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 8 
                }),
                percentage: "0.00%",
                krwValue: price > 0 ? `${Math.round(krwValue).toLocaleString()} KRW` : "가격 정보 없음",
                icon: h.symbol[0] || "?",
                _amount: amount
            });
        });

        // 비율 계산 (각 코인의 개수 기준)
        if (totalCoinAmount > 0) {
            coinAssets.forEach(asset => {
                const percentage = ((asset._amount || 0) / totalCoinAmount) * 100;
                asset.percentage = `${percentage.toFixed(2)}%`;
            });
        }

        result.push(...coinAssets);
        return result;
    }, [userBalance, holdings, coinPrices]);

    const filteredAssets = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return assets;
        return assets.filter(
            (a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)
        );
    }, [searchTerm, assets]);

    // 총 평가 (KRW + 코인 자산)
    const totalKRWValue = useMemo(() => {
        let total = userBalance;
        holdings.forEach(h => {
            const amount = parseFloat(h.amount) || 0;
            const price = coinPrices[h.symbol.toUpperCase()] || 0;
            total += amount * price;
        });
        return total;
    }, [userBalance, holdings, coinPrices]);

    const totalBTCValue = 0; // BTC 환산은 별도 계산 필요

    // 탭
    const [activeTab, setActiveTab] = useState<"history" | "send" | "receive">("history");

    // 전송 상태
    const [sendAsset, setSendAsset] = useState<string>("");
    const [receiverEmail, setReceiverEmail] = useState<string>("");
    const [sendAmount, setSendAmount] = useState<string>("");
    const [sendMemo, setSendMemo] = useState<string>("");
    const [sendLoading, setSendLoading] = useState(false);

    // 수신 정보 (로그인한 사용자의 이메일)
    const [userEmail, setUserEmail] = useState<string>("");

    // 거래 내역
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // 사용자 정보 가져오기
    useEffect(() => {
        async function fetchUserData() {
            try {
                // layout.tsx와 동일한 방식으로 토큰 찾기
                const authCandidates = [
                    localStorage.getItem('AUTH'),
                    localStorage.getItem('auth'),
                    localStorage.getItem('SESSION'),
                    localStorage.getItem('session'),
                    localStorage.getItem('USER'),
                    localStorage.getItem('user'),
                ];
                
                let token: string | null = null;
                for (const raw of authCandidates) {
                    if (!raw) continue;
                    try {
                        const p = JSON.parse(raw);
                        const possible = [p?.token, p?.accessToken, p?.access_token, p?.idToken, p?.id_token];
                        const found = possible.find((t) => typeof t === 'string' && String(t).length > 0);
                        if (found) { 
                            token = String(found); 
                            break;
                        }
                    } catch {}
                }
                
                console.log('Token found:', !!token);
                if (!token) {
                    // 토큰이 없으면 조용히 로딩 종료 (로그인 안 한 상태)
                    setLoading(false);
                    return;
                }

                // 사용자 정보 가져오기
                console.log('Fetching /api/me...');
                const meRes = await fetch('/api/me', {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include'
                });

                console.log('/api/me status:', meRes.status, meRes.ok);
                if (!meRes.ok) {
                    console.log('/api/me failed');
                    setLoading(false);
                    return;
                }

                const meData = await meRes.json();
                console.log('Full /api/me response:', meData);
                
                // data.user 또는 user 경로 모두 확인
                const userData = meData?.data?.user ?? meData?.user;
                const uid = userData?.id;
                const balance = userData?.balance || 0;
                const email = userData?.email || '';
                console.log('Extracted userId:', uid, 'balance:', balance, 'email:', email);

                if (!uid) {
                    console.log('No userId found');
                    setLoading(false);
                    return;
                }

                setUserId(uid);
                setUserBalance(Number(balance));
                setUserEmail(email);

                // 포트폴리오와 Transfer 내역 병렬 처리
                const [portfolioRes, transfersRes] = await Promise.all([
                    fetch(`/api/portfolio?userId=${uid}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: 'include'
                    }),
                    fetch(`/api/transfers/list?userId=${uid}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: 'include'
                    })
                ]);

                // 포트폴리오 처리
                if (portfolioRes.ok) {
                    const portfolioData = await portfolioRes.json();
                    const holdingsData = portfolioData.data?.holdings ?? portfolioData.holdings ?? [];
                    setHoldings(holdingsData);
                    
                    // 코인 가격 조회 (백그라운드에서 비동기 처리)
                    if (holdingsData.length > 0) {
                        const symbols = holdingsData.map((h: PortfolioHolding) => h.symbol.toUpperCase());
                        fetchCoinPrices(symbols).then(prices => {
                            setCoinPrices(prices);
                        }).catch(err => {
                            console.error('Failed to fetch coin prices:', err);
                        });
                    }
                }

                // Transfer 내역 처리
                if (transfersRes.ok) {
                    const transfersData = await transfersRes.json();
                    const items = transfersData.data?.items ?? transfersData.items ?? [];
                    
                    // Transfer를 Transaction 형식으로 변환
                    const formattedTransactions: Transaction[] = items.map((item: {
                        id: number;
                        type: string;
                        amount: number;
                        status: string;
                        requestedAt: string;
                        address: string | null;
                        asset: { symbol: string; name: string };
                    }) => {
                        const date = new Date(item.requestedAt);
                        const counterparty = item.address ? ` (${item.address})` : '';
                        return {
                            id: String(item.id),
                            type: item.type === 'DEPOSIT' ? 'deposit' : 'withdraw',
                            asset: `${item.type === 'DEPOSIT' ? '입금' : '출금'} ${item.asset.symbol}${counterparty}`,
                            amount: `${Number(item.amount).toLocaleString()} ${item.asset.symbol}`,
                            status: item.status === 'SUCCESS' ? 'completed' : item.status === 'PENDING' ? 'pending' : 'failed',
                            date: date.toLocaleDateString('ko-KR'),
                            time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                        };
                    });
                    
                    setTransactions(formattedTransactions);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoading(false);
            }
        }

        fetchUserData();
    }, []);

    useEffect(() => {
        const isDark = theme !== "light-theme";
        const root = getComputedStyle(document.documentElement);
        const backgroundColor = root
            .getPropertyValue(isDark ? "--chart-dark-bg" : "--chart-light-bg")
            .trim();
        setBgColor(backgroundColor || "var(--background-color)");
    }, [theme]);

    return (
        <main className="page" style={{ backgroundColor: bgColor }}>
            {loading ? (
                <div className="container">
                    <div className="center" style={{ padding: '40px' }}>
                        <div>로딩 중...</div>
                    </div>
                </div>
            ) : (
            <div className="container">
                <section className="grid">
                    {/* 왼쪽: 총 보유자산 */}
                    <div className="col">
                        <div className="card" role="region" aria-labelledby="asset-title">
                            <header className="cardHeader">
                                <h2 id="asset-title" className="cardTitle">총 보유자산 ⊙</h2>
                                <div className="assetTotal">
                                    <div className="assetKRW">{totalKRWValue.toLocaleString()} KRW</div>
                                    <div className="assetBTC" aria-label="BTC 환산">≈ {totalBTCValue} BTC</div>
                                </div>
                            </header>

                            <div className="searchWrap">
                                <input
                                    className="input searchInput"
                                    type="text"
                                    placeholder="코인명/심볼검색"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    aria-label="자산 검색"
                                />
                            </div>

                            <div className="assetHead">
                                <div>코인명</div>
                                <div className="textRight">보유수량 %</div>
                                <div className="textRight">보유수량(평가금액)</div>
                            </div>

                            <ul className="assetList" role="list">
                                {filteredAssets.map((asset) => (
                                    <li key={asset.symbol} className="assetRow">
                                        <div className="assetName">
                                            <div className="coinIcon" aria-hidden>{asset.icon}</div>
                                            <div>
                                                <div className="coinSymbol">{asset.symbol}</div>
                                                <div className="muted">{asset.name}</div>
                                            </div>
                                        </div>
                                        <div className="textRight">{asset.percentage}</div>
                                        <div className="textRight">
                                            <div className="strong">
                                                {asset.balance} {asset.symbol}
                                            </div>
                                            <div className="muted">{asset.krwValue}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 오른쪽: KRW + 탭 */}
                    <div className="col">
                        {/* KRW 카드 */}
                        <div className="card" role="region" aria-labelledby="krw-title">
                            <header className="cardHeader rowBetween">
                                <h3 id="krw-title" className="subTitle">KRW</h3>
                                <button className="iconBtn" type="button" aria-label="새로고침">↻</button>
                            </header>
                            <div className="cardBody">
                                <div className="stack">
                                    <div>
                                        <div className="muted small">총 보유</div>
                                        <div className="strong">{userBalance.toLocaleString()} KRW</div>
                                    </div>
                                    <div>
                                        <div className="muted small">거래가능 수량</div>
                                        <div>{userBalance.toLocaleString()} KRW</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 전송/수신 탭 */}
                        <div className="card" role="region" aria-labelledby="tab-title">
                            <header className="tabs" id="tab-title" role="tablist" aria-label="자산 전송">
                                <button
                                    className={`tab ${activeTab === "history" ? "active" : ""}`}
                                    role="tab"
                                    aria-selected={activeTab === "history"}
                                    onClick={() => setActiveTab("history")}
                                    type="button"
                                >
                                    내역
                                </button>
                                <button
                                    className={`tab ${activeTab === "send" ? "active" : ""}`}
                                    role="tab"
                                    aria-selected={activeTab === "send"}
                                    onClick={() => setActiveTab("send")}
                                    type="button"
                                >
                                    전송
                                </button>
                                <button
                                    className={`tab ${activeTab === "receive" ? "active" : ""}`}
                                    role="tab"
                                    aria-selected={activeTab === "receive"}
                                    onClick={() => setActiveTab("receive")}
                                    type="button"
                                >
                                    수신
                                </button>
                            </header>

                            <div className="cardBody">
                                {/* 탭: 내역 */}
                                {activeTab === "history" && (
                                    <div>
                                        <div className="rowBetween small">
                                            <select className="select" defaultValue="all" aria-label="내역 필터">
                                                <option value="all">전체</option>
                                                <option value="deposit">입금</option>
                                                <option value="withdraw">출금</option>
                                            </select>
                                        </div>

                                        {transactions.length === 0 ? (
                                            <div className="muted center small padY" style={{ padding: '40px 20px' }}>
                                                전송 내역이 없습니다.
                                            </div>
                                        ) : (
                                            <ul className="historyList" role="list">
                                                {transactions.map((tx) => (
                                                    <li key={tx.id} className="historyItem">
                                                        <div className="rowBetween">
                                                            <div className="muted small">{tx.date}</div>
                                                        </div>
                                                        <div className="rowBetween">
                                                            <div>
                                                                <div className="strong small">{tx.asset}</div>
                                                                <div className="muted xsmall">{tx.time}</div>
                                                            </div>
                                                            <div className="textRight strong">{tx.amount}</div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="muted center small padY">
                                            최근 전송 내역은 거래내역 페이지에서 확인하실 수 있습니다.
                                        </div>
                                    </div>
                                )}

                                {/* 탭: 전송 */}
                                {activeTab === "send" && (
                                    <form className="form" noValidate onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (sendLoading) return;

                                        try {
                                            setSendLoading(true);

                                            const authCandidates = [
                                                localStorage.getItem('AUTH'),
                                                localStorage.getItem('auth'),
                                            ];
                                            
                                            let token: string | null = null;
                                            for (const raw of authCandidates) {
                                                if (!raw) continue;
                                                try {
                                                    const p = JSON.parse(raw);
                                                    const possible = [p?.token, p?.accessToken];
                                                    const found = possible.find((t) => typeof t === 'string' && String(t).length > 0);
                                                    if (found) { 
                                                        token = String(found); 
                                                        break;
                                                    }
                                                } catch {}
                                            }

                                            if (!token) {
                                                alert('로그인이 필요합니다');
                                                return;
                                            }

                                            const res = await fetch('/api/transfers/send', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                credentials: 'include',
                                                body: JSON.stringify({
                                                    receiverEmail,
                                                    symbol: sendAsset,
                                                    amount: sendAmount,
                                                    memo: sendMemo || undefined
                                                })
                                            });

                                            const data = await res.json();

                                            if (res.ok) {
                                                alert(`전송 완료! ${sendAmount} ${sendAsset}을(를) ${receiverEmail}에게 전송했습니다.`);
                                                setSendAsset('');
                                                setReceiverEmail('');
                                                setSendAmount('');
                                                setSendMemo('');
                                                
                                                // 잔액과 holdings 업데이트 (새로고침 대신)
                                                if (token) {
                                                    const [meRes, portfolioRes, transfersRes] = await Promise.all([
                                                        fetch('/api/me', {
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            credentials: 'include'
                                                        }),
                                                        fetch(`/api/portfolio?userId=${userId}`, {
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            credentials: 'include'
                                                        }),
                                                        fetch(`/api/transfers/list?userId=${userId}`, {
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            credentials: 'include'
                                                        })
                                                    ]);
                                                    
                                                    if (meRes.ok) {
                                                        const meData = await meRes.json();
                                                        const userData = meData?.data?.user ?? meData?.user;
                                                        setUserBalance(Number(userData?.balance || 0));
                                                    }
                                                    
                                                    if (portfolioRes.ok) {
                                                        const portfolioData = await portfolioRes.json();
                                                        const holdingsData = portfolioData.data?.holdings ?? portfolioData.holdings ?? [];
                                                        setHoldings(holdingsData);
                                                        
                                                        // 가격 정보 유지 (캐시 사용)
                                                        if (holdingsData.length > 0) {
                                                            const symbols = holdingsData.map((h: PortfolioHolding) => h.symbol.toUpperCase());
                                                            fetchCoinPrices(symbols).then(prices => {
                                                                setCoinPrices(prices);
                                                            }).catch(err => {
                                                                console.error('Failed to refresh coin prices:', err);
                                                            });
                                                        }
                                                    }
                                                    
                                                    if (transfersRes.ok) {
                                                        const transfersData = await transfersRes.json();
                                                        const items = transfersData.data?.items ?? transfersData.items ?? [];
                                                        const formattedTransactions: Transaction[] = items.map((item: {
                                                            id: number;
                                                            type: string;
                                                            amount: number;
                                                            status: string;
                                                            requestedAt: string;
                                                            address: string | null;
                                                            asset: { symbol: string; name: string };
                                                        }) => {
                                                            const date = new Date(item.requestedAt);
                                                            const counterparty = item.address ? ` (${item.address})` : '';
                                                            return {
                                                                id: String(item.id),
                                                                type: item.type === 'DEPOSIT' ? 'deposit' : 'withdraw',
                                                                asset: `${item.type === 'DEPOSIT' ? '입금' : '출금'} ${item.asset.symbol}${counterparty}`,
                                                                amount: `${Number(item.amount).toLocaleString()} ${item.asset.symbol}`,
                                                                status: item.status === 'SUCCESS' ? 'completed' : item.status === 'PENDING' ? 'pending' : 'failed',
                                                                date: date.toLocaleDateString('ko-KR'),
                                                                time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                                                            };
                                                        });
                                                        setTransactions(formattedTransactions);
                                                    }
                                                    
                                                    // balanceUpdate 이벤트 발생 (layout 업데이트용)
                                                    window.dispatchEvent(new CustomEvent('balanceUpdate'));
                                                }
                                            } else {
                                                alert(data.message || '전송 실패');
                                            }
                                        } catch (error) {
                                            console.error('Send error:', error);
                                            alert('전송 중 오류가 발생했습니다');
                                        } finally {
                                            setSendLoading(false);
                                        }
                                    }}>
                                        <label className="label">
                                            전송할 자산 선택
                                            <select
                                                className="select"
                                                value={sendAsset}
                                                onChange={(e) => setSendAsset(e.target.value)}
                                                aria-label="전송 자산 선택"
                                                required
                                            >
                                                <option value="" disabled>
                                                    자산을 선택하세요
                                                </option>
                                                {assets.filter(a => a.symbol !== 'KRW').map((a) => (
                                                    <option key={a.symbol} value={a.symbol}>
                                                        {a.symbol} - {a.name} (잔고: {a.balance})
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="label">
                                            수신자 이메일
                                            <input
                                                className="input"
                                                type="email"
                                                value={receiverEmail}
                                                onChange={(e) => setReceiverEmail(e.target.value)}
                                                placeholder="receiver@example.com"
                                                autoComplete="off"
                                                required
                                            />
                                        </label>

                                        <label className="label">
                                            <div className="rowBetween">
                                                <span>전송 수량</span>
                                                {sendAsset && (
                                                    <span className="muted small">
                                                        사용 가능: {assets.find(a => a.symbol === sendAsset)?.balance || '0'} {sendAsset}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="row gap">
                                                <input
                                                    className="input"
                                                    type="number"
                                                    value={sendAmount}
                                                    onChange={(e) => setSendAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    step="any"
                                                    min="0"
                                                    required
                                                />
                                                <button 
                                                    className="btn" 
                                                    type="button" 
                                                    onClick={() => {
                                                        const balance = assets.find(a => a.symbol === sendAsset)?.balance || '0';
                                                        const balanceStr = typeof balance === 'string' ? balance : String(balance);
                                                        setSendAmount(balanceStr.replace(/,/g, ''));
                                                    }}
                                                    disabled={!sendAsset}
                                                >
                                                    최대
                                                </button>
                                            </div>
                                        </label>

                                        <label className="label">
                                            메모 (선택)
                                            <input
                                                className="input"
                                                type="text"
                                                value={sendMemo}
                                                onChange={(e) => setSendMemo(e.target.value)}
                                                placeholder="전송 메모"
                                                maxLength={100}
                                            />
                                        </label>

                                        <div className="note">
                                            <div className="noteRow">
                                                <strong className="small">주의사항</strong>
                                            </div>
                                            <ul className="noteList">
                                                <li>• 수신자 이메일을 정확히 입력하세요</li>
                                                <li>• 전송 후 취소할 수 없습니다</li>
                                                <li>• 전송 수수료는 없습니다</li>
                                            </ul>
                                        </div>

                                        <button
                                            className="btn primary full"
                                            type="submit"
                                            disabled={!sendAsset || !receiverEmail || !sendAmount || sendLoading}
                                        >
                                            {sendLoading ? '전송 중...' : '전송하기'}
                                        </button>
                                    </form>
                                )}

                                {/* 탭: 수신 */}
                                {activeTab === "receive" && (
                                    <div className="form">
                                        <div className="note">
                                            <div className="noteRow">
                                                <strong className="small">내 이메일 주소</strong>
                                            </div>
                                            <div className="stack">
                                                <div className="row gap">
                                                    <input
                                                        className="input"
                                                        readOnly
                                                        value={userEmail}
                                                        aria-readonly
                                                    />
                                                    <button
                                                        className="btn"
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(userEmail);
                                                            alert('이메일 주소가 복사되었습니다');
                                                        }}
                                                        aria-label="이메일 복사"
                                                    >
                                                        복사
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="note">
                                            <div className="noteRow">
                                                <strong className="small">자산 수신 방법</strong>
                                            </div>
                                            <ul className="noteList">
                                                <li>• 위의 이메일 주소를 전송자에게 알려주세요</li>
                                                <li>• 전송자가 자산을 보내면 자동으로 내 계정에 입금됩니다</li>
                                                <li>• 수신 내역은 &quot;내역&quot; 탭에서 확인할 수 있습니다</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            )}

            <style jsx>{`
                .page {
                    min-height: 90svh;
                    display: grid;
                    place-items: start center;
                    padding: 28px;
                    background-color: var(--background-color);
                }
                .container {
                    width: 100%;
                    max-width: 1200px;
                }
                .grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                @media (min-width: 1024px) {
                    .grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                .col {
                    display: grid;
                    gap: 16px;
                }
                .card {
                    width: 100%;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius, 10px);
                    color: var(--color-white);
                    padding: 22px;
                    background: var(--background-color-primary);
                }
                .cardHeader {
                    margin-bottom: 16px;
                }
                .rowBetween {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .cardTitle {
                    margin: 0 0 6px 0;
                    font-size: 20px;
                    letter-spacing: -0.01em;
                    color: var(--color-foreground, inherit);
                }
                .subTitle {
                    margin: 0;
                    font-size: 18px;
                    color: var(--color-foreground, inherit);
                }
                .assetTotal {
                    display: grid;
                    gap: 2px;
                }
                .assetKRW {
                    font-size: 22px;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    color: var(--color-foreground, inherit);
                }
                .assetBTC {
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .searchWrap {
                    position: relative;
                    margin: 12px 0 8px 0;
                }
                .searchIcon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 14px;
                    color: var(--text-secondary);
                }
                .searchInput {
                    padding-left: 36px;
                }
                .tabsText {
                    opacity: 0.9;
                }
                .check {
                    display: inline-flex;
                    gap: 8px;
                    align-items: center;
                    font-size: 13px;
                    user-select: none;
                    color: var(--color-foreground, inherit);
                }
                .check input {
                    width: 16px;
                    height: 16px;
                    accent-color: var(--color-primary, #60a5fa);
                }
                .assetHead {
                    display: grid;
                    grid-template-columns: 3fr 3fr 6fr;
                    gap: 10px;
                    font-size: 12px;
                    color: var(--text-secondary);
                    padding: 6px 0;
                    border-bottom: 1px solid var(--border-color);
                }
                .assetList {
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }
                .assetRow {
                    display: grid;
                    grid-template-columns: 3fr 3fr 6fr;
                    gap: 10px;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border-color);
                }
                .assetName {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .coinIcon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--background-color-secondary);
                    color: var(--color-foreground, #000);
                    display: grid;
                    place-items: center;
                    font-size: 12px;
                    font-weight: 700;
                    border: 1px solid var(--border-color);
                }
                .coinSymbol {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--color-foreground, inherit);
                }
                .muted {
                    color: var(--text-secondary);
                    font-size: 12px;
                }
                .xsmall {
                    font-size: 11px;
                }
                .small {
                    font-size: 13px;
                }
                .strong {
                    font-weight: 700;
                    color: var(--color-foreground, inherit);
                }
                .textRight {
                    text-align: right;
                }
                .center {
                    text-align: center;
                }
                .padY {
                    padding: 24px 0 4px 0;
                }
                .cardBody {
                    display: grid;
                    gap: 12px;
                }
                .stack {
                    display: grid;
                    gap: 12px;
                }
                .tabs {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    border-bottom: 1px solid var(--border-color);
                }
                .tab {
                    appearance: none;
                    border: none;
                    background: transparent;
                    color: var(--color-foreground, inherit);
                    padding: 12px 10px;
                    cursor: pointer;
                    font-weight: 600;
                    border-bottom: 2px solid transparent;
                }
                .tab.active {
                    border-color: var(--color-primary, #1565C0);
                    color: var(--color-primary, #1565C0);
                }
                .iconBtn {
                    appearance: none;
                    border: 1px solid var(--border-color);
                    background: var(--background-color-secondary);
                    color: var(--color-foreground, inherit);
                    border-radius: var(--radius, 10px);
                    padding: 6px 10px;
                    cursor: pointer;
                }
                .form {
                    display: grid;
                    gap: 12px;
                }
                .label {
                    margin-top: 15px;
                    display: grid;
                    gap: 8px;
                    font-size: 15px;
                    font-weight: bold;
                    color: var(--color-foreground, inherit);
                }
                .input,
                .select,
                .btn {
                    margin-top: 10px;
                    outline: none;
                    border-radius: var(--radius, 10px);
                    font-size: 14px;
                }
                .input,
                .select {
                    width: 100%;
                    border: 1px solid var(--border-color);
                    background: var(--card, var(--background-color-primary));
                    color: var(--color-white);
                    padding: 12px;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .input::placeholder {
                    color: var(--text-secondary);
                }
                .input:focus,
                .select:focus {
                    border-color: var(--color-primary, #1565C0);
                    box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary, #1565C0) 25%, transparent);
                }
                .btn {
                    border: 1px solid var(--border-color);
                    background: var(--background-color-secondary);
                    color: var(--color-foreground, inherit);
                    padding: 10px 14px;
                    cursor: pointer;
                }
                .btn.primary {
                    border: none;
                    background: linear-gradient(180deg, var(--color-primary, #1565C0), color-mix(in oklab, var(--color-primary, #1565C0) 75%, #000 0%));
                    color: var(--primary-foreground, #fff);
                    font-weight: 800;
                }
                .btn.full {
                    width: 100%;
                }
                .row {
                    display: flex;
                    align-items: center;
                }
                .gap {
                    gap: 8px;
                }
                .note {
                    border: 1px solid var(--border-color);
                    background: var(--background-color-secondary);
                    border-radius: var(--radius, 10px);
                    padding: 12px;
                }
                .noteList {
                    margin: 6px 0 0 0;
                    padding-left: 0;
                    list-style: none;
                    color: var(--text-secondary);
                    font-size: 13px;
                }
                .historyList {
                    margin: 10px 0 0 0;
                    padding: 0;
                    list-style: none;
                    display: grid;
                    gap: 8px;
                }
                .historyItem {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius, 10px);
                    padding: 12px;
                    background: var(--card, var(--background-color-primary));
                }
                /* --- Select: 기본 모양 + 커스텀 화살표 --- */
                .select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    position: relative;
                    border-radius: 12px;
                    padding-right: 42px; /* 화살표 공간 */
                    line-height: 1.25;
                    color: var(--color-white);
                    font-weight: 600;
                }

                /* --- Option: 폰트/색/선택 상태 --- */
                /* 옵션 목록의 기본 텍스트 톤 업 */
                .select option {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--color-white);
                    background: var(--background-color-primary);
                }
                /* 일부 브라우저에서만 동작: 선택된 옵션 배경 */
                .select option:checked {
                    background: color-mix(in oklab, var(--color-primary, #1565C0) 28%, var(--background-color-primary));
                    color: var(--primary-foreground, #fff);
                }
                /* 포커스된 옵션(지원 브라우저 한정) */
                .select option:focus {
                    background: color-mix(in oklab, var(--color-primary, #1565C0) 18%, var(--background-color-primary));
                }

                /* --- 드롭다운 열렸을 때의 컨테이너 느낌 (간접 효과) --- */
                /* 셀렉트가 포커스일 때 살짝 부풀어 보이게 */
                .select:focus {
                    transform: translateY(-0.5px);
                }

                /* 라벨과 셀렉트 간 여백/정렬 미세 조정 */
                .label .select {
                    margin-top: 6px;
                }
            `}</style>
        </main>
    );
}
