export function Sparkline({
  values,
  width = 80,
  height = 20,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className="opacity-40">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth={1} />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="text-primary/80">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.25} />
    </svg>
  );
}
