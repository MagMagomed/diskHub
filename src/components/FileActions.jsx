import DownloadButton from './DownloadButton.jsx';
import DeleteButton from './DeleteButton.jsx';

function FileActions({
  name,
  downloadUrl,
  onDelete,
  deleteLabel = `Удалить ${name}`,
  deleteDisabled = false,
  className = '',
  size = 17,
}) {
  return (
    <div className={`card-actions${className ? ` ${className}` : ''}`}>
      <DownloadButton href={downloadUrl} label={`Скачать ${name}`} size={size} />
      <DeleteButton
        label={deleteLabel}
        onDelete={onDelete}
        disabled={deleteDisabled}
        size={size}
      />
    </div>
  );
}

export default FileActions;
