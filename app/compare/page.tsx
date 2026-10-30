import { Suspense } from 'react';
import { safeDecode } from '@/lib/format';
import CompareView from './view';

type Search = { a?: string; b?: string };

async function FromQuery({ searchParams }: { searchParams: Promise<Search> }) {
  const { a = '', b = '' } = await searchParams;
  return <CompareView initialLeft={safeDecode(a)} initialRight={safeDecode(b)} />;
}

/**
 * Ссылки вида /compare?a=Иртыш::Иванов%20И.&b=... открывают готовую пару.
 *
 * Чтение `searchParams` делает ветку динамической, поэтому она живёт под своим
 * Suspense: статическая оболочка (сравнение двух лидеров по умолчанию)
 * пререндерится и отдаётся мгновенно, а пара из адреса подъезжает потоком.
 */
export default function Page({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<CompareView initialLeft="" initialRight="" />}>
      <FromQuery searchParams={searchParams} />
    </Suspense>
  );
}
