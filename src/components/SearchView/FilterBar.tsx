import { METADATA_FIELDS } from '../../metadata/schema';
import { FilterState, EMPTY_FILTER, hasActiveFilters } from '../../metadata/filterFiles';

interface Props {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
  totalCount: number;
}

export default function FilterBar({ filters, onChange, resultCount, totalCount }: Props) {

  const update = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const clearAll = () => onChange({ ...EMPTY_FILTER });

  return (
    <div className="filter-bar">
      {/* Text search */}
      <div className="filter-search-row">
        <input
          type="text"
          className="filter-search-input"
          placeholder="search files..."
          value={filters.query}
          onChange={e => update({ query: e.target.value })}
        />
        {hasActiveFilters(filters) && (
          <button className="filter-clear-btn" onClick={clearAll}>
            clear
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="filter-count">
        {resultCount === totalCount
          ? `${totalCount} files`
          : `${resultCount} of ${totalCount} files`}
      </div>

      {/* Metadata filters — rendered from schema */}
      <div className="filter-sections">
        {METADATA_FIELDS.map(field => (
          <div key={field.key} className="filter-section">
            <div className="filter-section-label">{field.label}</div>

            {field.type === 'number-range' && (
              <BpmRangeFilter
                min={field.min ?? 60}
                max={field.max ?? 220}
                currentMin={filters.bpmMin}
                currentMax={filters.bpmMax}
                onChange={(min, max) => update({ bpmMin: min, bpmMax: max })}
              />
            )}

            {field.type === 'multiselect' && (
              <ChipFilter
                options={field.options ?? []}
                selected={filters[field.key === 'key' ? 'keys' : 'genres']}
                onChange={selected =>
                  update(
                    field.key === 'key'
                      ? { keys: selected }
                      : { genres: selected }
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BpmRangeFilterProps {
  min: number;
  max: number;
  currentMin: number | null;
  currentMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

function BpmRangeFilter({ min, max, currentMin, currentMax, onChange }: BpmRangeFilterProps) {
  return (
    <div className="bpm-range-filter">
      <input
        type="number"
        className="bpm-input"
        placeholder={String(min)}
        value={currentMin ?? ''}
        min={min}
        max={max}
        onChange={e => {
          const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
          onChange(val, currentMax);
        }}
      />
      <span className="bpm-separator">–</span>
      <input
        type="number"
        className="bpm-input"
        placeholder={String(max)}
        value={currentMax ?? ''}
        min={min}
        max={max}
        onChange={e => {
          const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
          onChange(currentMin, val);
        }}
      />
      <span className="bpm-unit">bpm</span>
    </div>
  );
}

interface ChipFilterProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function ChipFilter({ options, selected, onChange }: ChipFilterProps) {
  const selectedSet = new Set(selected);

  const toggle = (option: string) => {
    const next = new Set(selectedSet);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange([...next]);
  };

  return (
    <div className="chip-filter">
      {options.map(option => (
        <button
          key={option}
          className={selectedSet.has(option) ? 'filter-chip active' : 'filter-chip'}
          onClick={() => toggle(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}


