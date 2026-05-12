"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteCompanyAction, previewCompanyDeleteAction } from "./actions";

type Counts = {
  deals: number;
  signals: number;
  meetings: number;
  notes: number;
  tasks: number;
};

export function DeleteCompanyButton({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void previewCompanyDeleteAction({ companyId }).then((res) => {
      if (cancelled) return;
      if (res.ok) setCounts(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  async function onConfirm() {
    const result = await deleteCompanyAction({ companyId });
    if (result.ok) router.push("/companies");
    return result;
  }

  const description = counts
    ? buildDescription(companyName, counts)
    : `Counting related items for ${companyName}…`;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete company
      </Button>
      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${companyName}?`}
        description={description}
        onConfirm={onConfirm}
      />
    </>
  );
}

function buildDescription(name: string, c: Counts): string {
  const parts: string[] = [];
  if (c.deals) parts.push(`${c.deals} deal${c.deals === 1 ? "" : "s"}`);
  if (c.signals) parts.push(`${c.signals} signal${c.signals === 1 ? "" : "s"}`);
  if (c.meetings) parts.push(`${c.meetings} meeting${c.meetings === 1 ? "" : "s"}`);
  if (c.notes) parts.push(`${c.notes} note${c.notes === 1 ? "" : "s"}`);
  if (c.tasks) parts.push(`${c.tasks} task${c.tasks === 1 ? "" : "s"}`);
  if (parts.length === 0) {
    return `${name} will be permanently deleted. People at ${name} will remain but lose the company link.`;
  }
  return `${name} will be permanently deleted along with ${parts.join(", ")}. People at ${name} will remain but lose the company link. This cannot be undone.`;
}
