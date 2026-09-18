/**
 * Maps a scroll range that is too tall for the browser onto one it can lay out
 *
 * Browsers cap the height of an element at a few ten million pixels, and
 * silently clamp anything taller, so a list of millions of rows cannot be
 * scrolled past the cap. The list is therefore laid out at a compressed
 * height, and every scroll position is scaled between the two: the content
 * position is `factor` times the layout position, so that the end of the
 * layout still shows the end of the content.
 *
 * @param contentSize - The size of the content, in pixels
 * @param viewportSize - The size of the scroll container, in pixels
 * @param maxContentSize - The largest size to lay out, in pixels
 * @returns The size to lay out, and the factor content positions exceed layout
 * positions by, which is `1` while the content fits
 */
export function compressScrollRange(
  contentSize: number,
  viewportSize: number,
  maxContentSize: number,
): { layoutSize: number; factor: number } {
  const range = contentSize - viewportSize;
  const maxRange = maxContentSize - viewportSize;
  if (range <= maxRange || maxRange <= 0) {
    return { layoutSize: contentSize, factor: 1 };
  }
  return { layoutSize: maxContentSize, factor: range / maxRange };
}
