import Icon from '../Icon.jsx';

/**
 * Кнопка удаления с доступной подписью и необязательной блокировкой.
 * @param {object} props
 * @param {string} props.label Доступное имя кнопки, обычно включает имя удаляемого файла.
 * @param {() => void} props.onDelete Обработчик нажатия; сам компонент не выполняет удаление.
 * @param {boolean} [props.disabled=false] Блокирует кнопку на время операции.
 * @param {number} [props.size=17] Размер SVG-иконки в пикселях.
 */
function DeleteButton({ label, onDelete, disabled = false, size = 17 }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onDelete}
      title="Удалить"
      type="button"
    >
      <Icon name="trash" size={size} />
    </button>
  );
}

export default DeleteButton;
