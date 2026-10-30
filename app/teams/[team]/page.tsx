import { Suspense } from 'react';
import { safeDecode } from '@/lib/format';
import { RouteFallback } from '@/components/ui';
import TeamView from './view';

type Params = { team: string };

async function FromParams({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  return <TeamView teamName={safeDecode(resolved.team)} />;
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
