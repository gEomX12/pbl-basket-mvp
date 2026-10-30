import { Suspense } from 'react';
import { safeDecode } from '@/lib/format';
import { RouteFallback } from '@/components/ui';
import ProfileView from './view';

type Params = { login: string };

async function FromParams({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  return <ProfileView login={safeDecode(resolved.login)} />;
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
