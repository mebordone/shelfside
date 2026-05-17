export class OpenLibraryHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenLibraryHttpError";
    this.status = status;
  }
}
