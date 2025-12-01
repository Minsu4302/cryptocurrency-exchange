export const revalidate = 30;
import Client from './Client';

export default async function SearchPage({ searchParams }: { searchParams?: { query?: string } }) {
  const q = searchParams?.query?.trim() || '';
  let initial: { coins: any[]; exchanges: any[]; nfts: any[] } | null = null;
  if (q) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/search?query=${encodeURIComponent(q)}`, { cache: 'force-cache' });
      if (res.ok) initial = await res.json();
    } catch {}
  }
  return <Client initial={initial} initialQuery={q} />;
}
