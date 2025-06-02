// src/types/index.ts

export type Coin = {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    image: string;
    current_price: number;
    market_cap: number;
    total_volume: number;
};

export type NFT = {
    id: string;
    name: string;
    symbol: string;
    floor_price: number;
    market_cap: number;
};

// Asset (시장 자산)
export interface Asset {
    id: string;
    name: string;
    image: string;
    market_cap_rank: number;
    current_price: number;
    price_change_percentage_24h: number;
    sparkline_in_7d: {
        price: number[];
    };
}

// Exchange (거래소)
export interface Exchange {
    id: string;
    name: string;
    image: string;
    trust_score: number;
    trust_score_rank: number;
    trade_volume_24h_btc: number;
    trade_volume_24h_btc_normalized: number;
    country: string;
    url: string;
    year_established: number;
}

// Category (카테고리별 정보)
export interface Category {
    id: string;
    name: string;
    top_3_coins: string[];
    market_cap: number;
    market_cap_change_24h: number;
    volume_24h: number;
}

// Company (BTC 보유 기업)
export interface Company {
    name: string;
    total_holdings: number;
    total_entry_value_usd: number;
    total_current_value_usd: number;
    percentage_of_total_supply: number;
}

// Trending Coin 타입
export interface TrendingCoin {
    item: {
        id: string;
        name: string;
        symbol: string;
        thumb: string;
        price_btc: string;
        data?: {
        market_cap?: number;
        total_volume?: number;
        price_change_percentage_24h?: {
            usd?: number;
        };
        };
    };
}

// Trending NFT 타입
export interface TrendingNFT {
    id: string;
    name: string;
    thumb: string;
    data: {
        floor_price: number;
    };
}

