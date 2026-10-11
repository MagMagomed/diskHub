/**
 * Обёртка HTML-формы с общим стилем DiskHub; нативные свойства передаются форме.
 * @param {object} props Свойства компонента и атрибуты HTML-формы, передаваемые далее.
 * @param {import('react').ReactNode} props.children Поля, кнопки и содержимое формы.
 * @param {string} [props.className=""] Дополнительные CSS-классы формы.
 * Остальные нативные атрибуты формы, например onSubmit, autoComplete и noValidate, передаются элементу напрямую.
 */
function AuthForm({ children, className = '', ...formProps }) {
  return (
    <form
      {...formProps}
      className={`auth-form${className ? ` ${className}` : ''}`}
    >
      {children}
    </form>
  );
}

export default AuthForm;
