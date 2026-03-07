import {
  Gavel, Scale, Users, Building2, Briefcase, Home,
  IndianRupee, Landmark, Lightbulb, Shield, Monitor, Leaf,
  Wallet, Handshake, Plane,
} from "lucide-react";
import { PRACTICE_AREAS } from "@nyay/shared";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  gavel: Gavel,
  scale: Scale,
  users: Users,
  building: Building2,
  briefcase: Briefcase,
  home: Home,
  "indian-rupee": IndianRupee,
  landmark: Landmark,
  lightbulb: Lightbulb,
  shield: Shield,
  monitor: Monitor,
  leaf: Leaf,
  wallet: Wallet,
  handshake: Handshake,
  plane: Plane,
};

interface PracticeAreaGridProps {
  selected: string[];
  onToggle: (id: string) => void;
  compact?: boolean;
}

export function PracticeAreaGrid({ selected, onToggle, compact }: PracticeAreaGridProps) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"}`}>
      {PRACTICE_AREAS.map((area) => {
        const Icon = ICON_MAP[area.icon] ?? Scale;
        const isSelected = selected.includes(area.id);
        return (
          <button
            key={area.id}
            type="button"
            onClick={() => onToggle(area.id)}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all duration-150 ${
              isSelected
                ? "border-navy-600 bg-navy-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-navy-200 hover:bg-navy-50"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-navy-500"}`} />
            <span className="truncate font-medium">{area.label}</span>
          </button>
        );
      })}
    </div>
  );
}
