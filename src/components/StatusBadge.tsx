import { cn } from "@/lib/utils";

const map: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendado", cls: "bg-accent/15 text-accent border-accent/30" },
  queued: { label: "Na fila", cls: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  processing: { label: "Postando", cls: "bg-primary/15 text-primary border-primary/30 animate-pulse" },
  posted: { label: "Publicado", cls: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  connected: { label: "Conectada", cls: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  pending: { label: "Pendente", cls: "bg-chart-3/15 text-chart-3 border-chart-3/30" },
  disconnected: { label: "Desconectada", cls: "bg-muted text-muted-foreground border-border" },
  error: { label: "Erro", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span>;
}