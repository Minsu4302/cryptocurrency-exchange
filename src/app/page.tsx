'use client';

import React from 'react';
import './globals.css';
import 'remixicon/fonts/remixicon.css';

export default function HomePage() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <section className="home">
        <div className="home-content">
          <h1>글로벌 가상자산</h1>
          <h2>대표 파트너, BitCoin</h2>
          <p>투명한 가상자산 플랫폼을 약속합니다.</p>
          <a href="/exchange?coin=bitcoin" className="btn">거래소 바로가기</a>
        </div>
        <div className="home-content-right">
          <i className="ri-btc-line"></i>
        </div>
      </section>
    </>
  );
}
