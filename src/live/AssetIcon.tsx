/**
 * An asset, drawn.
 *
 * One component for every size the roster and squad screens use, because the
 * silhouette is vector: the same paths that will be stamped onto the map
 * canvas at twelve pixels are the ones drawn here at sixty-four, so an asset
 * looks like itself wherever it appears. That is the whole reason this is
 * geometry rather than a picture.
 *
 * When per-asset art is bought it goes in front of this, not instead of it -
 * the silhouette stays as the fallback while the image loads and forever for
 * assets that never get one, the same way a base skin's drawn recipe does.
 */
import {
  CATEGORY_COLOUR,
  CATEGORY_PATH,
  ROLE_MARK,
} from '../../shared/assetArt';
import type {Asset} from '../../shared/assets';

export default function AssetIcon({
  asset,
  size = 40,
  tint,
  heading = 0,
  showRole = true,
}: {
  asset: Asset;
  size?: number;
  /** Overrides the category colour - the map passes allegiance in here. */
  tint?: string;
  /** Degrees clockwise from north. The map turns these; screens leave them. */
  heading?: number;
  showRole?: boolean;
}) {
  const colour = tint ?? CATEGORY_COLOUR[asset.category];
  // Below about twenty pixels the role mark stops being a shape and becomes
  // three dark pixels in the middle of the silhouette, which reads as damage
  // rather than as information.
  const withRole = showRole && size >= 20;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={`${asset.name}, ${asset.category}`}
      style={{display: 'block'}}
    >
      <g transform={heading ? `rotate(${heading} 12 12)` : undefined}>
        {/*
          A dark under-stroke, so the shape holds its edge against pale ground
          and against its own colour. Without it a tan tank on the salt flats
          has no outline at all.
        */}
        <path
          d={CATEGORY_PATH[asset.category]}
          fill="none"
          stroke="rgba(0,0,0,0.75)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path d={CATEGORY_PATH[asset.category]} fill={colour} />
        {withRole && (
          <path d={ROLE_MARK[asset.role]} fill="rgba(0,0,0,0.55)" />
        )}
      </g>
    </svg>
  );
}
