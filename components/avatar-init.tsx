import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hueOf(name: string): number {
  const a = name.charCodeAt(0) || 0;
  const b = name.charCodeAt(1) || 0;
  return (a * 37 + b * 13) % 360;
}

export function Avatar({
  name = "?",
  size = 24,
  className,
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const hue = hueOf(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `oklch(0.30 0.08 ${hue})`,
        color: `oklch(0.80 0.08 ${hue})`,
        fontSize: size * 0.38,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarSquare({
  name = "?",
  size = 28,
  className,
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const hue = hueOf(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-[5px] font-bold tracking-wide",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `oklch(0.28 0.07 ${hue})`,
        color: `oklch(0.80 0.08 ${hue})`,
        fontSize: size * 0.36,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 3,
  size = 22,
}: {
  names: string[];
  max?: number;
  size?: number;
}) {
  const shown = names.slice(0, max);
  const more = names.length - max;
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => (
        <span
          key={`${n}-${i}`}
          className="relative inline-flex"
          style={{ marginLeft: i === 0 ? 0 : -size * 0.35, zIndex: shown.length - i }}
        >
          <Avatar name={n} size={size} />
        </span>
      ))}
      {more > 0 ? (
        <span
          className="relative inline-flex items-center justify-center rounded-full font-semibold text-text-muted"
          style={{
            width: size,
            height: size,
            background: "oklch(0.22 0.008 250)",
            fontSize: size * 0.36,
            marginLeft: -size * 0.35,
            zIndex: 0,
          }}
        >
          +{more}
        </span>
      ) : null}
    </span>
  );
}

export function CompanyLogo({
  name = "?",
  size = 24,
  className,
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const hue = (name.charCodeAt(0) * 53) % 360;
  const letter = (name[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[5px] font-bold",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `oklch(0.25 0.06 ${hue})`,
        color: `oklch(0.75 0.10 ${hue})`,
        fontSize: size * 0.52,
      }}
    >
      {letter}
    </span>
  );
}
