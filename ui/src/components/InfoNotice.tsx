import { Info } from "lucide-react"

/** Static explainer about how enabled services surface in the QAT. */
export function InfoNotice() {
  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold text-foreground">Quick Access Toolbar</p>
          <p className="text-xs text-muted-foreground">
            Enabled services will appear as buttons in the top right toolbar. Toggle off any
            services you don't use to keep your toolbar clean.
          </p>
        </div>
      </div>
    </div>
  )
}
