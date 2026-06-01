// Module augmentation — broadens jest-mock's MockInstance so that jest.fn()
// (which defaults to Mock<UnknownFunction>) doesn't produce
// "not assignable to parameter of type 'never'" errors.
// ResolveType<UnknownFunction> = never because `unknown` doesn't extend
// PromiseLike, so we add an overload that accepts `unknown` instead.
export {};

declare module 'jest-mock' {
  // Must match jest-mock's exact type-parameter signature for merging to work.
  interface MockInstance<T extends FunctionLike = UnknownFunction> {
    mockResolvedValueOnce(value: unknown): this;
    mockRejectedValueOnce(value: unknown): this;
    mockResolvedValue(value: unknown): this;
    mockRejectedValue(value: unknown): this;
    mockReturnValueOnce(value: unknown): this;
    mockReturnValue(value: unknown): this;
  }
}
