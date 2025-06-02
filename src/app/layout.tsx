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

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);

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
    const localStorageKey = 'Global_Data';
    const stored = localStorage.getItem(localStorageKey);

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < 300000) {
        setGlobalData(parsed.data);
        return;
      }
    }

    fetch('https://api.coingecko.com/api/v3/global')
      .then(res => res.json())
      .then(data => {
        setGlobalData(data.data);
        localStorage.setItem(localStorageKey, JSON.stringify({ timestamp: Date.now(), data: data.data }));
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
          <p>Coins: <b>{globalData?.active_cryptocurrencies || 'N/A'}</b></p>
          <p>Exchanges: <b>{globalData?.markets || 'N/A'}</b></p>
          <p>
            Market Cap: <span>
              <b>{globalData?.total_market_cap?.krw ? `${(globalData.total_market_cap.krw / 1e12).toFixed(3)}조 원` : 'N/A'}</b>
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
          <p>24H Vol: <b>{globalData?.total_volume?.krw ? `${(globalData.total_volume.krw / 1e9).toFixed(3)}억 원` : 'N/A'}</b></p>
          <p>Dominance: <b>{`BTC ${globalData?.market_cap_percentage?.btc?.toFixed(1) || 'N/A'}% - ETH ${globalData?.market_cap_percentage?.eth?.toFixed(1) || 'N/A'}%`}</b></p>
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
            <form className="search" onSubmit={(e) => {
              e.preventDefault();
              const query = (e.currentTarget.searchInput.value).trim();
              if (query) window.location.href = `/search?query=${query}`;
            }}>
              <i className="ri-search-line"></i>
              <input type="text" name="searchInput" placeholder="Search for an asset..." required autoComplete="off" />
            </form>
            <i id="theme-toggle" className={theme === 'light-theme' ? 'ri-sun-line' : 'ri-moon-line'} onClick={toggleTheme}></i>
            <Link href="/auth/login" className="login">로그인</Link>
            <Link href="/auth/register" className="register">회원가입</Link>
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
