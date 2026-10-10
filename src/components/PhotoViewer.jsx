import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import {
  getAdjacentPhotoId,
  getPhotoIndex,
  getSwipeDirection,
} from '../utils/photoViewer.js';

function PhotoViewer({
  photos,
  photoId,
  getImageUrl,
  onPhotoChange,
  onClose,
  ownerLabel = '',
}) {
  const closeButtonRef = useRef(null);
  const touchStartRef = useRef(null);
  const photoIndex = getPhotoIndex(photos, photoId);
  const photo = photos[photoIndex];

  useEffect(() => {
    if (!photo) {
      onClose();
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const previousPhotoId = getAdjacentPhotoId(photos, photoId, -1);
        if (previousPhotoId) onPhotoChange(previousPhotoId);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextPhotoId = getAdjacentPhotoId(photos, photoId, 1);
        if (nextPhotoId) onPhotoChange(nextPhotoId);
      }
    };

    document.body.classList.add('photo-viewer-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('photo-viewer-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onPhotoChange, photo, photoId, photos]);

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement;
    closeButtonRef.current?.focus();

    return () => {
      if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, []);

  if (!photo) return null;

  const previousPhotoId = getAdjacentPhotoId(photos, photoId, -1);
  const nextPhotoId = getAdjacentPhotoId(photos, photoId, 1);

  function selectPhoto(nextPhotoId) {
    if (nextPhotoId) onPhotoChange(nextPhotoId);
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const [touch] = event.touches;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;

    const [touch] = event.changedTouches;
    const direction = getSwipeDirection(start, { x: touch.clientX, y: touch.clientY });
    if (direction) selectPhoto(getAdjacentPhotoId(photos, photoId, direction));
  }

  return (
    <div
      className="photo-viewer-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-label="Просмотр фотографии"
        aria-modal="true"
        className="photo-viewer"
        role="dialog"
      >
        <div className="photo-viewer-toolbar">
          <div className="photo-viewer-caption">
            <strong title={photo.name}>{photo.name}</strong>
            {ownerLabel && <span>{ownerLabel}</span>}
            <span>{photoIndex + 1} / {photos.length}</span>
          </div>
          <button
            aria-label="Закрыть просмотр фотографии"
            className="photo-viewer-close"
            onClick={() => onClose()}
            ref={closeButtonRef}
            type="button"
          >
            <Icon name="close" size={21} />
          </button>
        </div>
        <div
          className="photo-viewer-stage"
          onTouchCancel={() => { touchStartRef.current = null; }}
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          <button
            aria-label="Предыдущая фотография"
            className="photo-viewer-nav photo-viewer-previous"
            disabled={!previousPhotoId}
            onClick={() => selectPhoto(previousPhotoId)}
            type="button"
          >
            <Icon name="chevron-left" size={25} />
          </button>
          <img className="photo-viewer-image" src={getImageUrl(photo)} alt={photo.name} />
          <button
            aria-label="Следующая фотография"
            className="photo-viewer-nav photo-viewer-next"
            disabled={!nextPhotoId}
            onClick={() => selectPhoto(nextPhotoId)}
            type="button"
          >
            <Icon name="chevron-right" size={25} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default PhotoViewer;
