import Icon from '../Icon.jsx';
import FileActions from './FileActions.jsx';

/**
 * Превью документа/файла без изображения, включая скачивание и удаление.
 * @param {object} props
 * @param {string} props.name Исходное имя файла.
 * @param {string} props.downloadUrl URL API для скачивания содержимого.
 * @param {() => void} props.onDelete Обработчик удаления.
 * @param {string} [props.deleteLabel=`Удалить ${name}`] Доступная подпись кнопки удаления.
 * @param {boolean} [props.deleteDisabled=false] Блокирует удаление во время операции.
 */
function FilePreview({
  name,
  downloadUrl,
  onDelete,
  deleteLabel = `Удалить ${name}`,
  deleteDisabled = false,
}) {
  return (
    <div className="file-preview">
      <div className="file-type-icon"><Icon name="file" size={30} /></div>
      <FileActions
        name={name}
        downloadUrl={downloadUrl}
        onDelete={onDelete}
        deleteLabel={deleteLabel}
        deleteDisabled={deleteDisabled}
      />
    </div>
  );
}

export default FilePreview;
