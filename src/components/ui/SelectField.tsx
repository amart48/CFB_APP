import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Blue border and value, used when the control holds a non-default filter. */
  active?: boolean;
  className?: string;
};

/** Labelled dropdown. A native <select> sits invisibly on top so it stays accessible. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  active = false,
  className = "",
}: Props) {
  const current = options.find((o) => o.value === value);
  return (
    <label
      className={`bg-canvas focus-within:outline-action relative flex h-10 items-center gap-3 rounded border px-2.5 focus-within:outline-2 lg:h-8 ${
        active ? "border-action" : "border-border"
      } ${className}`}
    >
      <span className="text-label text-fg-muted tracking-wide uppercase">
        {label}
      </span>
      <span
        className={`text-body flex-1 truncate ${active ? "text-action" : "text-fg"}`}
      >
        {current?.label ?? value}
      </span>
      <ChevronDown size={14} className="text-fg-muted shrink-0" aria-hidden />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
