import { Suspense } from 'react';
import { safeDecode } from '@/lib/format';
import { RouteFallback } from '@/components/ui';
import PlayerView from './view';

type Params = { key: string };

async function FromParams({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  return <PlayerView playerKey={safeDecode(resolved.key)} />;
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
