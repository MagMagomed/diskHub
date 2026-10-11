import Icon from '../Icon.jsx';
import FileActions from '../File/FileActions.jsx';

/**
 * Карточное превью фотографии с открытием просмотрщика и общими действиями файла.
 * @param {object} props
 * @param {string} props.name Имя фотографии.
 * @param {string} props.imageUrl URL изображения для элемента img.
 * @param {string} props.downloadUrl URL API для скачивания файла.
 * @param {() => void} props.onOpen Открывает фотографию в просмотрщике.
 * @param {() => void} props.onDelete Запускает удаление фотографии.
 * @param {string} [props.deleteLabel=`Удалить ${name}`] Переопределённая подпись удаления, например с именем владельца.
 * @param {boolean} [props.deleteDisabled=false] Блокирует кнопку удаления.
 */
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
