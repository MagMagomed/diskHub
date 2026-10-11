/**
 * Заголовок диалога профиля, связанный с диалогом через атрибут id.
 * @param {object} props
 * @param {string} props.id Уникальный DOM id для aria-labelledby.
 * @param {import('react').ReactNode} props.children Текст заголовка.
 */
function ProfileDialogTitle({ id, children }) {
  return <h2 id={id}>{children}</h2>;
}

export default ProfileDialogTitle;
