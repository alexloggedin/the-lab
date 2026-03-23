import type { VaultFile, FileMetadata } from '../types';

export interface FilterState {
  query: string;          // text search for file name
  bpmMin: number | null;  // null means "no filter"
  bpmMax: number | null;
  keys: string[];         // empty array means "no filter"
  genres: string[];
}

export const EMPTY_FILTER: FilterState = {
  query: '',
  bpmMin: null,
  bpmMax: null,
  keys: [],
  genres: [],
};

/**
 * Filter a list of files by the given criteria.
 * All active filters are ANDed together (a file must match ALL of them).
 *
 * This runs entirely in memory — no network calls.
 * With hundreds of files, this is effectively instant.
 */
export function filterFiles(
  files: VaultFile[],
  metaMap: Record<string, FileMetadata>,
  filters: FilterState
): VaultFile[] {
  return files.filter(file => {
    // 1. Text search: match against file name (case-insensitive)
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!file.name.toLowerCase().includes(q)) return false;
    }

    const meta = metaMap[file.path];

    // 2. BPM range filter
    if (filters.bpmMin !== null || filters.bpmMax !== null) {
      const bpm = parseInt(meta?.bpm ?? '', 10);
      if (isNaN(bpm)) return false;  // no BPM set → excluded when filtering by BPM
      if (filters.bpmMin !== null && bpm < filters.bpmMin) return false;
      if (filters.bpmMax !== null && bpm > filters.bpmMax) return false;
    }

    // 3. Key filter (multiselect — file must have at least one of the selected keys)
    if (filters.keys.length > 0) {
      const fileKeys = (meta?.key ?? '').split(',').map(k => k.trim());
      const hasKey = filters.keys.some(k => fileKeys.includes(k));
      if (!hasKey) return false;
    }

    // 4. Genre filter (same logic as key)
    if (filters.genres.length > 0) {
      const fileGenres = (meta?.genre ?? '').split(',').map(g => g.trim());
      const hasGenre = filters.genres.some(g => fileGenres.includes(g));
      if (!hasGenre) return false;
    }

    return true;
  });
}

/** Returns true if any filter is currently active */
export function hasActiveFilters(f: FilterState): boolean {
  return (
    f.query !== '' ||
    f.bpmMin !== null ||
    f.bpmMax !== null ||
    f.keys.length > 0 ||
    f.genres.length > 0
  );
}