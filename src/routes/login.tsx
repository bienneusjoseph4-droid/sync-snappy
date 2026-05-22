import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  };

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error("Falha ao entrar com Google");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "radial-gradient(600px 400px at 30% 20%, oklch(0.72 0.20 340 / 0.25), transparent)" }} />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 backdrop-blur p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl" style={{ background: "var(--gradient-primary)" }} />
          <span className="font-semibold">TikTok Scheduler Pro</span>
        </div>
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="text-sm text-muted-foreground mt-1">Acesse seu painel de agendamentos</p>

        <Button onClick={onGoogle} variant="outline" className="w-full mt-6 h-11">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8C4.1 20.5 7.8 23 12 23z"/><path fill="#FBBC05" d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.6.4-2.3V6.9H2.3C1.5 8.5 1 10.2 1 12s.5 3.5 1.3 5.1L6 14.3z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.8 1 4.1 3.5 2.3 6.9L6 9.7c.9-2.5 3.2-4.3 6-4.3z"/></svg>
          Continuar com Google
        </Button>

        <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-border"/><span className="text-xs text-muted-foreground">ou</span><div className="h-px flex-1 bg-border"/></div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta? <Link to="/register" className="text-primary hover:underline">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}