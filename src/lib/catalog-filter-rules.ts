export function catalogPriceBounds(input: { min?: string; max?: string }) {
  const min = input.min ? Number(input.min) : 0,
    max = input.max ? Number(input.max) : 2147483647;
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max < 0 ||
    min > max ||
    max > 2147483647
  )
    return {
      min: 0,
      max: 0,
      error:
        "Khoảng giá không hợp lệ. Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.",
    };
  return { min, max, error: null };
}
