type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
};

/** 28x16 switch with a text label, matching the Figma "Ranked teams filter". */
export function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="text-body text-fg focus-visible:outline-action flex h-10 items-center gap-2 rounded px-2 focus-visible:outline-2 lg:h-8 lg:w-37"
    >
      <span
        aria-hidden
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          checked ? "bg-action" : "bg-border"
        }`}
      >
        <span
          className={`bg-fg-winner absolute top-0.5 left-0.5 size-3 rounded-full transition-transform ${
            checked ? "translate-x-3" : ""
          }`}
        />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
