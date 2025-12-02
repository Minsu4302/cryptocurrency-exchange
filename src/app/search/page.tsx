export const revalidate = 30;
import Client from './Client';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const params = await searchParams;
  const q = params?.query?.trim() || '';
  // 서버 프리페치 제거 - 즉시 렌더링으로 TTFB 개선
  return <Client initialQuery={q} />;
}
