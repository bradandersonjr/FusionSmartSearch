import { CircleCheck } from "lucide-react"

import { cn } from "@/lib/utils"

interface ToastProps {
  message: string | null
}

/** Slides in from the right on a save, and back out a few seconds later --
 *  matching the original Palette.html's transform-based toast exactly, just
 *  driven by React state instead of direct DOM writes. */
export function Toast({ message }: ToastProps) {
  return (
    <div
      className={cn(
        "fixed top-6 right-6 z-50 flex min-w-64 items-center gap-3 rounded-xl bg-foreground px-5 py-4 text-background shadow-2xl transition-transform duration-300 ease-in-out",
        message ? "translate-x-0" : "translate-x-[200%]"
      )}
      role="status"
      aria-live="polite"
    >
      <CircleCheck className="h-6 w-6 shrink-0 text-emerald-400" aria-hidden="true" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
