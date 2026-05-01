export function ActivityBars({
  data,
  width = 80,
  height = 22,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const barW = Math.max(1, width / data.length - 1);
  return (
    <svg width={width} height={height} className="block">
      {data.map((v, i) => {
        const ratio = v / max;
        const bh = Math.max(2, ratio * height);
        const color =
          ratio > 0.7
            ? "oklch(0.65 0.14 155)"
            : ratio > 0.3
              ? "oklch(0.60 0.08 250)"
              : "oklch(0.35 0.04 250)";
        return (
          <rect
            key={i}
            x={i * (barW + 1)}
            y={height - bh}
            width={barW}
            height={bh}
            rx={1}
            fill={color}
          />
        );
      })}
    </svg>
  );
}
