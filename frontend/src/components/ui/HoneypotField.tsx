interface HoneypotFieldProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

export function HoneypotField({ name = 'website', value, onChange }: HoneypotFieldProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        opacity: 0,
        height: 0,
        overflow: 'hidden',
      }}
    >
      <label htmlFor={`hp-${name}`}>{name}</label>
      <input
        id={`hp-${name}`}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
