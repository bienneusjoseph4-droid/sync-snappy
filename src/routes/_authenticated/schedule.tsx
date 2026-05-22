import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Film, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/schedule")({ component: SchedulePage });

function SchedulePage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [accountId, setAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-select"],
    queryFn: async () => (await supabase.from("tiktok_accounts").select("id,username,status")).data ?? [],
  });

  const onDrop = (f: File) => {
    if (!f.type.startsWith("video/")) return toast.error("Apenas vídeos são aceitos");
    if (f.size > 500 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 500MB)");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Selecione um vídeo");
    if (!accountId) return toast.error("Selecione uma conta");
    if (!title || !date || !time) return toast.error("Preencha todos os campos");

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      setProgress(15);
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file);
      if (upErr) throw upErr;
      setProgress(70);
      const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const { error } = await supabase.from("scheduled_posts").insert({
        user_id: user.id, account_id: accountId,
        video_url: pub.publicUrl, video_path: path,
        title, hashtags, scheduled_at: scheduledAt, status: "scheduled",
      });
      if (error) throw error;
      setProgress(100);
      toast.success("Post agendado com sucesso!");
      navigate({ to: "/posts" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar");
    } finally {
      setSubmitting(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agendar postagem</h1>
        <p className="text-sm text-muted-foreground mt-1">Suba seu vídeo e defina o horário</p>
      </div>

      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onDrop(f); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-border bg-card/40 p-6 cursor-pointer hover:border-primary/60 transition flex flex-col items-center justify-center min-h-[320px]"
        >
          <input ref={inputRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onDrop(f); }} />
          {preview ? (
            <video src={preview} controls className="max-h-72 w-full rounded-xl" />
          ) : (
            <div className="text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="mt-3 font-medium">Arraste o vídeo aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar (até 500MB)</p>
            </div>
          )}
          {file && <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><Film className="h-3 w-3" />{file.name}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <Label>Conta TikTok</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.length === 0 && <SelectItem value="_none" disabled>Nenhuma conta. Adicione em /accounts</SelectItem>}
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} className="mt-1" /></div>
          <div><Label>Hashtags</Label><Textarea value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#viral #fyp" className="mt-1 min-h-20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" /></div>
            <div><Label>Hora</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1" /></div>
          </div>
          {progress > 0 && <Progress value={progress} />}
          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Agendar postagem
          </Button>
        </div>
      </form>
    </div>
  );
}