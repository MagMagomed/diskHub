import Icon from './Icon.jsx';

function DownloadButton({ href, label, size = 17 }) {
  return (
    <a href={href} aria-label={label} title="Скачать">
      <Icon name="download" size={size} />
    </a>
  );
}

export default DownloadButton;
