'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * Крошечное хранилище поверх localStorage.
 *
 * Снимки кэшируются по ключу: `useSyncExternalStore` требует ссылочно
 * стабильного результата, иначе React зациклит рендер. Любая запись
 * вызывает `notify()`, который сбрасывает кэш и будит подписчиков.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
const cache = new Map<string, unknown>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notify(): void {
  cache.clear();
  for (const listener of listeners) listener();
}

function snapshot<T>(key: string, read: () => T): T {
  if (!cache.has(key)) cache.set(key, read());
  return cache.get(key) as T;
}

/* ------------------------------------------------------------------ */
/*  Барьер гидратации                                                   */
/* ------------------------------------------------------------------ */

const HydratedContext = createContext(false);

/**
 * До конца гидратации все клиентские значения подменяются серверными.
 *
 * Полагаться на `getServerSnapshot` нельзя: React вызывает его при
 * серверном рендере, но при гидратации внутри Suspense успевает
 * перерисовать поддерево уже клиентским снимком — и разметка расходится
 * (проверено: тема, состояние входа, избранное). Единственный надёжный
 * сигнал «DOM совпал с сервером» — первый эффект после монтирования.
 */
export function HydrationGate({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- это и есть сигнал о завершении гидратации
    setHydrated(true);
  }, []);

  return <HydratedContext.Provider value={hydrated}>{children}</HydratedContext.Provider>;
}

/**
 * Читает значение, которое существует только в браузере.
 * На сервере и во время гидратации возвращается `serverValue`.
 */
export function useClientStore<T>(key: string, read: () => T, serverValue: T): T {
  const hydrated = useContext(HydratedContext);
  const value = useSyncExternalStore(
    subscribe,
    () => snapshot(key, read),
    () => serverValue,
  );
  return hydrated ? value : serverValue;
}

/** Завершилась ли гидратация — для разметки, зависящей только от браузера. */
export function useHydrated(): boolean {
  return useContext(HydratedContext);
}
