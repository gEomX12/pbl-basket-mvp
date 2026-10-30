import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AppProviders, THEME_BOOTSTRAP } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Павлодарская баскетбольная лига (ПБЛ) — матчи, результаты, команды',
  description:
    'Павлодарская баскетбольная лига (ПБЛ) — баскетбольные турниры в Павлодаре, расписание и результаты матчей, турнирные таблицы, команды, новости и видеообзоры игр.',
  keywords: [
    'Павлодарская баскетбольная лига',
    'ПБЛ Павлодар',
    'баскетбол Павлодар',
    'турнирная таблица баскетбол',
    'расписание баскетбольных матчей',
    'PBL Pavlodar',
  ],
  applicationName: 'ПБЛПавлодар',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'ПБЛПавлодар',
    title: 'Павлодарская баскетбольная лига (ПБЛ) — матчи, результаты, команды',
    description:
      'Расписание и результаты матчей, турнирные таблицы, команды и статистика игроков Павлодарской баскетбольной лиги.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-screen flex-col bg-bg text-fg antialiased">
        <AppProviders>
          {/*
            Без общих границ Suspense: иначе шапка и страницы гидратируются
            позже провайдеров и успевают получить клиентские значения до того,
            как разметка совпадёт с серверной. Свои границы есть у NavLinks
            и у страниц, читающих параметры адреса.
          */}
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
