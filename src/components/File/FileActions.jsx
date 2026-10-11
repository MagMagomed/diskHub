import DownloadButton from '../Buttons/DownloadButton.jsx';
import DeleteButton from '../Buttons/DeleteButton.jsx';

/**
 * Общая группа ссылок/кнопок скачивания и удаления файла.
 * @param {object} props
 * @param {string} props.name Имя файла для доступных подписей действий.
 * @param {string} props.downloadUrl URL API, возвращающий содержимое файла.
 * @param {() => void} props.onDelete Обработчик удаления файла.
 * @param {string} [props.deleteLabel=`Удалить ${name}`] Переопределённая доступная подпись кнопки удаления.
 * @param {boolean} [props.deleteDisabled=false] Временно отключает удаление.
 * @param {string} [props.className=""] Дополнительный CSS-класс группы действий.
 * @param {number} [props.size=17] Размер иконок в пикселях.
 */
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
