import { createFileRoute } from "@tanstack/react-router";
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

// GET /api/public/posts — used by the external Node+Playwright worker
// to fetch pending posts due for publication.
export const Route = createFileRoute("/api/public/posts")({
  server: {
    handlers: {
      OPTIONS: async () => jsonResponse({ success: true }),
      GET: async ({ request }) => {
        const secret = request.headers.get("x-worker-secret");
        if (!secret || secret !== process.env.WORKER_SECRET) {
          return jsonResponse({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const status = url.searchParams.get("status") ?? "scheduled";
        const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
        const { data, error } = await supabaseAdmin
          .from("scheduled_posts")
          .select("*, tiktok_accounts(username, session_data)")
          .eq("status", status)
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(limit);
        if (error) return jsonResponse({ success: false, error: error.message }, { status: 500 });
        return jsonResponse({ success: true, posts: data ?? [] });
      },
      POST: async () => {
        return jsonResponse({ success: false, error: "Use GET /api/public/posts" }, { status: 405 });
      },
    },
  },
});