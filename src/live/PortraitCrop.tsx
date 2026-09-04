/**
 * Cropping a photograph into a portrait.
 *
 * The crop exists so a player frames their own picture. Without it, a wide
 * photo is either squashed or centre-cropped by the renderer, and the one
 * thing everybody wants from a profile picture - their face in it - is the
 * thing most likely to be cut off.
 *
 * Everything happens in the browser. The Workers runtime has no image library,
 * so a server taking originals would be storing four megabytes off a phone
 * camera to draw at 88 pixels. Here the photo is drawn into a square canvas at
 * the chosen scale and offset, and only that square is ever uploaded.
 */
import {type ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import {PORTRAIT_SIZE} from '../../shared/portraits';

const FRAME = 264;

export interface Crop {
  scale: number;
  x: number;
  y: number;
}

/**
 * Encodes the framed square.
 *
 * WebP first: roughly a third the bytes of JPEG at the same quality, and every
 * browser that can run this app can display it. Safari versions that cannot
 * *encode* it silently hand back a PNG data URL instead of failing, so the
 * result is checked rather than assumed, and JPEG is the fallback.
 */
export function encodeCrop(image: HTMLImageElement, crop: Crop): string {
  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_SIZE;
  canvas.height = PORTRAIT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');

  ctx.imageSmoothingQuality = 'high';
  const ratio = PORTRAIT_SIZE / FRAME;
  ctx.drawImage(
    image,
    crop.x * ratio,
    crop.y * ratio,
    image.width * crop.scale * ratio,
    image.height * crop.scale * ratio,
  );

  const webp = canvas.toDataURL('image/webp', 0.88);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', 0.88);
}

export default function PortraitCrop({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({scale: 1, x: 0, y: 0});
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{x: number; y: number} | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Open at the scale that just fills the frame, so the starting view is
      // always full-bleed rather than a small picture on a large empty square.
      const fit = Math.max(FRAME / img.width, FRAME / img.height);
      setImage(img);
      setCrop({
        scale: fit,
        x: (FRAME - img.width * fit) / 2,
        y: (FRAME - img.height * fit) / 2,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError('That file could not be opened as an image.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = FRAME * dpr;
    canvas.height = FRAME * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0906';
    ctx.fillRect(0, 0, FRAME, FRAME);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      image.width * crop.scale,
      image.height * crop.scale,
    );
  }, [image, crop]);

  const rescale = useCallback(
    (next: number) => {
      setCrop((c) => {
        // Zoom about the centre of the frame, so the thing being framed stays
        // framed. Zooming about the origin walks the subject off the edge.
        const factor = next / c.scale;
        return {
          scale: next,
          x: FRAME / 2 - (FRAME / 2 - c.x) * factor,
          y: FRAME / 2 - (FRAME / 2 - c.y) * factor,
        };
      });
    },
    [],
  );

  if (error) {
    return (
      <div className="rounded border border-red-900 bg-red-950/60 p-4">
        <p className="text-sm text-red-300">{error}</p>
        <button onClick={onCancel} className="mt-3 text-xs text-neutral-400 underline">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-sm font-semibold text-neutral-200">Frame your picture</p>
      <p className="mt-1 text-xs text-neutral-500">Drag to move, slider to zoom.</p>

      <div className="mt-3 flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          style={{width: FRAME, height: FRAME}}
          className="cursor-move touch-none rounded-lg border border-neutral-700"
          onPointerDown={(e) => {
            dragRef.current = {x: e.clientX, y: e.clientY};
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const from = dragRef.current;
            if (!from) return;
            const dx = e.clientX - from.x;
            const dy = e.clientY - from.y;
            dragRef.current = {x: e.clientX, y: e.clientY};
            setCrop((c) => ({...c, x: c.x + dx, y: c.y + dy}));
          }}
          onPointerUp={(e) => {
            dragRef.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
        />

        <input
          type="range"
          min={0.2}
          max={4}
          step={0.01}
          value={crop.scale}
          onChange={(e: ChangeEvent<HTMLInputElement>) => rescale(Number(e.target.value))}
          className="w-full accent-orange-600"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => image && onDone(encodeCrop(image, crop))}
          disabled={!image}
          className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-800"
        >
          Use this
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
