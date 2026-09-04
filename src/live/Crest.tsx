/**
 * An alliance crest.
 *
 * The fallback is the alliance's own tag on a colour it chose, not a generic
 * placeholder. A tag is what other players already read an alliance by, so an
 * alliance that has never uploaded anything still looks like itself rather
 * than looking unfinished - which matters most in the browse list, where an
 * alliance is competing for somebody's decision to join.
 */
import {useEffect, useRef, useState} from 'react';
import {PORTRAIT_TINTS, PORTRAIT_TINTS_BY_ID} from '../../shared/portraits';

export function Crest({
  tag,
  tint,
  src,
  size = 56,
}: {
  tag: string;
  tint: string;
  src?: string | null;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (src && !failed) return;
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colours = PORTRAIT_TINTS_BY_ID[tint] ?? PORTRAIT_TINTS[0];
    ctx.fillStyle = colours.background;
    ctx.fillRect(0, 0, size, size);

    const wash = ctx.createLinearGradient(0, 0, 0, size);
    wash.addColorStop(0, 'rgba(255,255,255,0.14)');
    wash.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, size, size);

    // Sized against the tag's own length rather than a fixed value, so a
    // two-letter tag is not lost in the square and a four-letter one does not
    // run off the edges.
    const scale = tag.length <= 2 ? 0.46 : tag.length === 3 ? 0.36 : 0.28;
    ctx.fillStyle = colours.ink;
    ctx.font = `700 ${size * scale}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag.toUpperCase(), size / 2, size / 2 + size * 0.02);
  }, [tag, tint, size, src, failed]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{width: size, height: size, objectFit: 'cover'}}
        className="shrink-0 rounded-lg border border-neutral-700"
      />
    );
  }

  return (
    <canvas
      ref={ref}
      style={{width: size, height: size}}
      className="shrink-0 rounded-lg border border-neutral-700"
    />
  );
}
