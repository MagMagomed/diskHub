export function getPhotoIndex(photos, photoId) {
  return photos.findIndex((photo) => photo.id === photoId);
}

export function getAdjacentPhotoId(photos, photoId, direction) {
  if (direction !== -1 && direction !== 1) return null;

  const index = getPhotoIndex(photos, photoId);
  if (index === -1) return null;
  const adjacentPhoto = photos[index + direction];
  return adjacentPhoto?.id || null;
}

export function getSwipeDirection(start, end, threshold = 50) {
  if (
    !start
    || !end
    || !Number.isFinite(start.x)
    || !Number.isFinite(start.y)
    || !Number.isFinite(end.x)
    || !Number.isFinite(end.y)
    || !Number.isFinite(threshold)
    || threshold < 0
  ) {
    return null;
  }

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
    return null;
  }
  return deltaX < 0 ? 1 : -1;
}
