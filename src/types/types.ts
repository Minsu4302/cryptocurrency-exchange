// types.ts

export interface CoinTrending {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    price_btc: string;
    data?: {
        market_cap?: number;
        total_volume?: number;
        price_change_percentage_24h?: {
        usd: number;
        };
    };
}

export interface NFTTrending {
    id: string;
    name: string;
    thumb: string;
    data?: {
        floor_price?: number;
    };
}

// 나머지 타입들 (필요한 경우)
export interface Asset {
    id: string;
    name: string;
    image: string;
    current_price: number;
    market_cap_rank: number;
    price_change_percentage_24h: number;
    sparkline_in_7d: {
        price: number[];
    };
}

export interface Exchange {
    id: string;
    name: string;
    image: string;
    trust_score_rank: number;
    trust_score: number;
    trade_volume_24h_btc: number;
    trade_volume_24h_btc_normalized: number;
    country: string | null;
    url: string;
    year_established: number | null;
}

export interface Category {
    id: string;
    name: string;
    market_cap: number;
    market_cap_change_24h: number;
    volume_24h: number;
    top_3_coins: string[];
}

export interface Company {
    name: string;
    total_holdings: number;
    total_entry_value_usd: number;
    total_current_value_usd: number;
    percentage_of_total_supply: number;
}
