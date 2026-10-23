export function chartDate(value: string, monthly = false) {
  const parts = value.split("-");
  return monthly
    ? `${parts[1]}/${parts[0]}`
    : `${parts[2]}/${parts[1]}/${parts[0]}`;
}
export const chartMoney = (value: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ₫`;
export function chartTicks(days: string[], monthly = false, plotSpan = 650) {
  const ticks: { day: string; index: number }[] = [];
  const minimumStep = Math.ceil(((monthly ? 72 : 90) * Math.max(1, days.length - 1)) / plotSpan);
  let previous = -minimumStep;
  for (let index = 0; index < days.length; index++) {
    const endpoint = index === 0 || index === days.length - 1;
    if (
      endpoint ||
      ((monthly || Number(days[index].slice(8)) % 5 === 0) &&
        index - previous >= minimumStep &&
        days.length - 1 - index >= minimumStep)
    ) {
      ticks.push({ day: days[index], index });
      previous = index;
    }
  }
  return ticks;
}
export function chartAxis(values: number[]) {
  const low = Math.min(0, ...values),
    high = Math.max(1, ...values),
    raw = (high - low) / 4,
    power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((n) => n * power >= raw) ?? 10) * power;
  const min = Math.floor(low / step) * step,
    max = Math.ceil(high / step) * step;
  const unit =
    Math.max(Math.abs(min), Math.abs(max)) >= 1e6
      ? 1e6
      : Math.max(Math.abs(min), Math.abs(max)) >= 1000
        ? 1000
        : 1;
  return {
    min,
    max,
    unit,
    unitLabel:
      unit === 1e6 ? "Triệu đồng" : unit === 1000 ? "Nghìn đồng" : "Đồng",
    ticks: Array.from(
      { length: Math.round((max - min) / step) + 1 },
      (_, i) => min + i * step,
    ),
  };
}
/** Monotone Hermite interpolation passes through every real sample without overshooting. */
export function revenuePath(points: number[][]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
  const slopes = points
    .slice(1)
    .map((p, i) => (p[1] - points[i][1]) / (p[0] - points[i][0]));
  const tangents = points.map((_, i) =>
    i === 0
      ? slopes[0]
      : i === points.length - 1
        ? slopes.at(-1)!
        : (slopes[i - 1] + slopes[i]) / 2,
  );
  for (let i = 0; i < slopes.length; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / slopes[i],
        b = tangents[i + 1] / slopes[i],
        norm = Math.hypot(a, b);
      if (a < 0) tangents[i] = 0;
      if (b < 0) tangents[i + 1] = 0;
      if (norm > 3) {
        tangents[i] = ((3 * a) / norm) * slopes[i];
        tangents[i + 1] = ((3 * b) / norm) * slopes[i];
      }
    }
  }
  return points.slice(1).reduce((path, p, i) => {
    const prev = points[i],
      dx = (p[0] - prev[0]) / 3;
    return (
      path +
      ` C ${prev[0] + dx},${prev[1] + dx * tangents[i]} ${p[0] - dx},${p[1] - dx * tangents[i + 1]} ${p[0]},${p[1]}`
    );
  }, `M ${points[0][0]},${points[0][1]}`);
}
