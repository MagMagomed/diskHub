import { useCallback, useMemo, useState } from 'react';
import { filesApi } from '../services/api.js';
import { filterFiles } from '../utils/fileUtils.js';

export function useFiles(onError) {
  const [files, setFiles] = useState([]);

  const loadFiles = useCallback(async () => {
    try {
      const response = await filesApi.list();
      if (!response.ok) throw new Error('Не удалось загрузить список файлов.');
      setFiles(await response.json());
      onError('');
    } catch (loadError) {
      onError(loadError.message);
    }
  }, [onError]);

  return { files, setFiles, loadFiles };
}

export function useFilteredFiles(files, category, query) {
  return useMemo(() => filterFiles(files, category, query), [category, files, query]);
}
