import { LucideIcon } from "lucide-react";

export function MetricCard({
  label, value, icon: Icon, trend, accent = "primary",
}: { label: string; value: string | number; icon: LucideIcon; trend?: string; accent?: "primary" | "accent" | "destructive" }) {
  const color = accent === "primary" ? "text-primary" : accent === "accent" ? "text-accent" : "text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 transition hover:border-primary/40">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
    </div>
  );
}