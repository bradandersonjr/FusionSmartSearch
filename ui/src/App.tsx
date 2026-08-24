import { useEffect, useState } from "react"
import type { MouseEvent } from "react"

import { InfoNotice } from "@/components/InfoNotice"
import { SearchAllCard } from "@/components/SearchAllCard"
import { ServicesCard } from "@/components/ServicesCard"
import { Toast } from "@/components/Toast"
import { Button } from "@/components/ui/button"
import { useAppState, savePreferences } from "@/hooks/useAppState"
import { useFusionTheme } from "@/hooks/useFusionTheme"
import { openUrl } from "@/lib/fusion-bridge"
import { SERVICE_KEYS } from "@/types"
import type { AiAssistant, AppState, ServiceKey } from "@/types"

function App() {
  // Follow Fusion's UI theme. See fusion-bridge.ts: this add-in has no
  // theme.py to push PUSH_THEME, so this currently just confirms the
  // default (Dark Blue) data-theme -- kept wired for parity with the
  // reference and in case that module is added later.
  useFusionTheme()

  const { state } = useAppState()
  const [draft, setDraft] = useState<AppState | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Mirrors updateSettings() in the original Palette.html: every field is
  // overwritten whenever fresh state arrives from Python (initial load, or
  // the palette being reshown). This is a genuine external push arriving
  // asynchronously after mount, not a prop the render body could derive from
  // directly, so the effect is the right tool despite the lint rule's
  // default suspicion of setState-in-effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state) setDraft(state)
  }, [state])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  const handleSave = () => {
    if (!draft) return

    savePreferences(draft)

    const enabledCount = Object.values(draft.services).filter(Boolean).length
    const modeText = draft.search_all_mode ? " (Search All Mode)" : ""
    showToast(
      `Settings saved! ${enabledCount} service${enabledCount !== 1 ? "s" : ""} enabled${modeText}`
    )
  }

  // Ctrl/Cmd+S and bare Enter both save, matching the original page --
  // Enter is suppressed while focus is on a button or select so it doesn't
  // fight their own default behavior.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "s" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        handleSave()
      } else if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag !== "BUTTON" && tag !== "SELECT") {
          event.preventDefault()
          handleSave()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const toggleService = (key: ServiceKey, value: boolean) => {
    setDraft((current) =>
      current ? { ...current, services: { ...current.services, [key]: value } } : current
    )
  }

  // The master toggle drives every service switch together; each switch
  // changing separately keeps the master itself in sync (allOn below).
  const toggleAllServices = (value: boolean) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            services: Object.fromEntries(
              SERVICE_KEYS.map((key) => [key, value])
            ) as unknown as AppState["services"],
          }
        : current
    )
  }

  const handleOpenUrl = (url: string) => (event: MouseEvent) => {
    event.preventDefault()
    openUrl(url)
  }

  if (!draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        Loading settings…
      </div>
    )
  }

  // Derived, not stored: checked only when every individual service is on,
  // and toggling it drives all of them together via toggleAllServices.
  const allServicesOn = SERVICE_KEYS.every((key) => draft.services[key])

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-foreground">
            Fusion Smart Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Toggle services to show/hide toolbar buttons
          </p>
        </header>

        <SearchAllCard
          checked={draft.search_all_mode}
          onCheckedChange={(value) =>
            setDraft((current) => (current ? { ...current, search_all_mode: value } : current))
          }
        />

        <ServicesCard
          services={draft.services}
          allOn={allServicesOn}
          onToggleAll={toggleAllServices}
          onToggleService={toggleService}
          aiAssistant={draft.ai_assistant}
          onAiAssistantChange={(value: AiAssistant) =>
            setDraft((current) => (current ? { ...current, ai_assistant: value } : current))
          }
        />

        <InfoNotice />

        <Button className="h-11 w-full text-sm font-semibold shadow-sm" onClick={handleSave}>
          Save Settings
        </Button>

        <footer className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-xs text-muted-foreground">
            Made by{" "}
            <a
              href="https://www.bradandersonjr.com"
              onClick={handleOpenUrl("https://www.bradandersonjr.com")}
              className="cursor-pointer font-medium text-foreground underline hover:text-foreground/80"
            >
              @bradandersonjr
            </a>
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            If you'd like to support the project, you can go to my{" "}
            <a
              href="https://ko-fi.com/bradandersonjr"
              onClick={handleOpenUrl("https://ko-fi.com/bradandersonjr")}
              className="cursor-pointer font-medium text-foreground underline hover:text-foreground/80"
            >
              Ko-fi
            </a>
          </p>
        </footer>
      </div>

      <Toast message={toast} />
    </div>
  )
}

export default App
