import type { PlayerGameLog } from "@/lib/cfbd/models";
import { ppa } from "./format";
import { Panel } from "./Panel";

const SCALE = 0.5; // a PPA of +/-0.5 fills half the bar track

export function GameLogPanel({
  games,
  season,
  color,
}: {
  games: PlayerGameLog[];
  season: number;
  color: string;
}) {
  return (
    <Panel title="GAME LOG · PPA PER PLAY" sub={`${season} season`}>
      {games.length === 0 ? (
        <p className="text-table text-fg-muted px-4 py-6">
          No games with enough plays yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-170 table-fixed border-collapse">
            <caption className="sr-only">Per-game PPA</caption>
            <colgroup>
              <col style={{ width: 72 }} />
              <col style={{ width: 260 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col />
            </colgroup>
            <thead>
              <tr className="border-border text-label tracking-label text-fg-muted h-7.5 border-b">
                <th scope="col" className="pl-4 text-left font-normal">
                  WK
                </th>
                <th scope="col" className="text-left font-normal">
                  OPPONENT
                </th>
                <th scope="col" className="pr-2 text-right font-normal">
                  ALL
                </th>
                <th scope="col" className="pr-2 text-right font-normal">
                  PASS
                </th>
                <th scope="col" className="pr-2 text-right font-normal">
                  RUSH
                </th>
                <th scope="col" className="pl-6 text-left font-normal">
                  ALL PLAYS · 0 AT CENTER
                </th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const half = Math.min(1, Math.abs(g.ppaAll ?? 0) / SCALE) * 50;
                const negative = (g.ppaAll ?? 0) < 0;
                return (
                  <tr
                    key={g.week}
                    className="border-border h-8 border-b last:border-b-0"
                  >
                    <td className="text-table text-fg-muted pl-4 tabular-nums">
                      {g.week}
                    </td>
                    <td className="text-table text-fg">{g.opponent}</td>
                    <td className="text-table text-fg-winner pr-2 text-right tabular-nums">
                      {ppa(g.ppaAll)}
                    </td>
                    <td className="text-table text-fg pr-2 text-right tabular-nums">
                      {ppa(g.ppaPass)}
                    </td>
                    <td className="text-table text-fg pr-2 text-right tabular-nums">
                      {ppa(g.ppaRush)}
                    </td>
                    <td className="pr-8 pl-6">
                      <div
                        className="bg-border relative h-1.5 max-w-100 rounded-[1px]"
                        aria-hidden
                      >
                        <span
                          className="absolute top-0 h-1.5 rounded-[1px]"
                          style={{
                            width: `${half}%`,
                            left: negative ? `${50 - half}%` : "50%",
                            backgroundColor: color,
                            opacity: negative ? 0.45 : 1,
                          }}
                        />
                        <span className="bg-fg-muted absolute -top-1 left-1/2 h-3.5 w-px" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
