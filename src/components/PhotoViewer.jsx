import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import {
  getAdjacentPhotoId,
  getPhotoIndex,
  getSwipeOffset,
  getSwipeTargetOffset,
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
  const stageRef = useRef(null);
  const pendingPhotoIdRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [settling, setSettling] = useState(false);
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
      window.clearTimeout(transitionTimeoutRef.current);
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
    if (settling) return;
    if (event.touches.length !== 1) {
      cancelGesture();
      return;
    }
    const [touch] = event.touches;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchMove(event) {
    const start = touchStartRef.current;
    if (!start || event.touches.length !== 1) return;

    const [touch] = event.touches;
    const current = { x: touch.clientX, y: touch.clientY };
    const deltaX = current.x - start.x;
    const direction = deltaX < 0 ? 1 : -1;
    const canNavigate = Boolean(getAdjacentPhotoId(photos, photoId, direction));
    setDragOffset(getSwipeOffset(start, current, canNavigate));
  }

  function handleTouchEnd(event) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) {
      cancelGesture();
      return;
    }

    const [touch] = event.changedTouches;
    const end = { x: touch.clientX, y: touch.clientY };
    const targetOffset = getSwipeTargetOffset(
      start,
      end,
      stageRef.current?.clientWidth || 0,
    );
    const direction = targetOffset === null ? null : targetOffset < 0 ? 1 : -1;
    const nextPhotoId = direction && getAdjacentPhotoId(photos, photoId, direction);

    if (targetOffset === null || !nextPhotoId) {
      settleBack();
      return;
    }

    pendingPhotoIdRef.current = nextPhotoId;
    setSettling(true);
    setDragOffset(targetOffset);
    window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = window.setTimeout(finishAnimation, 300);
  }

  function cancelGesture() {
    touchStartRef.current = null;
    settleBack();
  }

  function settleBack() {
    pendingPhotoIdRef.current = null;
    if (dragOffset === 0) {
      setSettling(false);
      return;
    }
    setSettling(true);
    setDragOffset(0);
    window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = window.setTimeout(finishAnimation, 300);
  }

  function handleTransitionEnd(event) {
    if (event.target !== event.currentTarget) return;
    finishAnimation();
  }

  function finishAnimation() {
    window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = null;
    if (pendingPhotoIdRef.current) {
      onPhotoChange(pendingPhotoIdRef.current);
      pendingPhotoIdRef.current = null;
    }
    setDragOffset(0);
    setSettling(false);
  }

  function adjacentImageOffset() {
    const stageWidth = stageRef.current?.clientWidth || 0;
    return dragOffset + (dragOffset < 0 ? stageWidth : -stageWidth);
  }

  const adjacentPhoto = dragOffset < 0
    ? photos[photoIndex + 1]
    : dragOffset > 0
      ? photos[photoIndex - 1]
      : null;
  const transition = settling ? 'transform 220ms ease-out' : 'none';

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
          ref={stageRef}
          onTouchCancel={cancelGesture}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        >
          <div className="photo-viewer-carousel">
            <img
              className="photo-viewer-image"
              onTransitionEnd={handleTransitionEnd}
              src={getImageUrl(photo)}
              alt={photo.name}
              style={{ transform: `translateX(${dragOffset}px)`, transition }}
            />
            {adjacentPhoto && (
              <img
                aria-hidden="true"
                className="photo-viewer-image photo-viewer-adjacent"
                src={getImageUrl(adjacentPhoto)}
                alt=""
                style={{
                  transform: `translateX(${adjacentImageOffset()}px)`,
                  transition,
                }}
              />
            )}
          </div>
          <div className="photo-viewer-controls">
            <button
              aria-label="Предыдущая фотография"
              className="photo-viewer-nav photo-viewer-previous"
              disabled={!previousPhotoId}
              onClick={() => selectPhoto(previousPhotoId)}
              type="button"
            >
              <Icon name="chevron-left" size={25} />
            </button>
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
        </div>
      </section>
    </div>
  );
}

export default PhotoViewer;
