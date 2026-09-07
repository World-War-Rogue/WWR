/**
 * A wallet, in words.
 *
 * Every screen that showed the balance wrote "1,240 cr · 30 tk", and testers
 * asked what cr and tk were. Nothing on a phone can hover for a tooltip, so
 * the units are spelt out: Credits and Tokens, the two currencies' real
 * names. One component so the answer is the same everywhere.
 */
import {t} from '../i18n';
import type {Wallet} from '../net/api';

export default function WalletLine({credits, tokens, muted = false}: Wallet & {muted?: boolean}) {
  return (
    <span className="font-mono text-[11px]">
      <span className={muted ? 'text-neutral-400' : 'text-emerald-300'}>{credits.toLocaleString()}</span>
      <span className="text-neutral-500"> {t('wallet.credits')}</span>
      <span className={`ml-2 ${muted ? 'text-neutral-400' : 'text-amber-300'}`}>{tokens.toLocaleString()}</span>
      <span className="text-neutral-500"> {t('wallet.tokens')}</span>
    </span>
  );
}
