/** The four AI assistants the palette's <select> offers. Must match
 *  AI_ASSISTANTS in `Fusion Smart Search.py`. */
export type AiAssistant = "chatgpt" | "claude" | "gemini" | "perplexity"

export interface ServicesState {
  youtube: boolean
  facebook: boolean
  google: boolean
  forums: boolean
  reddit: boolean
  ai: boolean
}

export type ServiceKey = keyof ServicesState

/** Order the service rows render in -- matches the original Palette.html. */
export const SERVICE_KEYS: ServiceKey[] = [
  "youtube",
  "facebook",
  "google",
  "forums",
  "reddit",
  "ai",
]

/** The full settings payload, mirroring `config.json` / DEFAULT_CONFIG in
 *  `Fusion Smart Search.py`, and what PUSH_STATE and savePreferences carry. */
export interface AppState {
  services: ServicesState
  ai_assistant: AiAssistant
  search_all_mode: boolean
}

export const DEFAULT_STATE: AppState = {
  services: {
    youtube: true,
    facebook: true,
    google: true,
    forums: true,
    reddit: true,
    ai: true,
  },
  ai_assistant: "chatgpt",
  search_all_mode: false,
}
