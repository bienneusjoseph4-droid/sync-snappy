import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { BarChart3, CheckCircle2, XCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data: posts = [] } = await supabase.from("scheduled_posts").select("*");
      const list = posts ?? [];
      const successRate = list.length ? Math.round((list.filter(p => p.status === "posted").length / list.length) * 100) : 0;
      const chart = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const key = format(d, "yyyy-MM-dd");
        const dayPosts = list.filter(p => p.posted_at && format(new Date(p.posted_at), "yyyy-MM-dd") === key);
        return { day: format(d, "dd/MM"), posts: dayPosts.length };
      });
      return {
        total: list.length,
        posted: list.filter(p => p.status === "posted").length,
        failed: list.filter(p => p.status === "failed").length,
        scheduled: list.filter(p => p.status === "scheduled").length,
        successRate, chart,
      };
    },
  });

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Desempenho das suas postagens</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total" value={data?.total ?? 0} icon={BarChart3} />
        <MetricCard label="Publicados" value={data?.posted ?? 0} icon={CheckCircle2} accent="primary" />
        <MetricCard label="Falhas" value={data?.failed ?? 0} icon={XCircle} accent="destructive" />
        <MetricCard label="Taxa de sucesso" value={`${data?.successRate ?? 0}%`} icon={Clock} accent="accent" />
      </div>

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6">
        <h2 className="text-lg font-semibold mb-4">Postagens (últimos 7 dias)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.022 270)" />
              <XAxis dataKey="day" stroke="oklch(0.68 0.02 270)" fontSize={12} />
              <YAxis stroke="oklch(0.68 0.02 270)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.024 270)", border: "1px solid oklch(0.28 0.022 270)", borderRadius: 8 }} />
              <Bar dataKey="posts" fill="oklch(0.72 0.20 340)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}