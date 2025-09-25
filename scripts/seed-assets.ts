// scripts/seed-assets.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const SEED = [
    { symbol: 'btc',   name: 'Bitcoin',                coingeckoId: 'bitcoin' },
    { symbol: 'eth',   name: 'Ethereum',               coingeckoId: 'ethereum' },
    { symbol: 'usdt',  name: 'Tether',                 coingeckoId: 'tether' },
    { symbol: 'usdc',  name: 'USD Coin',               coingeckoId: 'usd-coin' },
    { symbol: 'dai',   name: 'DAI',                    coingeckoId: 'dai' },
    { symbol: 'sol',   name: 'Solana',                 coingeckoId: 'solana' },
    { symbol: 'bnb',   name: 'BNB',                    coingeckoId: 'binancecoin' },
    { symbol: 'xrp',   name: 'XRP',                    coingeckoId: 'ripple' },
    { symbol: 'ada',   name: 'Cardano',                coingeckoId: 'cardano' },
    { symbol: 'trx',   name: 'TRON',                   coingeckoId: 'tron' },
    { symbol: 'ton',   name: 'Toncoin',                coingeckoId: 'toncoin' },
    { symbol: 'dot',   name: 'Polkadot',               coingeckoId: 'polkadot' },
    { symbol: 'avax',  name: 'Avalanche',              coingeckoId: 'avalanche-2' },
    { symbol: 'link',  name: 'Chainlink',              coingeckoId: 'chainlink' },
    { symbol: 'matic', name: 'Polygon',                coingeckoId: 'matic-network' },
    { symbol: 'ltc',   name: 'Litecoin',               coingeckoId: 'litecoin' },
    { symbol: 'bch',   name: 'Bitcoin Cash',           coingeckoId: 'bitcoin-cash' },
    { symbol: 'etc',   name: 'Ethereum Classic',       coingeckoId: 'ethereum-classic' },
    { symbol: 'xlm',   name: 'Stellar',                coingeckoId: 'stellar' },
    { symbol: 'atom',  name: 'Cosmos',                 coingeckoId: 'cosmos' },
    { symbol: 'near',  name: 'NEAR Protocol',          coingeckoId: 'near' },
    { symbol: 'icp',   name: 'Internet Computer',      coingeckoId: 'internet-computer' },
    { symbol: 'arb',   name: 'Arbitrum',               coingeckoId: 'arbitrum' },
    { symbol: 'op',    name: 'Optimism',               coingeckoId: 'optimism' },
    { symbol: 'apt',   name: 'Aptos',                  coingeckoId: 'aptos' },
    { symbol: 'sui',   name: 'Sui',                    coingeckoId: 'sui' },
    { symbol: 'pepe',  name: 'Pepe',                   coingeckoId: 'pepe' },
    { symbol: 'wbtc',  name: 'Wrapped Bitcoin',        coingeckoId: 'wrapped-bitcoin' },

    // 확장 추가 (대중적 상위권 자산들)
    { symbol: 'doge',  name: 'Dogecoin',               coingeckoId: 'dogecoin' },
    { symbol: 'shib',  name: 'Shiba Inu',              coingeckoId: 'shiba-inu' },
    { symbol: 'uni',   name: 'Uniswap',                coingeckoId: 'uniswap' },
    { symbol: 'mkr',   name: 'Maker',                  coingeckoId: 'maker' },
    { symbol: 'aave',  name: 'Aave',                   coingeckoId: 'aave' },
    { symbol: 'ldo',   name: 'Lido DAO',               coingeckoId: 'lido-dao' },
    { symbol: 'rndr',  name: 'Render',                 coingeckoId: 'render-token' },
    { symbol: 'inj',   name: 'Injective',              coingeckoId: 'injective-protocol' },
    { symbol: 'ftm',   name: 'Fantom',                 coingeckoId: 'fantom' },
    { symbol: 'algo',  name: 'Algorand',               coingeckoId: 'algorand' },
    { symbol: 'fil',   name: 'Filecoin',               coingeckoId: 'filecoin' },
    { symbol: 'hnt',   name: 'Helium',                 coingeckoId: 'helium' },
    { symbol: 'kas',   name: 'Kaspa',                  coingeckoId: 'kaspa' },
    { symbol: 'mina',  name: 'Mina',                   coingeckoId: 'mina-protocol' },
    { symbol: 'sand',  name: 'The Sandbox',            coingeckoId: 'the-sandbox' },
    { symbol: 'mana',  name: 'Decentraland',           coingeckoId: 'decentraland' },
    { symbol: 'axs',   name: 'Axie Infinity',          coingeckoId: 'axie-infinity' },
    { symbol: 'chz',   name: 'Chiliz',                 coingeckoId: 'chiliz' },
    { symbol: 'stx',   name: 'Stacks',                 coingeckoId: 'blockstack' }, // CoinGecko id 유지
    { symbol: 'rpl',   name: 'Rocket Pool',            coingeckoId: 'rocket-pool' },
    { symbol: 'reth',  name: 'Rocket Pool ETH',        coingeckoId: 'rocket-pool-eth' },
    { symbol: 'crv',   name: 'Curve DAO',              coingeckoId: 'curve-dao-token' },
    { symbol: 'cvx',   name: 'Convex Finance',         coingeckoId: 'convex-finance' },
    { symbol: 'comp',  name: 'Compound',               coingeckoId: 'compound-governance-token' },
    { symbol: 'cake',  name: 'PancakeSwap',            coingeckoId: 'pancakeswap-token' },
    { symbol: 'theta', name: 'Theta Network',          coingeckoId: 'theta-token' },
    { symbol: 'xtz',   name: 'Tezos',                  coingeckoId: 'tezos' },
    { symbol: 'eos',   name: 'EOS',                    coingeckoId: 'eos' },
    { symbol: 'iotx',  name: 'IoTeX',                  coingeckoId: 'iotex' },
    { symbol: 'iota',  name: 'IOTA',                   coingeckoId: 'iota' },
    { symbol: 'neo',   name: 'NEO',                    coingeckoId: 'neo' },
    { symbol: 'dash',  name: 'Dash',                   coingeckoId: 'dash' },
    { symbol: 'zec',   name: 'Zcash',                  coingeckoId: 'zcash' },
    { symbol: 'ens',   name: 'Ethereum Name Service',  coingeckoId: 'ethereum-name-service' },
    { symbol: 'sushi', name: 'Sushi',                  coingeckoId: 'sushi' },
    { symbol: 'blur',  name: 'Blur',                   coingeckoId: 'blur' },
    { symbol: 'gmx',   name: 'GMX',                    coingeckoId: 'gmx' },
    { symbol: 'rose',  name: 'Oasis Network',          coingeckoId: 'oasis-network' },
    { symbol: 'osmo',  name: 'Osmosis',                coingeckoId: 'osmosis' },
    { symbol: 'klay',  name: 'Klaytn',                 coingeckoId: 'klay-token' },
    { symbol: 'wemix', name: 'WEMIX',                  coingeckoId: 'wemix-token' },
    { symbol: 'kda',   name: 'Kadena',                 coingeckoId: 'kadena' },
    { symbol: 'one',   name: 'Harmony',                coingeckoId: 'harmony' },
    { symbol: 'ankr',  name: 'Ankr',                   coingeckoId: 'ankr' },
    { symbol: 'ocean', name: 'Ocean Protocol',         coingeckoId: 'ocean-protocol' },
    { symbol: 'bat',   name: 'Basic Attention Token',  coingeckoId: 'basic-attention-token' },
    { symbol: 'grt',   name: 'The Graph',              coingeckoId: 'the-graph' },
    { symbol: 'gala',  name: 'Gala',                   coingeckoId: 'gala' },
    { symbol: 'rune',  name: 'THORChain',              coingeckoId: 'thorchain' },
    { symbol: 'btt',   name: 'BitTorrent',             coingeckoId: 'bittorrent' },
    { symbol: 'ar',    name: 'Arweave',                coingeckoId: 'arweave' },
    { symbol: 'gmt',   name: 'STEPN',                  coingeckoId: 'stepn' },
    { symbol: 'woo',   name: 'WOO Network',            coingeckoId: 'woo-network' },
    { symbol: 'celr',  name: 'Celer Network',          coingeckoId: 'celer-network' },
    { symbol: 'rsr',  name: 'Reserve Rights',          coingeckoId: 'reserve-rights-token' },
    { symbol: 'api3',  name: 'API3',                   coingeckoId: 'api3' },
    { symbol: 'mask',  name: 'Mask Network',           coingeckoId: 'mask-network' },
    { symbol: 'lrc',   name: 'Loopring',               coingeckoId: 'loopring' },
    { symbol: 'qtum',  name: 'Qtum',                   coingeckoId: 'qtum' },
    { symbol: 'zrx',   name: '0x Protocol',            coingeckoId: '0x' },
    { symbol: 'skl',   name: 'SKALE',                  coingeckoId: 'skale' },
    { symbol: 'imx',   name: 'Immutable',              coingeckoId: 'immutable-x' }, // IMX
    { symbol: 'flr',   name: 'Flare',                  coingeckoId: 'flare-networks' },
    { symbol: 'sei',   name: 'Sei',                    coingeckoId: 'sei-network' },
    { symbol: 'aptos', name: 'Aptos (legacy alias)',   coingeckoId: 'aptos' }, // alias 허용(중복 방지되지만 유지)
    { symbol: 'opx',   name: 'Optimism (alias)',       coingeckoId: 'optimism' }, // alias
    { symbol: 'arbx',  name: 'Arbitrum (alias)',       coingeckoId: 'arbitrum' }, // alias
    { symbol: 'bonk',  name: 'Bonk',                   coingeckoId: 'bonk' },
    { symbol: 'tia',   name: 'Celestia',               coingeckoId: 'celestia' },
    { symbol: 'pendle',name: 'Pendle',                 coingeckoId: 'pendle' },
    { symbol: 'pyth',  name: 'Pyth Network',           coingeckoId: 'pyth-network' },
    { symbol: 'jto',   name: 'Jito',                   coingeckoId: 'jito-governance-token' },
    { symbol: 'saga',  name: 'Saga',                   coingeckoId: 'saga-2' },
    { symbol: 'tiax',  name: 'Celestia (alias)',       coingeckoId: 'celestia' },
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
