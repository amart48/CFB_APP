/**
 * Scroll container for wide stat tables. Below the Figma desktop width the table scrolls
 * sideways inside a height-capped box, so the sticky header and first column both keep working.
 * At 1440px and up the table fits, so the page itself scrolls and the header sticks to the viewport.
 */
export function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-[calc(100dvh-7rem)] overflow-auto overscroll-x-contain min-[1440px]:max-h-none min-[1440px]:overflow-visible">
      {children}
    </div>
  );
}

/** Classes for the sticky first column (team / player) on narrow screens. */
export const STICKY_COL =
  "sticky left-0 z-[1] shadow-[1px_0_0_0_var(--color-border)] min-[1440px]:static min-[1440px]:shadow-none";
