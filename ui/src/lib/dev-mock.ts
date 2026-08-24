/**
 * The dev mock: a stand-in settings store for `npm run dev`.
 *
 * Its own module so production can drop it whole. fusion-bridge imports
 * this lazily behind `import.meta.env.DEV`, which Vite replaces with a
 * literal `false` when building, letting Rollup eliminate both the import
 * and everything below.
 */

import type { IncomingAction, OutgoingAction } from "./fusion-bridge"
import type { AiAssistant, AppState } from "@/types"
import { DEFAULT_STATE } from "@/types"

/** Handlers are owned by fusion-bridge; the mock is handed a dispatcher. */
type Dispatch = (action: IncomingAction, dataJson: string) => void

let dispatch: Dispatch = () => {}

/** Called once by fusion-bridge in dev, to wire the mock to its handlers. */
export function setMockDispatch(fn: Dispatch) {
  dispatch = fn
}

function deliver(action: IncomingAction, payload: unknown) {
  setTimeout(() => dispatch(action, JSON.stringify(payload)), 120)
}

// A fresh copy, not a reference to the shared DEFAULT_STATE -- so saves in
// dev mutate only this mock, not the constant every reload starts from.
const mockState: AppState = {
  services: { ...DEFAULT_STATE.services },
  ai_assistant: DEFAULT_STATE.ai_assistant,
  search_all_mode: DEFAULT_STATE.search_all_mode,
}

export function mockRespond(action: OutgoingAction, data: Record<string, unknown>) {
  if (action === "ready") {
    deliver("PUSH_STATE", mockState)
    return
  }

  if (action === "savePreferences") {
    // Mirrors what Python's savePreferences handler does, so a save in dev
    // is reflected if the mock state is read again (e.g. after a reload).
    const services = data.services as Partial<AppState["services"]> | undefined
    if (services) mockState.services = { ...mockState.services, ...services }
    if (typeof data.ai_assistant === "string") {
      mockState.ai_assistant = data.ai_assistant as AiAssistant
    }
    if (typeof data.search_all_mode === "boolean") {
      mockState.search_all_mode = data.search_all_mode
    }
  }

  // openUrl needs no mock response -- fusion-bridge's openUrl() already
  // falls back to window.open() outside Fusion.
}
