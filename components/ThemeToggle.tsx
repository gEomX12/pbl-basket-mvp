'use client';

import { useRef, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { useTheme, type Theme } from '@/lib/providers';

const REVEAL_MS = 520;
const REVEAL_EASING = 'cubic-bezier(0.77, 0, 0.175, 1)';
const FADE_MS = 240;
const FADE_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)';

/* ------------------------------------------------------------------ */
/*  Звук: короткое трезвучие, вверх — светлая, вниз — тёмная          */
/* ------------------------------------------------------------------ */

let audioCtx: AudioContext | null = null;

function playChord(up: boolean) {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    audioCtx ??= new AC();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    return;
  }

  // До мажор: C5–E5–G5 вверх или G4–E4–C4 вниз.
  const notes = up ? [523.25, 659.25, 783.99] : [392.0, 329.63, 261.63];
  const now = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.gain.value = 0.12;
  master.connect(audioCtx.destination);

  notes.forEach((freq, i) => {
    const start = now + i * 0.045;
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

/* ------------------------------------------------------------------ */

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="icon-sun h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="icon-moon h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

/**
 * Разметка не зависит от темы — обе иконки всегда на месте, нужную показывает
 * CSS по data-theme. Поэтому сервер и клиент рендерят одно и то же.
 */
export default function ThemeToggle() {
  const { setTheme } = useTheme();
  const transitionRef = useRef<ViewTransition | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    playChord(next === 'light');

    const apply = () => flushSync(() => setTheme(next));

    // Старые браузеры: просто меняем тему.
    if (typeof document.startViewTransition !== 'function') {
      apply();
      return;
    }

    // Быстрые повторные клики: предыдущий переход завершаем мгновенно.
    transitionRef.current?.skipTransition();

    // С клавиатуры координат клика нет (detail === 0) — берём центр кнопки.
    let x = event.clientX;
    let y = event.clientY;
    if (event.detail === 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const transition = document.startViewTransition(apply);
    transitionRef.current = transition;
    void transition.finished.finally(() => {
      if (transitionRef.current === transition) transitionRef.current = null;
    });

    transition.ready
      .then(() => {
        const pseudoElement = '::view-transition-new(root)';
        if (reduced) {
          root.animate({ opacity: [0, 1] }, { duration: FADE_MS, easing: FADE_EASING, pseudoElement });
          return;
        }
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          { duration: REVEAL_MS, easing: REVEAL_EASING, pseudoElement },
        );
      })
      .catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Переключить тему"
      aria-label="Переключить тему"
      className="theme-toggle grid place-items-center rounded-lg border border-line p-2 text-muted transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-accent hover:text-accent active:scale-90 motion-reduce:active:scale-95"
    >
      <SunIcon />
      <MoonIcon />
    </button>
  );
}
