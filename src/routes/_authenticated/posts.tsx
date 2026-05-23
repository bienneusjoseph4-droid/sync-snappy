import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Trash2, Search, Plus, ListVideo } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/posts")({ component: PostsPage });

function PostsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_posts").select("*, tiktok_accounts(username)").order("scheduled_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("scheduled_posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_posts" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const filtered = posts.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const remove = async (id: string) => {
    if (!confirm("Remover este post?")) return;
    const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts agendados</h1>
          <p className="text-sm text-muted-foreground mt-1">Fila de postagens e histórico</p>
        </div>
        <Link to="/schedule"><Button><Plus className="h-4 w-4 mr-2" />Novo</Button></Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Agendados</SelectItem>
            <SelectItem value="processing">Postando</SelectItem>
            <SelectItem value="posted">Publicados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background/40 border-b border-border">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Conta</th>
              <th className="px-4 py-3 font-medium">Agendado para</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Carregando…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                <ListVideo className="h-10 w-10 mx-auto mb-2 opacity-40" />Nenhum post encontrado
              </td></tr>
            )}
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-background/30">
                <td className="px-4 py-3 max-w-xs truncate font-medium">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">@{p.tiktok_accounts?.username ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.scheduled_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}