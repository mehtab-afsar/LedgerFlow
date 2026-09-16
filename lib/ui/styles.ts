/**
 * Shared class-name constants pulled out of the panel components, which each
 * declared their own byte-identical copy — consolidating them is what keeps
 * hover/focus/transition timing consistent everywhere at once instead of N
 * places to update in lockstep.
 */
export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-3 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand";

export const cardClass = "rounded-[10px] border border-line bg-white p-5";

export const buttonPrimaryClass =
  "rounded-md bg-brand px-4 py-2 text-[13.5px] font-medium text-white hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export const buttonSecondaryClass =
  "rounded-md border border-line bg-white px-4 py-2 text-[13.5px] font-medium text-ink hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
