/** Error raised when a wire value fails its strict decoder. */
export class WireTypeError extends TypeError {
  constructor(path: string, expected: string) {
    super(`${path}: expected ${expected}`);
    this.name = "WireTypeError";
  }
}
