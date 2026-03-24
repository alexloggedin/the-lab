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

  /**
   * Fetch metadata for all files in batches of BATCH_SIZE.
   *
   * We use a `isCancelled` function (closure over the cancelled flag) rather
   * than checking the flag directly, because by the time the async loop
   * resumes after an await, the original `cancelled` variable may have been
   * reassigned by the cleanup function. Passing a getter makes it live.
   *
   * We update metaMap after each batch rather than waiting for all batches
   * to complete — this is the "progressive enhancement" pattern. Pills appear
   * on files as their metadata arrives, so the UI feels responsive even if
   * the vault has many files.
   */
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

  /**
   * Derive the filtered list from the current state.
   *
   * useMemo ensures this only recalculates when one of its three inputs
   * actually changes. Since filterFiles() is a pure function with no
   * side effects, this is safe and efficient.
   *
   * Reference: https://react.dev/reference/react/useMemo
   */
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
    <div>
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