export type CfbdErrorKind =
  | "config" // missing API key
  | "auth" // 401/403: bad key or tier
  | "rate-limit" // 429: monthly cap or burst limit
  | "http" // any other non-2xx
  | "network" // fetch itself failed
  | "parse"; // response did not match our schema

export class CfbdError extends Error {
  readonly kind: CfbdErrorKind;
  readonly status: number | null;
  readonly path: string;
  readonly retryAfterSeconds: number | null;

  constructor(
    kind: CfbdErrorKind,
    message: string,
    opts: { path: string; status?: number; retryAfterSeconds?: number } = {
      path: "",
    },
  ) {
    super(message);
    this.name = "CfbdError";
    this.kind = kind;
    this.path = opts.path;
    this.status = opts.status ?? null;
    this.retryAfterSeconds = opts.retryAfterSeconds ?? null;
  }

  /** Short, user-safe text for an error state. Never includes the key or raw bodies. */
  get userMessage(): string {
    switch (this.kind) {
      case "rate-limit":
        return "The stats provider's request limit has been reached. Try again later.";
      case "auth":
      case "config":
        return "The stats provider rejected our credentials.";
      case "network":
        return "Could not reach the stats provider.";
      default:
        return "The stats provider returned an unexpected response.";
    }
  }
}
