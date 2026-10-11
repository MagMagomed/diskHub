/**
 * Затемнённый фон диалога профиля; клик по самому фону закрывает диалог.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Содержимое диалогового окна.
 * @param {() => void} props.onClose Обработчик закрытия при клике вне окна.
 */
function ProfileDialogBackdrop({ children, onClose }) {
  return (
    <div
      className="profile-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

export default ProfileDialogBackdrop;
