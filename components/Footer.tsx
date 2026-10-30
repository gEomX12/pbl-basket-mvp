import Link from 'next/link';
import { CURRENT_SEASON } from '@/lib/league-data';

export const CONTACT_EMAIL = 'pblbasketinfo@gmail.com';
export const CONTACT_TELEGRAM = 'miroslawvwv';
export const CONTACT_TELEGRAM_URL = `https://t.me/${CONTACT_TELEGRAM}`;

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Турнир',
    links: [
      { href: '/', label: 'Турнирная таблица' },
      { href: '/schedule', label: 'Расписание и результаты' },
      { href: '/teams', label: 'Команды' },
      { href: '/leaders', label: 'Лидеры' },
      { href: '/compare', label: 'Сравнение игроков' },
    ],
  },
  {
    title: 'Участникам',
    links: [
      { href: '/request', label: 'Подать заявку' },
      { href: '/scorer', label: 'Судейский столик' },
      { href: '/matches', label: 'Архив матчей' },
      { href: '/settings', label: 'Настройки' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-black text-accentfg">
              ПБЛ
            </span>
            <span className="text-sm font-black">ПБЛ Павлодар</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Павлодарская баскетбольная лига — турниры, расписание и результаты матчей,
            турнирные таблицы, команды и статистика игроков.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted">
              {column.title}
            </h2>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-muted">
            Контакты
          </h2>
          <a
            href={CONTACT_TELEGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accentfg transition hover:opacity-90"
          >
            Связаться — @{CONTACT_TELEGRAM}
          </a>
          <p className="mt-3 text-sm">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-muted transition hover:text-accent"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>

      <div className="border-t border-line px-4 py-4 text-center text-[11px] text-muted">
        © ПБЛ Павлодар, сезон {CURRENT_SEASON}. Составы команд — официальные; счёт и статистика
        сыгранных матчей до старта сезона демонстрационные.
      </div>
    </footer>
  );
}
