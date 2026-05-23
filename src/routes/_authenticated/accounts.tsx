import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Trash2, Link as LinkIcon, Users, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/accounts")({ component: AccountsPage });

const WORKER_URL_KEY = "tiktok_worker_url";
const DEFAULT_WORKER_URL = "http://localhost:3001";

function AccountsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [adding, setAdding] = useState(false);
  const [workerUrl, setWorkerUrl] = useState<string>(() =>
    (typeof window !== "undefined" && localStorage.getItem(WORKER_URL_KEY)) || DEFAULT_WORKER_URL,
  );
  const [workerOpen, setWorkerOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const saveWorkerUrl = (url: string) => {
    setWorkerUrl(url);
    if (typeof window !== "undefined") localStorage.setItem(WORKER_URL_KEY, url);
    toast.success("URL do worker salva");
    setWorkerOpen(false);
  };

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
    setAdding(true);
    const cleanUsername = username.replace(/^@/, "");
    const { data: inserted, error } = await supabase
      .from("tiktok_accounts")
      .insert({
        user_id: user.id,
        username: cleanUsername,
        display_name: displayName || null,
        status: "connecting",
      })
      .select()
      .single();
    if (error) {
      setAdding(false);
      return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["accounts"] });
    try {
      const res = await fetch(
        `${workerUrl}/test?username=${encodeURIComponent(cleanUsername)}&account_id=${inserted.id}`,
        { method: "GET", mode: "cors" },
      );
      if (!res.ok) throw new Error(`Worker respondeu ${res.status}`);
      const data: { success?: boolean; display_name?: string; avatar_url?: string } = await res
        .json()
        .catch(() => ({}));
      if (data.success !== false) {
        await supabase
          .from("tiktok_accounts")
          .update({
            status: "connected",
            ...(data.display_name ? { display_name: data.display_name } : {}),
            ...(data.avatar_url ? { avatar_url: data.avatar_url } : {}),
          })
          .eq("id", inserted.id);
        toast.success("Conta conectada", { description: "Sessão TikTok autenticada com sucesso." });
      } else {
        toast.info("Chrome aberto. Faça login no TikTok.");
      }
      setOpen(false);
      setUsername("");
      setDisplayName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao contatar worker";
      toast.error("Worker indisponível", {
        description: `${msg} — verifique se ${workerUrl} está rodando.`,
      });
      await supabase.from("tiktok_accounts").update({ status: "error" }).eq("id", inserted.id);
    } finally {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setAdding(false);
    }
  };

  const removeAccount = async (id: string) => {
    const { error } = await supabase.from("tiktok_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Conta removida");
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const triggerConnect = async (id: string, username: string) => {
    setBusyId(id);
    await supabase.from("tiktok_accounts").update({ status: "connecting" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["accounts"] });
    try {
      const res = await fetch(`${workerUrl}/test?username=${encodeURIComponent(username)}&account_id=${id}`, {
        method: "GET",
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Worker respondeu ${res.status}`);
      const data: { success?: boolean; display_name?: string; avatar_url?: string } = await res
        .json()
        .catch(() => ({}));
      if (data.success !== false) {
        await supabase
          .from("tiktok_accounts")
          .update({
            status: "connected",
            ...(data.display_name ? { display_name: data.display_name } : {}),
            ...(data.avatar_url ? { avatar_url: data.avatar_url } : {}),
          })
          .eq("id", id);
        qc.invalidateQueries({ queryKey: ["accounts"] });
        toast.success("Conta conectada");
      } else {
        toast.info("Chrome aberto. Faça login no TikTok.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao contatar worker";
      toast.error("Worker indisponível", { description: `${msg} — verifique se ${workerUrl} está rodando.` });
      await supabase.from("tiktok_accounts").update({ status: "error" }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } finally {
      setBusyId(null);
    }
  };

  const verifySession = async (id: string, username: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`${workerUrl}/status?username=${encodeURIComponent(username)}&account_id=${id}`, {
        method: "GET",
        mode: "cors",
      });
      if (!res.ok) throw new Error(`Worker respondeu ${res.status}`);
      const data: { connected?: boolean; display_name?: string; avatar_url?: string } = await res.json().catch(() => ({}));
      const newStatus = data.connected ? "connected" : "disconnected";
      await supabase
        .from("tiktok_accounts")
        .update({
          status: newStatus,
          ...(data.display_name ? { display_name: data.display_name } : {}),
          ...(data.avatar_url ? { avatar_url: data.avatar_url } : {}),
        })
        .eq("id", id);
      qc.invalidateQueries({ queryKey: ["accounts"] });
      data.connected ? toast.success("Sessão ativa — conta conectada") : toast.warning("Sessão não encontrada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao verificar sessão";
      toast.error("Não foi possível verificar", { description: msg });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas TikTok</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas conectadas</p>
        </div>
        <div className="flex gap-2">
        <Dialog open={workerOpen} onOpenChange={setWorkerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Settings2 className="h-4 w-4 mr-2" />Worker</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>URL do Worker Playwright</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Endpoint base</Label>
              <Input defaultValue={workerUrl} onChange={e => setWorkerUrl(e.target.value)} placeholder="http://localhost:3001" />
              <p className="text-xs text-muted-foreground">Endpoints esperados: <code>GET /test</code> (abre Chrome + login) e <code>GET /status</code> (retorna {`{ connected: boolean }`}).</p>
            </div>
            <DialogFooter><Button onClick={() => saveWorkerUrl(workerUrl)}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Adicionar conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar conta TikTok</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Username</Label><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" className="mt-1" /></div>
              <div><Label>Nome (opcional)</Label><Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1" /></div>
              <p className="text-xs text-muted-foreground">A conexão real (cookies/sessão) será feita pelo worker externo Node.js + Playwright.</p>
            </div>
            <DialogFooter>
              <Button onClick={addAccount} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                {adding ? "Abrindo Chrome…" : "Adicionar e conectar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="col-span-2 text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                  disabled={busyId === a.id}
                  onClick={() => triggerConnect(a.id, a.username)}
                >
                  {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5 mr-1.5" />}
                  Conectar Conta
                </Button>
                <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => verifySession(a.id, a.username)}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busyId === a.id ? "animate-spin" : ""}`} />Verificar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeAccount(a.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1.5" />Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}