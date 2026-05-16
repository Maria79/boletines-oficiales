import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SourceBadgeProps {
  source: string;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    BOE: { label: "BOE", className: "bg-red-700 hover:bg-red-800 text-white" },
    BOC: { label: "BOC", className: "bg-emerald-700 hover:bg-emerald-800 text-white" },
    BOP_LPA: { label: "BOP Las Palmas", className: "bg-blue-600 hover:bg-blue-700 text-white" },
    BOP_TFE: { label: "BOP Tenerife", className: "bg-indigo-800 hover:bg-indigo-900 text-white" },
  };

  const current = config[source] || { label: source, className: "bg-gray-500 text-white" };

  return (
    <Badge className={cn("rounded-sm px-2 py-0.5 text-xs font-semibold", current.className, className)}>
      {current.label}
    </Badge>
  );
}
