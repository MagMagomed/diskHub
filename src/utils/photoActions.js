const maxPhotoTapDuration = 350;
const maxPhotoTapDistance = 12;

export function isShortPhotoTap(start, end, duration) {
  if (
    !start
    || !end
    || !Number.isFinite(start.x)
    || !Number.isFinite(start.y)
    || !Number.isFinite(end.x)
    || !Number.isFinite(end.y)
    || !Number.isFinite(duration)
    || duration < 0
    || duration > maxPhotoTapDuration
  ) {
    return false;
  }

  return Math.hypot(end.x - start.x, end.y - start.y) <= maxPhotoTapDistance;
}
