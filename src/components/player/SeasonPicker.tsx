"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { SelectField } from "@/components/ui/SelectField";

type Props = { seasons: number[]; season: number };

/** Season dropdown. The team is dropped from the URL so it follows the player's career stints. */
export function SeasonPicker({ seasons, season }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <div aria-busy={pending}>
      <SelectField
        className="w-full sm:w-46"
        label="Season"
        value={String(season)}
        options={[...seasons]
          .reverse()
          .map((s) => ({ value: String(s), label: String(s) }))}
        onChange={(v) =>
          startTransition(() =>
            router.replace(`${pathname}?season=${v}`, { scroll: false }),
          )
        }
      />
    </div>
  );
}
