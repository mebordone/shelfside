export class TmdbHttpError extends Error {
  readonly status: number;
  readonly retryAfterSec?: number;

  constructor(message: string, status: number, retryAfterSec?: number) {
    super(message);
    this.name = "TmdbHttpError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

export class TmdbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TmdbConfigError";
  }
}
