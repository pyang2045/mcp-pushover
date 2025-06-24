export class PushoverError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errors?: string[]
  ) {
    super(message);
    this.name = 'PushoverError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}