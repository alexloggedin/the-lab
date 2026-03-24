import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/api';
import FileRow from './FileRow';
import FilterBar from '../SearchView/FilterBar';
import { filterFiles, EMPTY_FILTER } from '../../metadata/filterFiles';
import type { VaultFile, FileMetadata } from '../../types';
import type { FilterState } from '../../metadata/filterFiles';

const BATCH_SIZE = 5;

export default function AllFilesView() {
  const [files, setFiles]         = useState<VaultFile[]>([]);
  const [metaMap, setMetaMap]     = useState<Record<string, FileMetadata>>({});
  const [filters, setFilters]     = useState<FilterState>(EMPTY_FILTER);
  const [loading, setLoading]     = useState(true);
  const [metaLoading, setMetaLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Step 1: fetch all files once on mount
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    api.getAllFiles()
      .then(res => {
        if (cancelled) return;
        const sorted = [...res.data].sort((a, b) => b.modified - a.modified);
        console.log('[AllFilesView] files loaded:', sorted.length);
        setFiles(sorted);
        setLoading(false);
        // Step 2: kick off batch metadata fetch immediately after files arrive
        fetchMetadataInBatches(sorted, () => cancelled);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[AllFilesView] load error:', err);
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const fetchMetadataInBatches = async (
    allFiles: VaultFile[],
    isCancelled: () => boolean
  ) => {
    setMetaLoading(true);

    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      if (isCancelled()) break;

      console.log(`[AllFilesView]: Fetching Metadata for batch: ${i}`)
      
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      const entries = await Promise.all(
        batch.map(f =>
          api.getMetadata(f.path)
            .then(r => [f.path, r.data] as [string, FileMetadata])
            .catch(() => [f.path, {}] as [string, FileMetadata])
        )
      );

      console.log(`[AllFilesView]: Fetched Metadata for batch: ${i}:`, entries)

      if (isCancelled()) break;

      setMetaMap(prev => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    }

    setMetaLoading(false);
  };

  const filteredFiles = useMemo(
    () => filterFiles(files, metaMap, filters),
    [files, metaMap, filters]
  );

  if (loading) {
    return <p className="muted">loading all files...</p>;
  }

  if (error) {
    return <p className="muted">could not load files: {error}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={filteredFiles.length}
        totalCount={files.length}
      />

      <div className="search-results">
        {metaLoading && (
          <p className="muted search-meta-status">loading metadata...</p>
        )}

        {!loading && filteredFiles.length === 0 ? (
          <p className="muted">no files match these filters.</p>
        ) : (
          filteredFiles.map(file => (
            <FileRow
              key={file.path}
              file={file}
              meta={metaMap[file.path] ?? null}
            />
          ))
        )}
      </div>
    </div>
  );
}