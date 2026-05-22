import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setName(data?.full_name ?? "");
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta</p>
      </div>
      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6 space-y-4">
        <div><Label>Email</Label><Input value={email} disabled className="mt-1" /></div>
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
        <Button onClick={save} disabled={loading}>Salvar</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6">
        <h2 className="font-semibold">Worker Externo</h2>
        <p className="text-sm text-muted-foreground mt-2">
          O sistema está preparado para se conectar a um worker Node.js + Playwright externo,
          que consumirá os endpoints públicos abaixo para receber as postagens agendadas:
        </p>
        <ul className="mt-3 space-y-1 text-xs font-mono text-muted-foreground">
          <li>POST /api/schedule — recebe novos agendamentos</li>
          <li>GET /api/posts — lista posts pendentes</li>
          <li>POST /api/connect-account — solicita conexão de conta</li>
        </ul>
      </div>
    </div>
  );
}