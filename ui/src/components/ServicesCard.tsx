import type { ComponentType } from "react"
import { Chrome, Facebook, MessageCircle, Sparkles, Users, Youtube } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { AiAssistant, ServiceKey, ServicesState } from "@/types"

interface ServiceMeta {
  key: Exclude<ServiceKey, "ai">
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
}

// Order and copy match the original Palette.html. Lucide has no Google or
// Reddit brand marks (icon sets generally omit multi-colour logos), so
// Chrome and Users stand in, tinted with each service's brand colour.
const SERVICES: ServiceMeta[] = [
  {
    key: "youtube",
    label: "YouTube",
    description: "Search videos on YouTube",
    icon: Youtube,
    iconClassName: "text-red-500",
  },
  {
    key: "facebook",
    label: "Facebook",
    description: "Search posts on Facebook",
    icon: Facebook,
    iconClassName: "text-blue-500",
  },
  {
    key: "google",
    label: "Google",
    description: "Search the web with Google",
    icon: Chrome,
    iconClassName: "text-emerald-500",
  },
  {
    key: "forums",
    label: "Autodesk Forums",
    description: "Search Autodesk community forums",
    icon: MessageCircle,
    iconClassName: "text-orange-500",
  },
  {
    key: "reddit",
    label: "Reddit",
    description: "Search discussions on Reddit",
    icon: Users,
    iconClassName: "text-orange-400",
  },
]

const AI_ASSISTANTS: { value: AiAssistant; label: string }[] = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "claude", label: "Claude" },
  { value: "gemini", label: "Gemini" },
  { value: "perplexity", label: "Perplexity" },
]

interface ServicesCardProps {
  services: ServicesState
  allOn: boolean
  onToggleAll: (value: boolean) => void
  onToggleService: (key: ServiceKey, value: boolean) => void
  aiAssistant: AiAssistant
  onAiAssistantChange: (value: AiAssistant) => void
}

export function ServicesCard({
  services,
  allOn,
  onToggleAll,
  onToggleService,
  aiAssistant,
  onAiAssistantChange,
}: ServicesCardProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Search Services
        </span>
        <Switch
          id="toggleAllServices"
          checked={allOn}
          onCheckedChange={onToggleAll}
          aria-label="Toggle all services"
        />
      </CardHeader>

      <CardContent className="pt-0">
        {SERVICES.map(({ key, label, description, icon: Icon, iconClassName }) => (
          <div
            key={key}
            className="flex items-center justify-between border-b border-border py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </div>
            <Switch
              id={`toggle-${key}`}
              checked={services[key]}
              onCheckedChange={(value) => onToggleService(key, value)}
              aria-label={label}
            />
          </div>
        ))}

        {/* AI Assistant row -- a switch plus a select, same as the other
            rows but with its picker underneath, matching Palette.html. */}
        <div className="py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold text-foreground">AI Assistant</div>
                <div className="text-xs text-muted-foreground">
                  Choose your preferred AI assistant
                </div>
              </div>
            </div>
            <Switch
              id="toggleAI"
              checked={services.ai}
              onCheckedChange={(value) => onToggleService("ai", value)}
              aria-label="AI Assistant"
            />
          </div>
          <div className="pl-8">
            <Select value={aiAssistant} onValueChange={(v) => onAiAssistantChange(v as AiAssistant)}>
              <SelectTrigger id="aiAssistant" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_ASSISTANTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
