import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * PostgREST can only embed a nested resource across a real foreign key, and
 * `invoice_balances` is a view (deliberately — see migration 08, balances are
 * never a stored column), so `.select("...invoice_balances(...)")` on
 * `invoices` fails with PGRST200 ("no relationship found") rather than
 * returning an empty embed — it doesn't degrade, it errors, and a route that
 * doesn't check `error` sees a silently empty list instead.
 *
 * Fetch the view separately and merge in JS. Returns the same
 * `{ invoice_balances: [...] }` array-of-one shape a working embed would
 * have produced, so callers don't need to change.
 */
export async function attachInvoiceBalances<T extends { id: string }>(
  supabase: Supabase,
  invoices: T[],
): Promise<(T & { invoice_balances: { balance_due_paise: number; amount_paid_paise: number }[] })[]> {
  if (invoices.length === 0) return [];

  const { data: balances, error } = await supabase
    .from("invoice_balances")
    .select("invoice_id, balance_due_paise, amount_paid_paise")
    .in(
      "invoice_id",
      invoices.map((i) => i.id),
    );
  if (error) throw error;

  const byInvoiceId = new Map((balances ?? []).map((b) => [b.invoice_id, b]));

  return invoices.map((inv) => {
    const balance = byInvoiceId.get(inv.id);
    return {
      ...inv,
      invoice_balances: balance
        ? [{ balance_due_paise: balance.balance_due_paise ?? 0, amount_paid_paise: balance.amount_paid_paise ?? 0 }]
        : [],
    };
  });
}
