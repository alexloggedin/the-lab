/**
 * METADATA SCHEMA
 * 
 * This is the single source of truth for what metadata fields exist.
 * To add a new field in the future:
 *   1. Add it to FileMetadata in src/types.ts
 *   2. Add a MetaFieldDef entry here
 *   3. The editor and pill rendering will pick it up automatically
 */

import { FileMetadata } from "../types";

export type FieldType = 'number-range' | 'multiselect' | 'text' | 'select';

export interface MetaFieldDef {
  key: keyof FileMetadata;          // must match a key in FileMetadata
  label: string;                    // display label
  type: FieldType;
  // For multiselect fields:
  options?: string[];
  // For number-range fields:
  min?: number;
  max?: number;
  step?: number;
}

export const METADATA_FIELDS: MetaFieldDef[] = [
  {
    key: 'bpm',
    label: 'BPM',
    type: 'number-range',
    min: 60,
    max: 220,
    step: 1,
  },
  {
    key: 'key',
    label: 'Key',
    type: 'select',
    options: [
      'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
      'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
      'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm',
      'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
    ],
  },
  {
    key: 'genre',
    label: 'Genre',
    type: 'multiselect',
    options: [
      'Electronic', 'Hip Hop', 'R&B', 'Jazz', 'Classical',
      'Ambient', 'Drum & Bass', 'House', 'Techno', 'Folk',
      'Rock', 'Pop', 'Soul', 'Funk', 'Reggae', 'Metal',
    ],
  },
];
