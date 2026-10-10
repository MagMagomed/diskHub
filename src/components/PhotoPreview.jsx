import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { getPhotoTapAction, isShortPhotoTap } from '../utils/photoActions.js';

function PhotoPreview({
  name,
  imageUrl,
  downloadUrl,
  onOpen,
  onDelete,
  deleteLabel = `Удалить ${name}`,
  deleteDisabled = false,
}) {
  const [actionsVisible, setActionsVisible] = useState(false);
  const pointerStartRef = useRef(null);
  const ignoreTouchClickRef = useRef(false);
  const ignoreClickTimeoutRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(ignoreClickTimeoutRef.current);
  }, []);

  function handlePointerDown(event) {
    if (event.pointerType !== 'touch') return;
    pointerStartRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
    };
  }

  function handlePointerUp(event) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId || event.pointerType !== 'touch') return;

    const isTap = isShortPhotoTap(
      start,
      { x: event.clientX, y: event.clientY },
      event.timeStamp - start.time,
    );
    const action = getPhotoTapAction('touch', isTap, actionsVisible);
    if (action === 'show-actions') setActionsVisible(true);
    if (action === 'open') onOpen();

    ignoreTouchClickRef.current = true;
    window.clearTimeout(ignoreClickTimeoutRef.current);
    ignoreClickTimeoutRef.current = window.setTimeout(() => {
      ignoreTouchClickRef.current = false;
    }, 800);
  }

  function handleClick(event) {
    if (ignoreTouchClickRef.current && event.nativeEvent.pointerType !== 'mouse') {
      event.preventDefault();
      ignoreTouchClickRef.current = false;
      window.clearTimeout(ignoreClickTimeoutRef.current);
      return;
    }
    onOpen();
  }

  return (
    <div className={`file-preview photo-preview${actionsVisible ? ' photo-actions-visible' : ''}`}>
      <button
        aria-label={`Открыть фотографию ${name}`}
        className="photo-open-button"
        onClick={handleClick}
        onPointerCancel={() => { pointerStartRef.current = null; }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        type="button"
      >
        <img src={imageUrl} alt="" loading="lazy" />
      </button>
      <div className="card-actions">
        <a href={downloadUrl} aria-label={`Скачать ${name}`} title="Скачать">
          <Icon name="download" size={17} />
        </a>
        <button
          aria-label={deleteLabel}
          disabled={deleteDisabled}
          onClick={onDelete}
          title="Удалить"
          type="button"
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
      <span className="photo-badge"><Icon name="image" size={15} /></span>
    </div>
  );
}

export default PhotoPreview;
