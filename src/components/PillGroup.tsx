interface PillGroupProps {
  options: readonly string[];
  isOn: (v: string) => boolean;
  onPick: (v: string) => void;
  counts?: Record<string, number>;
}

export function PillGroup({ options, isOn, onPick, counts }: PillGroupProps) {
  return (
    <div className="pills">
      {options.map((v) => (
        <button key={v} type="button" className={`pill${isOn(v) ? ' on' : ''}`} onClick={() => onPick(v)} aria-pressed={isOn(v)}>
          {v}
          {counts && counts[v] != null && <small>{counts[v]}</small>}
        </button>
      ))}
    </div>
  );
}
