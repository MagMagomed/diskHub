/**
 * Семантический контейнер основной области приложения.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Содержимое основной области.
 */
function MainContent({ children }) {
  return <main className="main-content">{children}</main>;
}

export default MainContent;
