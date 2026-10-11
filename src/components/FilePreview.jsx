import Icon from './Icon.jsx';
import FileActions from './FileActions.jsx';

function FilePreview({
  name,
  downloadUrl,
  onDelete,
  deleteLabel = `Удалить ${name}`,
  deleteDisabled = false,
}) {
  return (
    <div className="file-preview">
      <div className="file-type-icon"><Icon name="file" size={30} /></div>
      <FileActions
        name={name}
        downloadUrl={downloadUrl}
        onDelete={onDelete}
        deleteLabel={deleteLabel}
        deleteDisabled={deleteDisabled}
      />
    </div>
  );
}

export default FilePreview;
