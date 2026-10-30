'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV = [
  { href: '/', label: 'Таблица' },
  { href: '/schedule', label: 'Расписание' },
  { href: '/teams', label: 'Команды' },
  { href: '/leaders', label: 'Лидеры' },
  { href: '/compare', label: 'Сравнение' },
  { href: '/scorer', label: 'Столик' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Единственное место, которое читает адрес страницы.
 *
 * Вынесено из шапки намеренно: `usePathname()` требует собственной границы
 * Suspense, а если в неё попадает вся шапка, её гидратация откладывается —
 * и разметка, зависящая от localStorage, успевает разойтись с серверной.
 */
export default function NavLinks({
  variant,
  onNavigate,
}: {
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? '/';

  const base =
    variant === 'desktop'
      ? 'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold transition'
      : 'rounded-lg px-3 py-2.5 text-sm font-semibold transition';

  const inactive =
    variant === 'desktop' ? 'text-muted hover:bg-surface2 hover:text-fg' : 'hover:bg-surface2';

  return (
    <>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`${base} ${
            isActive(pathname, item.href) ? 'bg-accent text-accentfg' : inactive
          }`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

/** Заглушка на время стриминга ссылок — совпадает по размеру с реальной навигацией. */
export function NavLinksSkeleton({ variant }: { variant: 'desktop' | 'mobile' }) {
  return (
    <>
      {NAV.map((item) => (
        <span
          key={item.href}
          aria-hidden
          className={
            variant === 'desktop'
              ? 'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted'
              : 'rounded-lg px-3 py-2.5 text-sm font-semibold text-muted'
          }
        >
          {item.label}
        </span>
      ))}
    </>
  );
}
