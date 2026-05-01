import { requireSession } from "@/lib/session";

export default async function OnboardingPlaceholder() {
  const session = await requireSession();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">Almost there</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account ({session.user.email}) is signed in but not in any organization.
          Ask an admin to invite you, or run the seed script to attach yourself to the
          default organization.
        </p>
      </div>
    </div>
  );
}
