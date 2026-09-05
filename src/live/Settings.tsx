/**
 * The settings panel, opened from the player menu above sign out.
 *
 * One container for the things that are about the player rather than the game:
 * how the game warns them, how they ask for help, and how they report a bug.
 * It starts with the bug report because that is the one that pays for itself
 * immediately - a tester with no way to reach you is a tester you learn
 * nothing from.
 */
import {type FormEvent, useEffect, useRef, useState} from 'react';
import {REPORT_MAX, type ReportScreen} from '../../shared/support';
import {ApiError, api} from '../net/api';
import {t} from '../i18n';
import {buildId, recentErrors} from './recentErrors';

export default function Settings({
  screen,
  onClose,
}: {
  screen: ReportScreen;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement | null>(null);

  // Escape closes. Same rule as the player menu - a panel that only closes by
  // finding the right button is a panel people leave open over the game.
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (body.trim().length === 0) {
      setError(t('settings.reportEmpty'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await api.reportBug({
        body,
        screen,
        build: buildId(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        console: recentErrors(),
      });
      setSentId(result.id);
      setBody('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('chat.unreachable'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title')}
        className="w-full max-w-lg rounded border border-neutral-700 bg-neutral-950 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200"
          >
            {t('settings.close')}
          </button>
        </div>

        <section className="px-4 py-4">
          <h3 className="text-sm font-semibold text-neutral-100">{t('settings.reportBug')}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">
            {t('settings.reportBlurb')}
          </p>

          {sentId ? (
            <div className="mt-3">
              <p className="rounded border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
                {t('settings.reportThanks', {id: sentId.slice(0, 8)})}
              </p>
              <button
                onClick={() => setSentId(null)}
                className="mt-3 text-[13px] text-orange-400 hover:text-orange-300"
              >
                {t('settings.reportAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void send(e)} className="mt-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, REPORT_MAX))}
                rows={6}
                placeholder={t('settings.reportPlaceholder')}
                className="w-full resize-y rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none"
              />
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] text-neutral-600">{t('settings.reportContext')}</p>
                <span className="ml-3 shrink-0 font-mono text-[11px] text-neutral-600">
                  {body.length}/{REPORT_MAX}
                </span>
              </div>

              {error && (
                <p className="mt-2 rounded border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="mt-3 rounded bg-orange-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-500 disabled:opacity-50"
              >
                {sending ? t('settings.reportSending') : t('settings.reportSend')}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
