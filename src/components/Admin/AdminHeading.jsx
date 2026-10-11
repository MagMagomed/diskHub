import Icon from '../Icon.jsx';

/**
 * Заголовочная область админ-панели с поиском по аккаунтам и файлам.
 * @param {object} props
 * @param {string} props.query Значение строки поиска.
 * @param {(query: string) => void} props.onQueryChange Передаёт новое значение запроса владельцу состояния.
 */
function AdminHeading({ query, onQueryChange }) {
  return (
    <>
      <div className="eyebrow">АДМИНИСТРИРОВАНИЕ</div>
      <div className="admin-heading">
        <div>
          <h1>Все данные приложения</h1>
          <p className="page-subtitle">Пользователи, их роли и файлы в личных хранилищах.</p>
        </div>
        <label className="search-box admin-search">
          <Icon name="search" size={18} />
          <input
            aria-label="Поиск пользователей и файлов"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Имя, почта или файл"
            value={query}
          />
        </label>
      </div>
    </>
  );
}

export default AdminHeading;
