import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-[340px]">
        <div className="mb-8 text-center">
          <span
            className="mb-3.5 inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.35 0.14 250)" }}
          >
            <span
              className="font-mono text-base font-bold"
              style={{ color: "oklch(0.85 0.12 250)" }}
            >
              A
            </span>
          </span>
          <div
            className="text-2xl font-semibold tracking-tight text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sign in to Arin
          </div>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
