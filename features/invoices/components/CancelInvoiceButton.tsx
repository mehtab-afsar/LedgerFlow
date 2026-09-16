"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CancelInvoiceButton({ invoiceId, invoiceNo }: { invoiceId: string; invoiceNo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirmCancel() {
    if (!reason.trim()) {
      toast.error("A reason is required to cancel an issued invoice");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not cancel this invoice");
      return;
    }
    toast.success(`${invoiceNo} cancelled`);
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-md border border-line bg-white px-4 py-2 text-[13.5px] font-medium text-alert hover:bg-alert-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert"
        >
          Cancel invoice
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {invoiceNo}?</AlertDialogTitle>
          <AlertDialogDescription>
            The invoice is marked cancelled and its balance no longer counts as outstanding. The service
            completions it billed become billable again — you can put them on a new invoice. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1">
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Reason</label>
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Raised against the wrong party"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-3 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirmCancel();
            }}
            disabled={saving}
          >
            {saving ? "Cancelling…" : "Confirm cancellation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
