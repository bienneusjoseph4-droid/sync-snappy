import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CalendarClock, Users, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-40"
        style={{ background: "radial-gradient(800px 400px at 20% 10%, oklch(0.72 0.20 340 / 0.25), transparent), radial-gradient(600px 400px at 80% 60%, oklch(0.72 0.18 200 / 0.20), transparent)" }} />

      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl" style={{ background: "var(--gradient-primary)" }} />
          <span className="font-semibold tracking-tight text-lg">TikTok Scheduler Pro</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/register"><Button>Começar grátis</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-20 pb-32 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Automação multi-contas
        </span>
        <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-tight">
          Agende posts no TikTok.
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            Em escala. No piloto automático.
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Conecte múltiplas contas, suba vídeos, defina horários e deixe o sistema postar por você. Tudo em um painel premium.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/register"><Button size="lg" className="h-12 px-8">Criar conta grátis</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline" className="h-12 px-8">Já tenho conta</Button></Link>
        </div>

        <div className="mt-24 grid md:grid-cols-4 gap-4 text-left">
          {[
            { icon: Users, title: "Multi contas", desc: "Gerencie todas suas contas TikTok em um só lugar." },
            { icon: CalendarClock, title: "Agendamento visual", desc: "Calendário e fila de postagens em tempo real." },
            { icon: Zap, title: "Automação 24/7", desc: "Worker dedicado posta no horário exato." },
            { icon: ShieldCheck, title: "Seguro", desc: "Sessões isoladas e dados criptografados." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur transition hover:border-primary/40">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
