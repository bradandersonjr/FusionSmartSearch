import { useEffect, useState } from "react"
import {
  addMessageHandler,
  installMessageHandler,
  sendToPython,
  signalReady,
} from "@/lib/fusion-bridge"
import { DEFAULT_STATE } from "@/types"
import type { AppState } from "@/types"

/**
 * The settings state, kept in step with Python.
 *
 * PUSH_STATE is the only inbound message and always carries the whole
 * settings object -- there is no per-field update message, unlike
 * BradsUtilityToolbox's UTILITY_CHANGED, because this palette is one small
 * settings form rather than a list of rows that need independent repaint.
 */
export function useAppState() {
  const [state, setState] = useState<AppState | null>(null)
  // True once asking has been given up on, so the UI can say so instead of
  // showing a loading state for the rest of the session.
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const unsubscribe = addMessageHandler((action, dataJson) => {
      if (action !== "PUSH_STATE") return

      try {
        const next = JSON.parse(dataJson || "{}") as Partial<AppState>
        setState({
          services: { ...DEFAULT_STATE.services, ...next.services },
          ai_assistant: next.ai_assistant ?? DEFAULT_STATE.ai_assistant,
          search_all_mode: next.search_all_mode ?? DEFAULT_STATE.search_all_mode,
        })
        setTimedOut(false)
      } catch {
        // A malformed payload must not blank a working form.
      }
    })

    // The handler must exist before `ready` goes out, or Python's reply
    // arrives with nothing listening for it.
    installMessageHandler()
    const stopAsking = signalReady()

    // Slightly longer than signalReady's own retry budget, so this only fires
    // once asking has genuinely been given up on.
    const giveUp = setTimeout(() => setTimedOut(true), 8000)

    return () => {
      stopAsking()
      clearTimeout(giveUp)
      unsubscribe()
    }
  }, [])

  return { state, timedOut }
}

/** Persists the user's preferences. Python refreshes the QAT buttons and
 *  writes config.json in response; it does not echo a message back. */
export function savePreferences(state: AppState) {
  sendToPython("savePreferences", {
    services: state.services,
    ai_assistant: state.ai_assistant,
    search_all_mode: state.search_all_mode,
  })
}
