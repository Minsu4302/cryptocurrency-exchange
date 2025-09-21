// scripts/seed-assets.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const SEED = [
    { symbol: 'btc',  name: 'Bitcoin',            coingeckoId: 'bitcoin' },
    { symbol: 'eth',  name: 'Ethereum',           coingeckoId: 'ethereum' },
    { symbol: 'usdt', name: 'Tether',             coingeckoId: 'tether' },
    { symbol: 'usdc', name: 'USD Coin',           coingeckoId: 'usd-coin' },
    { symbol: 'dai',  name: 'DAI',                coingeckoId: 'dai' },
    { symbol: 'sol',  name: 'Solana',             coingeckoId: 'solana' },
    { symbol: 'bnb',  name: 'BNB',                coingeckoId: 'binancecoin' },
    { symbol: 'xrp',  name: 'XRP',                coingeckoId: 'ripple' },
    { symbol: 'ada',  name: 'Cardano',            coingeckoId: 'cardano' },
    { symbol: 'trx',  name: 'TRON',               coingeckoId: 'tron' },
    { symbol: 'ton',  name: 'Toncoin',            coingeckoId: 'toncoin' },
    { symbol: 'dot',  name: 'Polkadot',           coingeckoId: 'polkadot' },
    { symbol: 'avax', name: 'Avalanche',          coingeckoId: 'avalanche-2' },
    { symbol: 'link', name: 'Chainlink',          coingeckoId: 'chainlink' },
    { symbol: 'matic',name: 'Polygon',            coingeckoId: 'matic-network' },
    { symbol: 'ltc',  name: 'Litecoin',           coingeckoId: 'litecoin' },
    { symbol: 'bch',  name: 'Bitcoin Cash',       coingeckoId: 'bitcoin-cash' },
    { symbol: 'etc',  name: 'Ethereum Classic',   coingeckoId: 'ethereum-classic' },
    { symbol: 'xlm',  name: 'Stellar',            coingeckoId: 'stellar' },
    { symbol: 'atom', name: 'Cosmos',             coingeckoId: 'cosmos' },
    { symbol: 'near', name: 'NEAR Protocol',      coingeckoId: 'near' },
    { symbol: 'icp',  name: 'Internet Computer',  coingeckoId: 'internet-computer' },
    { symbol: 'arb',  name: 'Arbitrum',           coingeckoId: 'arbitrum' },
    { symbol: 'op',   name: 'Optimism',           coingeckoId: 'optimism' },
    { symbol: 'apt',  name: 'Aptos',              coingeckoId: 'aptos' },
    { symbol: 'sui',  name: 'Sui',                coingeckoId: 'sui' },
    { symbol: 'pepe', name: 'Pepe',               coingeckoId: 'pepe' },
    { symbol: 'wbtc', name: 'Wrapped Bitcoin',    coingeckoId: 'wrapped-bitcoin' },
] as const

async function main() {
    for (const a of SEED) {
        await prisma.asset.upsert({
        where: { coingeckoId: a.coingeckoId },
        create: {
            symbol: a.symbol.toLowerCase(),
            name: a.name,
            coingeckoId: a.coingeckoId,
        },
        update: {
            symbol: a.symbol.toLowerCase(),
            name: a.name,
        },
        })
    }
    console.log(`✅ Seed 완료: ${SEED.length} assets`)
}

main()
    .catch((e) => {
        console.error('Seed 실패', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
