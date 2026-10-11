/**
 * Карточка одного файла в пользовательской или административной сетке.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Превью и метаданные одного файла.
 */
function FileCard({ children }) {
  return <article className="file-card">{children}</article>;
}

export default FileCard;
