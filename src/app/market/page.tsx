// src/app/market/page.tsx (server component)
import MarketClient from './Client'

export const revalidate = 30

export default async function MarketPage() {
  let initialTrending: any = null
  let initialAssets: any = null
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const [trendingRes, assetsRes] = await Promise.all([
      fetch(`${base}/api/dashboard/trending`, { next: { revalidate }, cache: 'force-cache' }),
      fetch(`${base}/api/dashboard/assets?vs=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true`, {
        next: { revalidate },
        cache: 'force-cache',
      }),
    ])
    if (trendingRes.ok) initialTrending = await trendingRes.json()
    if (assetsRes.ok) initialAssets = await assetsRes.json()
  } catch {}
  return <MarketClient initialTrending={initialTrending} initialAssets={initialAssets} />
}
