'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import 'remixicon/fonts/remixicon.css';
import Link from 'next/link';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

interface GlobalData {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: { [key: string]: number };
    total_volume: { [key: string]: number };
    market_cap_percentage: { btc: number; eth: number };
    market_cap_change_percentage_24h_usd: number;
}

type UserInfo = { email: string; balance: number };
type MeResponse = { user: { id: number; email: string; createdAt: string; balance: number } };

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { theme, toggleTheme } = useTheme();
    const [isOverlayOpen, setOverlayOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [globalData, setGlobalData] = useState<GlobalData | null>(null);

    const [user, setUser] = useState<UserInfo | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        document.body.id = theme;
    }, [theme]);

    useEffect(() => {
        const onScroll = () => {
            setShowScrollTop(window.scrollY > 20);
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const loadUser = async () => {
            try {
                // 1) 캐시된 AUTH 먼저 로드 (초기 표시 빠르게)
                const cached = localStorage.getItem('AUTH');
                if (cached) {
                    const parsed = JSON.parse(cached) as UserInfo;
                    if (parsed?.email) {
                        setUser(parsed);
                    }
                }

                // 2) 토큰으로 서버에서 최신 정보 조회
                const authCandidates = [
                    localStorage.getItem('AUTH'),
                    localStorage.getItem('auth'),
                    localStorage.getItem('SESSION'),
                    localStorage.getItem('session'),
                    localStorage.getItem('USER'),
                    localStorage.getItem('user'),
                ]
                let token: string | null = null
                for (const raw of authCandidates) {
                    if (!raw) continue
                    try {
                        const p = JSON.parse(raw)
                        const possible = [p?.token, p?.accessToken, p?.access_token, p?.idToken, p?.id_token]
                        const found = possible.find((t) => typeof t === 'string' && String(t).length > 0)
                        if (found) { token = String(found); break }
                    } catch {}
                }

                if (!token) {
                    setLoadingUser(false);
                    return;
                }

                const res = await fetch('/api/me', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                });

                if (res.ok) {
                    const data = (await res.json()) as any;
                    const userData = data?.data?.user ?? data?.user
                    if (userData?.email) {
                        const nextUser: UserInfo = {
                            email: userData.email,
                            balance: Number(userData.balance ?? 0),
                        };
                        setUser(nextUser);
                        localStorage.setItem('AUTH', JSON.stringify({ ...nextUser, token }));
                    } else {
                        setUser(null);
                        localStorage.removeItem('AUTH');
                    }
                } else {
                    setUser(null);
                    localStorage.removeItem('AUTH');
                }
            } catch {
                setUser(null);
                localStorage.removeItem('AUTH');
            } finally {
                setLoadingUser(false);
            }
        };
        loadUser();

        // Balance 업데이트 이벤트 리스너
        const handleBalanceUpdate = (event: any) => {
            const newBalance = event.detail?.balance
            if (typeof newBalance === 'number') {
                setUser(prev => prev ? { ...prev, balance: newBalance } : null)
                // localStorage도 업데이트
                try {
                    const cached = localStorage.getItem('AUTH')
                    if (cached) {
                        const parsed = JSON.parse(cached)
                        localStorage.setItem('AUTH', JSON.stringify({ ...parsed, balance: newBalance }))
                    }
                } catch {}
            }
        }
        window.addEventListener('balanceUpdate', handleBalanceUpdate)
        return () => window.removeEventListener('balanceUpdate', handleBalanceUpdate)
    }, []);

    // ✅ 로그아웃
    const logout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch {}
        localStorage.removeItem('AUTH');
        localStorage.removeItem('token');
        localStorage.removeItem('TOKEN');
        setUser(null);
        window.location.href = '/';
    };

    // ✅ 글로벌 데이터: 외부 API 직접 호출 → 내부 라우트(`/api/coins/global`) 사용
    useEffect(() => {
        const localStorageKey = 'Global_Data';
        const stored = localStorage.getItem(localStorageKey);

        if (stored) {
            const parsed = JSON.parse(stored);
            if (Date.now() - parsed.timestamp < 300000) {
                setGlobalData(parsed.data as GlobalData);
                return;
            }
        }

        fetch('/api/coins/global', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                // CoinGecko /global 응답은 { data: {...} } 형태
                const payload: GlobalData | null = data?.data ?? null;
                setGlobalData(payload);
                if (payload) {
                    localStorage.setItem(
                        localStorageKey,
                        JSON.stringify({ timestamp: Date.now(), data: payload })
                    );
                }
            })
            .catch(() => setGlobalData(null));
    }, []);

    return (
        <>
            <div className={`overlay ${isOverlayOpen ? 'show' : ''}`} onClick={(e) => e.target === e.currentTarget && setOverlayOpen(false)}>
                <button id="closeMenu" onClick={() => setOverlayOpen(false)}>
                    <i className="ri-close-circle-line"></i>
                </button>
                <div className="nav-links">
                    <Link href="/" className="active">홈페이지</Link>
                    <Link href="/coin/bitcoin">거래소</Link>
                    <Link href="/market">시장동향</Link>
                    <Link href="/history">거래내역</Link>
                    <Link href="/asset">입출금</Link>
                    <Link href="/support">고객지원</Link>
                </div>
                <Link href="#"><i className="ri-youtube-line"></i></Link>
                <Link href="#"><i className="ri-telegram-line"></i></Link>
                <Link href="#"><i className="ri-github-line"></i></Link>
                <Link href="#"><i className="ri-discord-line"></i></Link>
                <div className="social-icons"></div>
            </div>

            <div className="main">
                <div className="global">
                    <p>Coins: <b>{globalData?.active_cryptocurrencies ?? 'N/A'}</b></p>
                    <p>Exchanges: <b>{globalData?.markets ?? 'N/A'}</b></p>
                    <p>
                        Market Cap: <span>
                            <b>
                                {globalData?.total_market_cap?.krw
                                    ? `${(globalData.total_market_cap.krw / 1e12).toFixed(3)}조 원`
                                    : 'N/A'}
                            </b>
                            <span id="marketCapChange">
                                {typeof globalData?.market_cap_change_percentage_24h_usd === 'number'
                                    ? `${globalData.market_cap_change_percentage_24h_usd.toFixed(1)}%`
                                    : 'N/A'}
                                {typeof globalData?.market_cap_change_percentage_24h_usd === 'number' && (
                                    <i className={`ri-arrow-${globalData.market_cap_change_percentage_24h_usd < 0 ? 'down' : 'up'}-s-fill`}></i>
                                )}
                            </span>
                        </span>
                    </p>
                    <p>
                        24H Vol:{' '}
                        <b>
                            {globalData?.total_volume?.krw
                                ? `${(globalData.total_volume.krw / 1e9).toFixed(3)}억 원`
                                : 'N/A'}
                        </b>
                    </p>
                    <p>
                        Dominance:{' '}
                        <b>
                            {`BTC ${globalData?.market_cap_percentage?.btc?.toFixed(1) ?? 'N/A'}% - ETH ${globalData?.market_cap_percentage?.eth?.toFixed(1) ?? 'N/A'}%`}
                        </b>
                    </p>
                </div>

                <nav>
                    <div className="left-section">
                        <button id="openMenu" onClick={() => setOverlayOpen(true)}>
                            <i className="ri-menu-line"></i>
                        </button>
                        <Link href="/" className="logo"><i className="ri-funds-line"></i> Crypto</Link>
                        <div className="nav-links">
                            <Link href="/coin/bitcoin">거래소</Link>
                            <Link href="/market">시장동향</Link>
                            <Link href="/history">거래내역</Link>
                            <Link href="/asset">입출금</Link>
                            <Link href="/support">고객지원</Link>
                        </div>
                    </div>
                    <div className="right-section">
                        <form
                            className="search"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget as HTMLFormElement);
                                const query = String(fd.get('searchInput') || '').trim();
                                if (query) window.location.href = `/search?query=${encodeURIComponent(query)}`;
                            }}
                        >
                            <i className="ri-search-line"></i>
                            <input type="text" name="searchInput" placeholder="Search for an asset..." required autoComplete="off" />
                        </form>

                        <i
                            id="theme-toggle"
                            className={theme === 'light-theme' ? 'ri-sun-line' : 'ri-moon-line'}
                            onClick={toggleTheme}
                            role="button"
                            aria-label="테마 전환"
                            tabIndex={0}
                        ></i>

                        {/* ✅ 로그인 상태 표시/미표시 분기 */}
                        {!loadingUser && user ? (
                            <div className="account">
                                <span className="email">
                                    {user.email?.split("@")[0]}님
                                </span>
                                <button className="logout" onClick={logout}>로그아웃</button>
                                <br />
                                <span className="balance">
                                    보유 금액:{' '}
                                    {/* ✅ 소수점 “내림(버림)” + 정수 포맷 */}
                                    <b>
                                        {
                                            new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })
                                                .format(Math.floor(Number(user.balance ?? 0)))
                                        }원
                                    </b>
                                </span>
                            </div>
                        ) : (
                            <>
                                <Link href="/login" className="login">로그인</Link>
                                <Link href="/register" className="register">회원가입</Link>
                            </>
                        )}
                    </div>
                </nav>

                {children}
            </div>

            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTop">
                    <i className="ri-arrow-up-s-line"></i>
                </button>
            )}

            <footer>
                <p>가상자산의 가치 변동으로 인한 손실 발생 가능성 등을 유념하시어 무리한 투자는 지양 하십시오.</p>
                <div className="social-icons">
                    <Link href="#"><i className="ri-youtube-line"></i></Link>
                    <Link href="#"><i className="ri-telegram-line"></i></Link>
                    <Link href="#"><i className="ri-github-line"></i></Link>
                    <Link href="#"><i className="ri-discord-line"></i></Link>
                </div>
            </footer>
            <button onClick={scrollToTop} id="scrollTop">
                <i className="ri-arrow-up-s-line"></i>
            </button>
        </>
    );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <html lang="ko">
                <body>
                    <LayoutContent>{children}</LayoutContent>
                </body>
            </html>
        </ThemeProvider>
    );
}
