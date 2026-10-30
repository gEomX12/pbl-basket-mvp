'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useAuth, useLeague, useTheme } from '@/lib/providers';
import GlobalSearch from '@/components/GlobalSearch';
import BrandLogo from '@/components/BrandLogo';
import NavLinks, { NavLinksSkeleton } from '@/components/NavLinks';
import { CONTACT_TELEGRAM_URL } from '@/components/Footer';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-sun h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="icon-moon h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export default function Header() {
  const { toggle } = useTheme();
  const { season, setSeason, seasons, division, setDivision, divisions } = useLeague();
  const { account, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  /** Любой переход закрывает выпадающие панели. */
  const closeAll = () => {
    setMenuOpen(false);
    setUserOpen(false);
  };

  const selectClass =
    'rounded-lg border border-line bg-surface2 px-2 py-1.5 text-xs font-semibold outline-none transition focus:border-accent';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? 'Закрыть меню' : 'Основное меню'}
          aria-expanded={menuOpen}
          className="rounded-lg border border-line px-2.5 py-2 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            {menuOpen ? (
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        <BrandLogo onClick={closeAll} />

        <nav className="scroll-thin hidden flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
          <Suspense fallback={<NavLinksSkeleton variant="desktop" />}>
            <NavLinks variant="desktop" onNavigate={closeAll} />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden xl:block">
            <GlobalSearch />
          </div>

          {/* Пока дивизион и сезон единственные, выпадающие списки не нужны. */}
          {divisions.length > 1 && (
            <select
              aria-label="Дивизион"
              value={division}
              onChange={(event) => setDivision(event.target.value)}
              className={`hidden md:block ${selectClass}`}
            >
              {divisions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          )}

          {seasons.length > 1 && (
            <select
              aria-label="Сезон"
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              className={`hidden sm:block ${selectClass}`}
            >
              {seasons.map((item) => (
                <option key={item} value={item}>Сезон {item}</option>
              ))}
            </select>
          )}

          <a
            href={CONTACT_TELEGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted transition hover:border-accent hover:text-accent md:inline-flex"
          >
            Связаться
          </a>

          {/* Обе иконки всегда в разметке — видимость решает CSS по data-theme. */}
          <button
            type="button"
            onClick={toggle}
            title="Переключить тему"
            aria-label="Переключить тему"
            className="rounded-lg border border-line p-2 text-muted transition hover:border-accent hover:text-accent"
          >
            <SunIcon />
            <MoonIcon />
          </button>

          {account ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserOpen((value) => !value)}
                aria-expanded={userOpen}
                className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-xs font-bold transition hover:border-accent"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] text-accentfg">
                  {account.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate sm:block">{account.displayName}</span>
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
                  <Link href={`/profile/${encodeURIComponent(account.login)}`} onClick={closeAll} className="block px-4 py-2.5 text-sm hover:bg-surface2">
                    Страница пользователя
                  </Link>
                  <Link href="/settings" onClick={closeAll} className="block px-4 py-2.5 text-sm hover:bg-surface2">
                    Настройки
                  </Link>
                  <Link href="/request" onClick={closeAll} className="block px-4 py-2.5 text-sm hover:bg-surface2">
                    Подать заявку
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setUserOpen(false);
                    }}
                    className="block w-full border-t border-line px-4 py-2.5 text-left text-sm text-loss hover:bg-surface2"
                  >
                    Выход из аккаунта
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeAll}
              className="glow-accent rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accentfg hover:opacity-95"
            >
              Вход
            </Link>
          )}
        </div>
      </div>

      {/* Мобильное меню */}
      {menuOpen && (
        <div className="border-t border-line bg-surface px-4 py-3 lg:hidden">
          <GlobalSearch onNavigate={closeAll} />

          <nav className="mt-3 grid gap-1">
            <Suspense fallback={<NavLinksSkeleton variant="mobile" />}>
              <NavLinks variant="mobile" onNavigate={closeAll} />
            </Suspense>
            <Link href="/request" onClick={closeAll} className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-surface2">
              Подать заявку
            </Link>
            <a
              href="https://t.me/miroslawvwv"
              target="_blank"
              rel="noreferrer noopener"
              onClick={closeAll}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-surface2"
            >
              Связаться
            </a>
          </nav>

          {(divisions.length > 1 || seasons.length > 1) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {divisions.length > 1 && (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Дивизион</span>
                  <select
                    value={division}
                    onChange={(event) => setDivision(event.target.value)}
                    className={`w-full ${selectClass}`}
                  >
                    {divisions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              )}
              {seasons.length > 1 && (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Сезон</span>
                  <select
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
                    className={`w-full ${selectClass}`}
                  >
                    {seasons.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
