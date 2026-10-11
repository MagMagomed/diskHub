/**
 * Сетка карточек файлов; класс можно заменить для административной раскладки.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Карточки файлов.
 * @param {string} [props.className="file-grid"] CSS-класс сетки.
 */
function FileGrid({ children, className = 'file-grid' }) {
  return <div className={className}>{children}</div>;
}

export default FileGrid;
