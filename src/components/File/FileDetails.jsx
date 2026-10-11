import { formatDate, formatSize } from '../../utils/fileUtils.js';

/**
 * Показывает имя, размер, дату загрузки и необязательную подпись владельца файла.
 * @param {object} props
 * @param {string} props.name Исходное имя файла.
 * @param {number} props.size Размер файла в байтах.
 * @param {string|number|Date} props.uploadedAt Дата/время, пригодные для конструктора Date.
 * @param {string} [props.ownerLabel] Подпись владельца для административного списка.
 * @param {string} [props.ownerTitle] Полное значение атрибута title, обычно email владельца.
 */
function FileDetails({ name, size, uploadedAt, ownerLabel, ownerTitle }) {
  return (
    <div className="file-details">
      <strong title={name}>{name}</strong>
      {ownerLabel && <span className="admin-owner" title={ownerTitle}>{ownerLabel}</span>}
      <span>{formatSize(size)} <i>·</i> {formatDate(uploadedAt)}</span>
    </div>
  );
}

export default FileDetails;
