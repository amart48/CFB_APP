import { TeamSkeleton } from "@/components/team/TeamSkeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-col gap-5 px-4 pt-4 md:px-10">
      <TeamSkeleton />
    </main>
  );
}
