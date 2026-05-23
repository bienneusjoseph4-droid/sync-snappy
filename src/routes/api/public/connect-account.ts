import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

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
      OPTIONS: async () => jsonResponse({ success: true }),
      POST: async ({ request }) => {
        const secret = request.headers.get("x-worker-secret");
        if (!secret || secret !== process.env.WORKER_SECRET) {
          return jsonResponse({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        let body: unknown;
        try { body = await request.json(); } catch { return jsonResponse({ success: false, error: "Invalid JSON" }, { status: 400 }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return jsonResponse({ success: false, error: parsed.error.flatten() }, { status: 400 });

        const { account_id, ...update } = parsed.data;
        const { error } = await supabaseAdmin.from("tiktok_accounts").update(update as never).eq("id", account_id);
        if (error) return jsonResponse({ success: false, error: error.message }, { status: 500 });
        return jsonResponse({ success: true, ok: true });
      },
    },
  },
});