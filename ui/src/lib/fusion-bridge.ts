/**
 * Fusion palette ↔ React bridge.
 *
 * The action names below are the contract with `Fusion Smart Search.py`.
 * Its `_ACTION_HANDLERS` dict is the authoritative list for JS → Python;
 * anything not in it is logged and dropped. Adding a message means adding it
 * in both places.
 *
 * Outside Fusion (`npm run dev`) a mock settings state is synthesised so the
 * UI can be worked on in a normal browser with hot reload. Adapted from the
 * identical file in BradsUtilityToolbox/ui, which this add-in's palette
 * follows for brand consistency across the author's Fusion add-ins.
 */

declare global {
  interface Window {
    fusionJavaScriptHandler?: { handle: (action: string, data: string) => string }
  }

  /**
   * Injected by Fusion's palette host into script scope -- declared here, and
   * NOT on Window, because it is not reliably a property of `window`. See
   * bridge() below.
   */
  const adsk: { fusionSendData?: (action: string, data: string) => void } | undefined
}

/**
 * Python → JS.
 *
 * PUSH_THEME is not currently sent -- this add-in has no theme-polling
 * module like BradsUtilityToolbox's lib/theme.py, so the palette renders
 * Fusion's default Dark Blue theme (the bare :root block in index.css) and
 * never repaints. The type is kept anyway so useFusionTheme.ts, copied
 * as-is from the reference, needs no edits and the palette picks up a real
 * theme push for free if that module is ever added here.
 */
export type IncomingAction = "PUSH_STATE" | "PUSH_THEME" | "response"

/** JS → Python. Must match `_ACTION_HANDLERS` in Fusion Smart Search.py. */
export type OutgoingAction = "ready" | "savePreferences" | "openUrl"

type MessageHandler = (action: string, dataJson: string) => void

const handlers = new Set<MessageHandler>()

/**
 * True when Fusion's bridge is present.
 *
 * Probes the bare `adsk` identifier rather than `window.adsk`: Fusion injects
 * `adsk` into script scope and it is NOT reliably a property of `window`.
 * Testing `window.adsk` yields a palette that renders perfectly and can never
 * call Python.
 */
function bridge(): { fusionSendData: (a: string, d: string) => void } | null {
  try {
    const injected = typeof adsk !== "undefined" ? adsk : undefined
    return injected && typeof injected.fusionSendData === "function"
      ? (injected as { fusionSendData: (a: string, d: string) => void })
      : null
  } catch {
    return null
  }
}

const isDev = () =>
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"

/** True inside Fusion, or in a local dev server. */
export const isFusion = () => bridge() !== null || isDev()

/** Sends one message to Python. Returns false when the bridge is down. */
export function sendToPython(action: OutgoingAction, data: Record<string, unknown> = {}): boolean {
  const host = bridge()
  if (!host) {
    // import.meta.env.DEV is a literal `false` in a production build, so the
    // mock and its import are eliminated rather than shipped.
    if (import.meta.env.DEV && isDev()) {
      void import("./dev-mock").then((mock) => {
        mock.setMockDispatch((incoming, dataJson) =>
          handlers.forEach((h) => h(incoming, dataJson))
        )
        mock.mockRespond(action, data)
      })
    }
    return false
  }

  host.fusionSendData(action, JSON.stringify(data))
  return true
}

/** Opens a URL in the real browser rather than inside the palette. */
export function openUrl(url: string) {
  // Python refuses anything that is not https, so the check is mirrored here
  // to fail visibly in dev rather than silently in Fusion.
  if (!url.startsWith("https://")) return

  if (bridge()) {
    sendToPython("openUrl", { url })
  } else {
    window.open(url, "_blank", "noopener")
  }
}

/** Registers a handler for messages from Python. Returns an unsubscribe fn. */
export function addMessageHandler(cb: MessageHandler): () => void {
  handlers.add(cb)
  return () => {
    handlers.delete(cb)
  }
}

/** Listens for one action from Python. Returns an unsubscribe fn. */
export function onPythonMessage(action: IncomingAction, cb: (dataJson: string) => void) {
  return addMessageHandler((incoming, dataJson) => {
    if (incoming === action) cb(dataJson)
  })
}

/**
 * Installs the global Fusion calls into. Call once, at startup.
 *
 * Fusion fires a synthetic `response` back after every sendInfoToHTML; it
 * carries no payload and is dropped here rather than in every handler.
 */
export function installMessageHandler() {
  window.fusionJavaScriptHandler = {
    handle(action: string, dataJson: string): string {
      if (action !== "response") {
        handlers.forEach((h) => h(action, dataJson))
      }
      return "" // Fusion expects a return value.
    },
  }
}

/**
 * Tells Python the page can receive messages; Python replies with PUSH_STATE.
 *
 * Retries until that reply arrives, because `ready` can be lost. Python's
 * `palettes.add()` starts loading this page BEFORE it wires the
 * incomingFromHTML handler on the next line, so a page that announces itself
 * quickly can land in that gap. `ready` is the only way to ask for state, so
 * a single lost message would leave the palette showing loading skeletons
 * forever -- which is exactly what it did.
 *
 * `_on_ready` in Fusion Smart Search.py is idempotent, so an extra `ready`
 * costs one repeated push and nothing else. Returns a cancel function.
 */
export function signalReady(): () => void {
  let attempts = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  // Python answers PUSH_STATE, which is the signal to stop asking.
  const stopListening = onPythonMessage("PUSH_STATE", () => cancel())

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    stopListening()
  }

  const ask = () => {
    sendToPython("ready")
    attempts += 1

    // Bounded: a palette that is genuinely unreachable should stop trying
    // rather than poll for the life of the session. ~6s total.
    if (attempts < 8) {
      timer = setTimeout(ask, attempts < 3 ? 250 : 1000)
    }
  }

  ask()
  return cancel
}
