/**
 * Кнопка с общим стилем основного действия; остальные атрибуты передаются HTML-кнопке.
 * @param {object} props Свойства компонента и атрибуты HTML-кнопки, передаваемые далее.
 * @param {import('react').ReactNode} props.children Текст или содержимое кнопки.
 * @param {string} [props.className=""] Дополнительные CSS-классы.
 * Остальные свойства HTML-кнопки, например onClick, type и disabled, передаются элементу напрямую.
 */
function PrimaryButton({ children, className = '', ...buttonProps }) {
  return (
    <button
      {...buttonProps}
      className={`primary-button${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
