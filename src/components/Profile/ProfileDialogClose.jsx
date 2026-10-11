import Icon from '../Icon.jsx';

/**
 * Кнопка закрытия диалога профиля.
 * @param {object} props
 * @param {() => void} props.onClose Закрывает диалог.
 */
function ProfileDialogClose({ onClose }) {
  return (
    <button
      aria-label="Закрыть"
      className="profile-dialog-close"
      onClick={onClose}
      type="button"
    >
      <Icon name="close" size={18} />
    </button>
  );
}

export default ProfileDialogClose;
