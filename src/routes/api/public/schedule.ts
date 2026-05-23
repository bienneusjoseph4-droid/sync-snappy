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
  post_id: z.string().uuid().optional(),
  postId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  status: z.enum(["queued", "processing", "posted", "failed", "scheduled"]),
  error_log: z.string().max(2000).optional(),
  posted_at: z.string().datetime().optional(),
}).refine((d) => d.post_id || d.postId || d.id, {
  message: "post_id (or postId) is required",
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
        try {
          let body: unknown;
          try { body = await request.json(); } catch { return jsonResponse({ success: false, error: "Invalid JSON" }, { status: 400 }); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return jsonResponse({ success: false, error: parsed.error.flatten() }, { status: 400 });

          const { status, error_log, posted_at } = parsed.data;
          const postId = parsed.data.post_id ?? parsed.data.postId ?? parsed.data.id!;
          const update: Record<string, unknown> = { status };
          if (error_log) update.error_log = error_log;
          if (status === "posted") update.posted_at = posted_at ?? new Date().toISOString();

          const { error } = await supabaseAdmin.from("scheduled_posts").update(update as never).eq("id", postId);
          if (error) {
            console.error("[schedule] update error:", error);
            return jsonResponse({ success: false, error: error.message }, { status: 500 });
          }
          return jsonResponse({ success: true, ok: true });
        } catch (err) {
          console.error("[schedule] unexpected:", err);
          const message = err instanceof Error ? err.message : "Unexpected error";
          return jsonResponse({ success: false, error: message }, { status: 500 });
        }
      },
    },
  },
});