import { requireSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await requireSession();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[520px] overflow-hidden rounded-xl border border-border bg-surface">
        <div className="px-7 pb-7 pt-5">
          <div className="mb-5 flex gap-1.5">
            {["Almost there", "", ""].map((s, i) => (
              <div key={i} className="flex-1">
                <div
                  className="mb-1.5 h-[2px] rounded"
                  style={{
                    background: i === 0 ? "var(--accent)" : "var(--border)",
                  }}
                />
                {s ? (
                  <div
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    {s}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <h2
            className="mb-1.5 text-[22px] font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Almost there.
          </h2>
          <p className="text-[13px] leading-relaxed text-text-muted">
            Your account ({session.user.email}) is signed in but isn&apos;t yet a member of
            any organization. Ask an admin to invite you, or run{" "}
            <code className="font-mono text-text">bun run seed</code> to attach yourself
            to the default organization.
          </p>
        </div>
      </div>
    </div>
  );
}
