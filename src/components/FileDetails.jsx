import { formatDate, formatSize } from '../utils/fileUtils.js';

function FileDetails({ name, size, uploadedAt, ownerLabel, ownerTitle }) {
  return (
    <div className="file-details">
      <strong title={name}>{name}</strong>
      {ownerLabel && <span className="admin-owner" title={ownerTitle}>{ownerLabel}</span>}
      <span>{formatSize(size)} <i>·</i> {formatDate(uploadedAt)}</span>
    </div>
  );
}

export default FileDetails;
