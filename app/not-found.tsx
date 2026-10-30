import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-md py-16 text-center">
      <p className="text-6xl font-black text-accent">404</p>
      <h1 className="mt-3 text-2xl font-black">Страница не найдена</h1>
      <p className="mt-2 text-sm text-muted">
        Возможно, матч перенесён, а команда сменила название.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accentfg transition hover:opacity-90"
        >
          Турнирная таблица
        </Link>
        <Link
          href="/schedule"
          className="rounded-lg border border-line px-4 py-2 text-sm font-bold transition hover:border-accent hover:text-accent"
        >
          Расписание
        </Link>
      </div>
    </section>
  );
}
