import Icon from '../Icon.jsx';

/**
 * Ссылка скачивания файла с иконкой и доступной подписью.
 * @param {object} props
 * @param {string} props.href URL API для скачивания файла.
 * @param {string} props.label Доступное имя ссылки, обычно содержит имя файла.
 * @param {number} [props.size=17] Размер SVG-иконки в пикселях.
 */
function DownloadButton({ href, label, size = 17 }) {
  return (
    <a href={href} aria-label={label} title="Скачать">
      <Icon name="download" size={size} />
    </a>
  );
}

export default DownloadButton;
