'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Coin = {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
};

type Exchange = {
    name: string;
    market_type: string;
    thumb: string;
};

type NFT = {
    name: string;
    symbol: string;
    thumb: string;
};

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState<string | null>(null);
    const [coins, setCoins] = useState<Coin[]>([]);
    const [exchanges, setExchanges] = useState<Exchange[]>([]);
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState({ coins: false, exchanges: false, nfts: false });
    const [errors, setErrors] = useState({ coins: false, exchanges: false, nfts: false });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('query');
        setQuery(searchQuery);

        if (searchQuery) {
        fetchSearchResult(searchQuery);
        } else {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.innerHTML =
            '<p style="color: red; text-align: center; margin-bottom: 8px">Nothing To Show...</p>';
        }
        const heading = document.getElementById('searchHeading');
        if (heading) heading.innerText = 'Please search something...';
        }
    }, []);

    const fetchSearchResult = (param: string) => {
        setLoading({ coins: true, exchanges: true, nfts: true });
        setErrors({ coins: false, exchanges: false, nfts: false });
        setCoins([]);
        setExchanges([]);
        setNfts([]);

        const url = `https://api.coingecko.com/api/v3/search?query=${param}`;

        fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error('Network error');
            return res.json();
        })
        .then((data) => {
            let filteredCoins = (data.coins || []).filter((coin: Coin) => coin.thumb !== 'missing_thumb.png');
            let filteredExchanges = (data.exchanges || []).filter((ex: Exchange) => ex.thumb !== 'missing_thumb.png');
            let filteredNfts = (data.nfts || []).filter((nf: NFT) => nf.thumb !== 'missing_thumb.png');

            const minCount = Math.min(filteredCoins.length, filteredExchanges.length, filteredNfts.length);
            if (filteredCoins.length > 0 && filteredExchanges.length > 0 && filteredNfts.length > 0) {
            filteredCoins = filteredCoins.slice(0, minCount);
            filteredExchanges = filteredExchanges.slice(0, minCount);
            filteredNfts = filteredNfts.slice(0, minCount);
            }

            setCoins(filteredCoins);
            setExchanges(filteredExchanges);
            setNfts(filteredNfts);
            setLoading({ coins: false, exchanges: false, nfts: false });
        })
        .catch(() => {
            setErrors({ coins: true, exchanges: true, nfts: true });
            setLoading({ coins: false, exchanges: false, nfts: false });
        });
    };

    const createTable = (headers: string[], rows: React.JSX.Element[]) => (
        <table>
        <thead>
            <tr>
            {headers.map((header, idx) => (
                <th key={idx}>{header}</th>
            ))}
            </tr>
        </thead>
        <tbody>{rows}</tbody>
        </table>
    );

    return (
        <div className="main">
        <h3 id="searchHeading">Search results for &quot;{query}&quot;</h3>

        <div className="search-container">
            <div className="item">
            <h4>Asset Results</h4>
            {loading.coins ? (
                <div className="spinner" />
            ) : coins.length ? (
                createTable(
                ['Rank', 'Coin'],
                coins.map((coin, idx) => (
                    <tr key={idx} onClick={() => router.push(`/coin/${coin.id}`)} style={{ cursor: 'pointer' }}>
                    <td>{coin.market_cap_rank}</td>
                    <td className="name-column">
                        <Image src={coin.thumb} alt={coin.name} width={20} height={20} /> {coin.name}{' '}
                        <span>({coin.symbol.toUpperCase()})</span>
                    </td>
                    </tr>
                ))
                )
            ) : errors.coins ? (
                <div className="error-message">API limit reached. Please try again later.</div>
            ) : (
                <p style={{ color: 'red', textAlign: 'center' }}>No results found for coins.</p>
            )}
            </div>

            <div className="item">
            <h4>Exchange Results</h4>
            {loading.exchanges ? (
                <div className="spinner" />
            ) : exchanges.length ? (
                createTable(
                ['Exchange', 'Market'],
                exchanges.map((ex, idx) => (
                    <tr key={idx}>
                    <td className="name-column">
                        <Image src={ex.thumb} alt={ex.name} width={20} height={20} /> {ex.name}
                    </td>
                    <td>{ex.market_type}</td>
                    </tr>
                ))
                )
            ) : errors.exchanges ? (
                <div className="error-message">API limit reached. Please try again later.</div>
            ) : (
                <p style={{ color: 'red', textAlign: 'center' }}>No results found for exchanges.</p>
            )}
            </div>

            <div className="item">
            <h4>NFT Results</h4>
            {loading.nfts ? (
                <div className="spinner" />
            ) : nfts.length ? (
                createTable(
                ['NFT', 'Symbol'],
                nfts.map((nf, idx) => (
                    <tr key={idx}>
                    <td className="name-column">
                        <Image src={nf.thumb} alt={nf.name} width={20} height={20} /> {nf.name}
                    </td>
                    <td className="name-column">{nf.symbol}</td>
                    </tr>
                ))
                )
            ) : errors.nfts ? (
                <div className="error-message">API limit reached. Please try again later.</div>
            ) : (
                <p style={{ color: 'red', textAlign: 'center' }}>No results found for nfts.</p>
            )}
            </div>
        </div>

        <button onClick={() => window.scrollTo(0, 0)} id="scrollTop">
            <i className="ri-arrow-up-s-line"></i>
        </button>
        </div>
    );
}
