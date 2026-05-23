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

        const { post_id, status, error_log, posted_at } = parsed.data;
        const update: Record<string, unknown> = { status };
        if (error_log) update.error_log = error_log;
        if (status === "posted") update.posted_at = posted_at ?? new Date().toISOString();

        const { error } = await supabaseAdmin.from("scheduled_posts").update(update as never).eq("id", post_id);
        if (error) return jsonResponse({ success: false, error: error.message }, { status: 500 });
        return jsonResponse({ success: true, ok: true });
      },
    },
  },
});