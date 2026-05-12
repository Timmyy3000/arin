"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signUp } from "@/lib/auth-client";

export function SignUpForm({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await signUp.email({ name, email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Sign-up failed.");
      return;
    }
    router.replace(`/invite/${inviteToken}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="my-1 flex items-center gap-2.5 text-[11px] text-text-subtle">
        <div className="h-px flex-1 bg-border-subtle" />
        create your account
        <div className="h-px flex-1 bg-border-subtle" />
      </div>
      {error ? (
        <div
          className="rounded-md border px-2.5 py-2 text-[12px]"
          style={{
            color: "oklch(0.62 0.18 25)",
            background: "oklch(0.18 0.04 25 / 0.6)",
            borderColor: "oklch(0.25 0.08 25)",
          }}
        >
          {error}
        </div>
      ) : null}
      <div>
        <label className="mb-1.5 block text-[12px] text-text-muted">Name</label>
        <input
          type="text"
          autoComplete="name"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-[34px] w-full rounded-md border border-border bg-surface-hover px-2.5 text-[13px] text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] text-text-muted">Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-[34px] w-full rounded-md border border-border bg-surface-hover px-2.5 text-[13px] text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] text-text-muted">Password</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-[34px] w-full rounded-md border border-border bg-surface-hover px-2.5 text-[13px] text-text outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-9 rounded-md bg-accent text-[13px] font-medium text-white transition disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
