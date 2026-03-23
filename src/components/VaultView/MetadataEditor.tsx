import { useState } from 'react';
import { api } from '../../api/api';
import { METADATA_FIELDS } from '../../metadata/schema';
import type { FileMetadata } from '../../types';

interface Props {
  filePath: string;
  initialMeta: FileMetadata | null;
  onSave: (meta: FileMetadata) => void;
}

export default function MetadataEditor({ filePath, initialMeta, onSave }: Props) {
  // Local copy of metadata — edits stay local until Save is clicked
  const [draft, setDraft] = useState<FileMetadata>(initialMeta ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateMetadata(filePath, draft);
      onSave(draft);  // tell the parent to update its display
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Generic field updater — works for any key in FileMetadata
  const setField = (key: keyof FileMetadata, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="meta-editor">
      <div className="meta-editor-fields">
        {METADATA_FIELDS.map(field => (
          <div key={field.key} className="meta-field">
            <label className="meta-field-label">{field.label}</label>

            {field.type === 'number-range' && (
              <NumberRangeField
                value={draft[field.key] ?? ''}
                min={field.min ?? 0}
                max={field.max ?? 300}
                step={field.step ?? 1}
                onChange={val => setField(field.key, val)}
              />
            )}

            {field.type === 'multiselect' && (
              <MultiSelectField
                value={draft[field.key] ?? ''}
                options={field.options ?? []}
                onChange={val => setField(field.key, val)}
              />
            )}
            {field.type === 'select' && (
              <SingleSelectField
                value={draft[field.key] ?? ''}
                options={field.options ?? []}
                onChange={val => setField(field.key, val)}
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="meta-error">{error}</p>}

      <div className="meta-editor-actions">
        <button
          className="abtn primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'saving...' : 'save'}
        </button>
      </div>
    </div>
  );
}

// ---------------------- 

interface NumberRangeFieldProps {
  value: string;
  min: number;
  max: number;
  step: number;
  onChange: (val: string) => void;
}

function NumberRangeField({ value, min, max, step, onChange }: NumberRangeFieldProps) {
  const numVal = parseInt(value, 10);
  const displayVal = isNaN(numVal) ? '' : numVal;

  return (
    <div className="meta-number-range">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={isNaN(numVal) ? min : numVal}
        onChange={e => onChange(e.target.value)}
        className="meta-slider"
      />
      <input
        type="number"
        min={min}
        max={max}
        value={displayVal}
        onChange={e => onChange(e.target.value)}
        className="meta-number-input"
        placeholder="—"
      />
    </div>
  );
}

interface SelectFieldProps {
  value: string;      // comma-separated, e.g. "Electronic,Ambient"
  options: string[];
  onChange: (val: string) => void;
}


function SingleSelectField({ value, options, onChange }: SelectFieldProps) {


  const toggleOption = (option: string) => {
    onChange(option);
  };

  return (
    <div className="meta-multiselect">
      {options.map(option => (
        <button
          key={option}
          className={option ? 'meta-chip selected' : 'meta-chip'}
          onClick={() => toggleOption(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function MultiSelectField({ value, options, onChange }: SelectFieldProps) {
  // Parse the comma-separated string into a Set for O(1) lookups
  const selected = new Set(value ? value.split(',').map(s => s.trim()) : []);

  const toggleOption = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange([...next].join(','));
  };

  return (
    <div className="meta-multiselect">
      {options.map(option => (
        <button
          key={option}
          className={selected.has(option) ? 'meta-chip selected' : 'meta-chip'}
          onClick={() => toggleOption(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}