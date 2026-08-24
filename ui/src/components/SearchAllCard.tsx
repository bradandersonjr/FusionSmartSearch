import { Globe } from "lucide-react"

import { Switch } from "@/components/ui/switch"

interface SearchAllCardProps {
  checked: boolean
  onCheckedChange: (value: boolean) => void
}

/** The "one button searches everything" toggle, styled as its own accent
 *  card so it reads apart from the per-service list below it. */
export function SearchAllCard({ checked, onCheckedChange }: SearchAllCardProps) {
  return (
    <div className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <Globe className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold text-foreground">Search All Mode</div>
            <div className="text-xs text-muted-foreground">
              One button searches all enabled services at once
            </div>
          </div>
        </div>
        <Switch
          id="toggleSearchAll"
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label="Search All Mode"
        />
      </div>
    </div>
  )
}
