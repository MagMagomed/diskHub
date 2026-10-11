import Icon from './Icon.jsx';
import FileActions from './FileActions.jsx';

function PhotoPreview({
  name,
  imageUrl,
  downloadUrl,
  onOpen,
  onDelete,
  deleteLabel = `Удалить ${name}`,
  deleteDisabled = false,
}) {
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
      <FileActions
        name={name}
        downloadUrl={downloadUrl}
        onDelete={onDelete}
        deleteLabel={deleteLabel}
        deleteDisabled={deleteDisabled}
      />
      <span className="photo-badge"><Icon name="image" size={15} /></span>
    </div>
  );
}

export default PhotoPreview;
