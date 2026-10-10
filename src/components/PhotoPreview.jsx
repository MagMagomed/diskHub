import Icon from './Icon.jsx';

function PhotoPreview({ name, imageUrl, onOpen }) {
  return (
    <div className="file-preview photo-preview">
      <button
        aria-label={`Открыть фотографию ${name}`}
        className="photo-open-button"
        onClick={onOpen}
        type="button"
      >
        <img src={imageUrl} alt="" loading="lazy" />
      </button>
      <span className="photo-badge"><Icon name="image" size={15} /></span>
    </div>
  );
}

export default PhotoPreview;
