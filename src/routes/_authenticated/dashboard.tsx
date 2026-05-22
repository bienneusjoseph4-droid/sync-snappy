import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CalendarClock, CheckCircle2, Users, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [posts, accounts] = await Promise.all([
        supabase.from("scheduled_posts").select("*").order("scheduled_at", { ascending: true }),
        supabase.from("tiktok_accounts").select("*"),
      ]);
      const list = posts.data ?? [];
      const accs = accounts.data ?? [];
      return {
        scheduled: list.filter(p => p.status === "scheduled").length,
        postedToday: list.filter(p => p.status === "posted" && p.posted_at && new Date(p.posted_at) >= today).length,
        accounts: accs.filter(a => a.status === "connected").length,
        failed: list.filter(p => p.status === "failed").length,
        upcoming: list.filter(p => p.status === "scheduled").slice(0, 5),
        accountsMap: Object.fromEntries(accs.map(a => [a.id, a])),
      };
    },
  });

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral das suas postagens</p>
        </div>
        <Link to="/schedule"><Button><Plus className="h-4 w-4 mr-2" />Novo agendamento</Button></Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Agendados" value={isLoading ? "—" : data!.scheduled} icon={CalendarClock} accent="accent" />
        <MetricCard label="Postados hoje" value={isLoading ? "—" : data!.postedToday} icon={CheckCircle2} accent="primary" trend="Últimas 24h" />
        <MetricCard label="Contas conectadas" value={isLoading ? "—" : data!.accounts} icon={Users} accent="primary" />
        <MetricCard label="Falhas" value={isLoading ? "—" : data!.failed} icon={XCircle} accent="destructive" />
      </div>

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6">
        <h2 className="text-lg font-semibold">Próximos agendamentos</h2>
        {!isLoading && data!.upcoming.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum post agendado ainda.</p>
            <Link to="/schedule"><Button className="mt-4" variant="outline">Agendar primeiro post</Button></Link>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {data?.upcoming.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-1">@{data!.accountsMap[p.account_id]?.username ?? "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{format(new Date(p.scheduled_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}