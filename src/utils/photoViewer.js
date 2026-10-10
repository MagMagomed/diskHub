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
