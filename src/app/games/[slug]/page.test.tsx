// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CfbdError } from "@/lib/cfbd/errors";
import GamePage from "./page";
import GameNotFound from "./not-found";

vi.mock("next/image", () => ({
  default: () => <span role="img" aria-label="logo" />,
}));
vi.mock("@/components/game/GameBody", () => ({
  GameBody: ({ game }: { game: { id: number } }) => (
    <div data-testid="body">{game.id}</div>
  ),
}));
const loadGame = vi.fn();
vi.mock("@/lib/cfbd/boxScoreLoader", () => ({
  loadGame: (...a: unknown[]) => loadGame(...a),
  loadBoxScore: vi.fn(),
}));

const call = (slug: string) =>
  GamePage({ params: Promise.resolve({ slug }) } as never);

/** Next's notFound() throws an error whose digest carries the 404. */
const expectNotFound = (p: Promise<unknown>) =>
  expect(p).rejects.toMatchObject({
    digest: expect.stringContaining("404"),
  });

beforeEach(() => {
  loadGame.mockReset();
});
afterEach(cleanup);

describe("game page", () => {
  it("404s a malformed slug without calling the API", async () => {
    for (const slug of [
      "not-a-game",
      "12abc-foo",
      "0-zero",
      "99999999999999999999-x",
    ]) {
      await expectNotFound(call(slug));
    }
    expect(loadGame).not.toHaveBeenCalled();
  });

  it("404s an id CFBD does not know", async () => {
    loadGame.mockResolvedValue(null);
    await expectNotFound(call("999999999-nobody-at-nowhere"));
    expect(loadGame).toHaveBeenCalledWith(999999999);
  });

  it("passes the numeric id, ignoring the team words", async () => {
    loadGame.mockResolvedValue({ id: 401862786 });
    render(await call("401862786-completely-wrong-words"));
    expect(loadGame).toHaveBeenCalledWith(401862786);
    expect(screen.getByTestId("body")).toHaveTextContent("401862786");
    expect(screen.getByRole("link", { name: /Scoreboard/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows a friendly error when the data layer fails", async () => {
    loadGame.mockRejectedValue(
      new CfbdError("network", "boom", { path: "/games" }),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(await call("401862786-a-at-b"));
    spy.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load this game",
    );
  });
});

describe("game not-found state", () => {
  it("offers the way back", () => {
    render(<GameNotFound />);
    expect(screen.getByText("Game not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Scoreboard" }),
    ).toHaveAttribute("href", "/");
  });
});
