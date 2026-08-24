import { useEffect } from "react"
import { onPythonMessage } from "@/lib/fusion-bridge"

/**
 * Keeps the UI on the same theme as Fusion.
 *
 * Fusion has three UI themes and all three are distinct: Light Gray, Dark Blue
 * (the default) and the hidden Dark Gray. The token blocks for each live in
 * src/index.css, selected by a data-theme attribute on <html>, and their
 * neutrals are read from Fusion's own theme files -- which is what makes a
 * docked palette match the panels beside it.
 *
 * Python owns the value. `lib/theme.py` resolves it and sends it two ways:
 * inside the PUSH_STATE payload, and as its own PUSH_THEME message when
 * `theme.watch()` sees the preference change. Fusion raises no theme-changed
 * event, so that watcher polls after each command.
 *
 * Outside Fusion (`npm run dev`) the mock reports dark-blue, which is also
 * what the bare :root block renders.
 */

export type FusionTheme = "light" | "dark-blue" | "dark-gray"

const THEMES: readonly FusionTheme[] = ["light", "dark-blue", "dark-gray"]
const DEFAULT_THEME: FusionTheme = "dark-blue"

export function applyTheme(name: string | undefined): FusionTheme {
  const theme = (THEMES as readonly string[]).includes(name ?? "")
    ? (name as FusionTheme)
    : DEFAULT_THEME

  const root = document.documentElement
  root.setAttribute("data-theme", theme)

  // shadcn's own convention, kept in sync so any `dark:` Tailwind variant in
  // the codebase resolves correctly rather than silently staying light.
  root.classList.toggle("dark", theme !== "light")

  return theme
}

export function useFusionTheme() {
  useEffect(() => {
    return onPythonMessage("PUSH_THEME", (dataJson) => {
      try {
        const { theme } = JSON.parse(dataJson) as { theme?: string }
        if (theme) applyTheme(theme)
      } catch {
        // A malformed payload must not blank the UI; the current theme stands.
      }
    })
  }, [])
}
