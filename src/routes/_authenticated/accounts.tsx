import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Trash2, Link as LinkIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/accounts")({ component: AccountsPage });

function AccountsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tiktok_accounts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addAccount = async () => {
    if (!username.trim()) return toast.error("Informe o username");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("tiktok_accounts").insert({
      user_id: user.id,
      username: username.replace(/^@/, ""),
      display_name: displayName || null,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Conta adicionada. Aguardando conexão do worker.");
    setOpen(false); setUsername(""); setDisplayName("");
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const removeAccount = async (id: string) => {
    const { error } = await supabase.from("tiktok_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Conta removida");
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const triggerConnect = async (id: string, username: string) => {
    toast.info("Solicitação de conexão enviada ao worker externo (placeholder)");
    // Placeholder: external Node+Playwright worker will hit /api/connect-account
    await supabase.from("tiktok_accounts").update({ status: "pending" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["accounts"] });
    console.log("connect requested", { id, username });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas TikTok</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas conectadas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Adicionar conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar conta TikTok</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Username</Label><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" className="mt-1" /></div>
              <div><Label>Nome (opcional)</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1" /></div>
              <p className="text-xs text-muted-foreground">A conexão real (cookies/sessão) será feita pelo worker externo Node.js + Playwright.</p>
            </div>
            <DialogFooter><Button onClick={addAccount}>Adicionar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando…</p> : accounts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/40 p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">Nenhuma conta ainda</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <div key={a.id} className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 transition hover:border-primary/40">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full shrink-0" style={{ background: "var(--gradient-primary)" }} />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">@{a.username}</p>
                    {a.display_name && <p className="text-xs text-muted-foreground truncate">{a.display_name}</p>}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {a.last_post_at ? `Última postagem: ${format(new Date(a.last_post_at), "dd/MM HH:mm", { locale: ptBR })}` : "Nenhuma postagem ainda"}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => triggerConnect(a.id, a.username)}>
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" />Conectar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeAccount(a.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}