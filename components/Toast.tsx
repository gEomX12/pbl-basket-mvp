'use client';

export type ToastTone = 'success' | 'error';

/**
 * Всплывающее уведомление. Управляется родителем: он же гасит его по таймеру,
 * поэтому компоненту не нужен ни собственный таймер, ни эффект.
 */
export default function Toast({
  text,
  tone = 'success',
  onClose,
}: {
  text: string | null;
  tone?: ToastTone;
  onClose: () => void;
}) {
  if (!text) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="feed-in fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-6 sm:mx-0"
    >
      <div
        className={`card flex items-start gap-3 px-4 py-3 shadow-xl ${
          tone === 'success' ? 'border-win/50' : 'border-loss/50'
        }`}
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
            tone === 'success' ? 'bg-win' : 'bg-loss'
          }`}
        >
          {tone === 'success' ? '✓' : '!'}
        </span>
        <p className="min-w-0 flex-1 text-sm leading-snug">{text}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="shrink-0 text-lg leading-none text-muted transition hover:text-fg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
