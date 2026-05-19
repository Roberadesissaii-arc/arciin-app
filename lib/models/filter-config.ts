import { CheckCircle2, Layers, Unplug } from "lucide-react"

export type ModelsFilterId = "all" | "connected" | "not-connected"

export const MODELS_FILTERS: {
  id: ModelsFilterId
  label: string
  icon: React.ElementType
}[] = [
  { id: "all", label: "All", icon: Layers },
  { id: "connected", label: "Connected", icon: CheckCircle2 },
  { id: "not-connected", label: "Not connected", icon: Unplug },
]
