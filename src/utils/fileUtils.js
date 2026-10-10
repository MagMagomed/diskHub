const categories = [
  { id: 'all', label: 'Все файлы' },
  { id: 'photos', label: 'Фотографии' },
  { id: 'other', label: 'Документы и другие' },
];

function isPhoto(name) {
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(name);
}

function filterFiles(files, category, query = '') {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru');
  return files.filter((file) => {
    const matchesCategory =
      category === 'all' || (category === 'photos' ? isPhoto(file.name) : !isPhoto(file.name));
    return matchesCategory && file.name.toLocaleLowerCase('ru').includes(normalizedQuery);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}


export { categories, isPhoto, filterFiles, formatSize, formatDate };
