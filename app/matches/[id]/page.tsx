import { Suspense } from 'react';
import { safeDecode } from '@/lib/format';
import { RouteFallback } from '@/components/ui';
import MatchView from './view';

type Params = { id: string };

async function FromParams({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  return <MatchView matchId={safeDecode(resolved.id)} />;
}

/**
 * Параметр маршрута читается под своим Suspense: статическая оболочка
 * отдаётся мгновенно, а содержимое подъезжает потоком.
 */
export default function Page({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <FromParams params={params} />
    </Suspense>
  );
}
