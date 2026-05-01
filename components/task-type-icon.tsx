type TaskType = "call" | "email" | "linkedin" | "research" | "meeting" | "other";

export function TaskTypeIcon({
  type,
  size = 14,
}: {
  type: string | null | undefined;
  size?: number;
}) {
  const t = (type ?? "other") as TaskType;
  switch (t) {
    case "call":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path
            d="M2 3.5A1.5 1.5 0 013.5 2h.878a.75.75 0 01.71.504l.9 2.7a.75.75 0 01-.172.778L4.5 7.3a9.22 9.22 0 004.2 4.2l1.318-1.318a.75.75 0 01.778-.172l2.7.9a.75.75 0 01.504.71V14a1.5 1.5 0 01-1.5 1.5C6.596 15.5.5 9.404.5 3.5A1.5 1.5 0 012 2v1.5z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      );
    case "email":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1.5 5.5l6.5 4.5 6.5-4.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 2A1.5 1.5 0 102 3.5 1.5 1.5 0 003.5 2zm-1 3.5h2V14h-2zm3.5 0h2v1.4h.03A2.4 2.4 0 0110.2 5c2.2 0 2.6 1.45 2.6 3.33V14h-2V8.8c0-.8-.01-1.83-1.11-1.83s-1.29.87-1.29 1.77V14H6V5.5z" />
        </svg>
      );
    case "meeting":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 2v2M11 2v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "research":
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.5 9.5L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
  }
}
