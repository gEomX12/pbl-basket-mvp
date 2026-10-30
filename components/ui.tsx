'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { initials, teamColor, teamLogo } from '@/lib/format';
import type { MatchStatus } from '@/types/match';

/* ------------------------------ Логотип ------------------------------ */

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
} as const;

const PX = { sm: 32, md: 44, lg: 64, xl: 96 } as const;

export function TeamBadge({
  team,
  size = 'md',
}: {
  team: string;
  size?: keyof typeof SIZES;
}) {
  const logo = teamLogo(team);

  // Эмблема лежит в /public/teams; если её нет — показываем инициалы.
  if (logo) {
    return (
      <span
        aria-hidden
        title={team}
        className={`${SIZES[size]} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface2 ring-1 ring-line`}
      >
        <Image
          src={logo}
          alt=""
          width={PX[size]}
          height={PX[size]}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={`${SIZES[size]} inline-flex shrink-0 items-center justify-center rounded-full font-black text-white`}
      style={{ background: teamColor(team) }}
      title={team}
    >
      {initials(team)}
    </span>
  );
}

export function TeamLink({
  team,
  size = 'sm',
  className = '',
  withBadge = true,
}: {
  team: string;
  size?: keyof typeof SIZES;
  className?: string;
  withBadge?: boolean;
}) {
  return (
    <Link
      href={`/teams/${encodeURIComponent(team)}`}
      className={`inline-flex items-center gap-2 font-medium hover:text-accent ${className}`}
    >
      {withBadge && <TeamBadge team={team} size={size} />}
      <span className="truncate">{team}</span>
    </Link>
  );
}

/* ------------------------------ Карточки ----------------------------- */

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-3 py-3 text-center">
      <div className={`text-2xl font-black tabular-nums ${accent ? 'text-accent' : ''}`}>{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

/* ------------------------------- Табы -------------------------------- */

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';
  return (
    <div
      role="tablist"
      className="scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface2 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`${pad} whitespace-nowrap rounded-lg font-bold transition ${
              active
                ? 'bg-accent text-accentfg shadow-sm'
                : 'text-muted hover:bg-surface hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ Статусы ------------------------------ */

export function StatusBadge({ status, period }: { status: MatchStatus; period?: number }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-live/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-live">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
        LIVE{period ? ` · ${period}Ч` : ''}
      </span>
    );
  }
  if (status === 'final') {
    return (
      <span className="rounded-md bg-surface2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        Завершён
      </span>
    );
  }
  return (
    <span className="rounded-md bg-accentsoft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
      Запланирован
    </span>
  );
}

export function FormDots({ form }: { form: ('W' | 'L')[] }) {
  if (form.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex gap-1">
      {form.map((result, index) => (
        <span
          key={index}
          title={result === 'W' ? 'Победа' : 'Поражение'}
          className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-black text-white ${
            result === 'W' ? 'bg-win' : 'bg-loss'
          }`}
        >
          {result === 'W' ? 'В' : 'П'}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------ Кнопки ------------------------------- */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

export const btn = {
  primary: `${BTN_BASE} bg-accent text-accentfg px-4 py-2 text-sm hover:opacity-90`,
  ghost: `${BTN_BASE} border border-line bg-surface px-4 py-2 text-sm hover:border-accent hover:text-accent`,
  subtle: `${BTN_BASE} bg-surface2 px-3 py-1.5 text-xs hover:bg-accentsoft hover:text-accent`,
};

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent';

export const labelClass =
  'block text-[11px] font-bold uppercase tracking-wider text-muted';

/** Скелет маршрута: показывается, пока подъезжают параметры из адреса. */
export function RouteFallback() {
  return (
    <div className="space-y-4 py-4" aria-hidden>
      <div className="h-7 w-56 animate-pulse rounded-lg bg-surface2" />
      <div className="h-28 animate-pulse rounded-xl bg-surface2" />
      <div className="h-72 animate-pulse rounded-xl bg-surface2" />
    </div>
  );
}
