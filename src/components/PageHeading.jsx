/**
 * Отображает заголовок страницы, поясняющий текст, действие и дополнительное содержимое.
 * @param {object} props
 * @param {string} props.eyebrow Короткая надстрочная подпись.
 * @param {string} props.title Основной заголовок страницы.
 * @param {string} props.subtitle Поясняющее описание.
 * @param {import('react').ReactNode} [props.action] Необязательный основной элемент действия.
 * @param {import('react').ReactNode} [props.children] Дополнительные элементы заголовка, например скрытый input.
 */
function PageHeading({ eyebrow, title, subtitle, action, children }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {action}
      {children}
    </div>
  );
}

export default PageHeading;
