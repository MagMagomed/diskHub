import Icon from './Icon.jsx';

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
