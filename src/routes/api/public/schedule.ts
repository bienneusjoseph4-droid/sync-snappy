import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/schedule — webhook for the external worker to update
// post status (queued | processing | posted | failed).
const Schema = z.object({
  post_id: z.string().uuid(),
  status: z.enum(["queued", "processing", "posted", "failed"]),
  error_log: z.string().max(2000).optional(),
  posted_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/public/schedule")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

        const { post_id, status, error_log, posted_at } = parsed.data;
        const update: Record<string, unknown> = { status };
        if (error_log) update.error_log = error_log;
        if (status === "posted") update.posted_at = posted_at ?? new Date().toISOString();

        const { error } = await supabaseAdmin.from("scheduled_posts").update(update as never).eq("id", post_id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});