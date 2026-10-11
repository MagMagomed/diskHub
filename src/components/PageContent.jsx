/**
 * Контейнер содержимого страницы с общими отступами и шириной.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Содержимое страницы.
 */
function PageContent({ children }) {
  return <section className="page-content">{children}</section>;
}

export default PageContent;
