import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// POST /api/public/connect-account — webhook for the external worker to
// store TikTok session data after a successful Playwright login.
const Schema = z.object({
  account_id: z.string().uuid(),
  status: z.enum(["connected", "disconnected", "error", "pending"]),
  session_data: z.record(z.string(), z.unknown()).optional(),
  display_name: z.string().max(200).optional(),
  avatar_url: z.string().url().max(500).optional(),
});

export const Route = createFileRoute("/api/public/connect-account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

        const { account_id, ...update } = parsed.data;
        const { error } = await supabaseAdmin.from("tiktok_accounts").update(update as never).eq("id", account_id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});