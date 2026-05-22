import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// GET /api/public/posts — used by the external Node+Playwright worker
// to fetch pending posts due for publication.
export const Route = createFileRoute("/api/public/posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status") ?? "scheduled";
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
        const { data, error } = await supabaseAdmin
          .from("scheduled_posts")
          .select("*, tiktok_accounts(username, session_data)")
          .eq("status", status)
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(limit);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ posts: data });
      },
    },
  },
});