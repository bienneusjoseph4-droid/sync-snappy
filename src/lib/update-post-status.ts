import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Worker-Secret, x-worker-secret, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  ...CORS_HEADERS,
};

const UpdatePostStatusSchema = z.object({
  post_id: z.string().uuid().optional(),
  postId: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  status: z.enum(["queued", "processing", "posted", "failed", "scheduled"]),
  error: z.string().max(2000).optional(),
  error_log: z.string().max(2000).optional(),
  posted_at: z.string().datetime().optional(),
}).refine((data) => data.post_id || data.postId || data.id, {
  message: "postId is required",
});

type JsonBody = { success: boolean; error?: string } | Record<string, unknown>;

export function jsonApiResponse(body: JsonBody, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export function publicApiOptionsResponse() {
  return jsonApiResponse({ success: true }, { status: 200 });
}

function getWorkerSecretFromRequest(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return request.headers.get("x-worker-secret") ?? bearer ?? null;
}

export async function updatePostStatus(request: Request) {
  const requestId = crypto.randomUUID();
  const method = request.method.toUpperCase();
  console.info("[updatePostStatus] request received", { requestId, method, url: request.url });

  try {
    if (!process.env.WORKER_SECRET) {
      console.error("[updatePostStatus] missing WORKER_SECRET", { requestId });
      return jsonApiResponse({ success: false, error: "Server configuration error" }, { status: 500 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[updatePostStatus] missing backend environment", {
        requestId,
        hasUrl: Boolean(process.env.SUPABASE_URL),
        hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
      return jsonApiResponse({ success: false, error: "Server configuration error" }, { status: 500 });
    }

    if (!["POST", "PATCH", "PUT"].includes(method)) {
      return jsonApiResponse({ success: false, error: "Method not allowed" }, { status: 405 });
    }

    const providedSecret = getWorkerSecretFromRequest(request);
    if (!providedSecret || providedSecret !== process.env.WORKER_SECRET) {
      console.warn("[updatePostStatus] unauthorized request", { requestId, method });
      return jsonApiResponse({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return jsonApiResponse({ success: false, error: "Request body is required" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.warn("[updatePostStatus] invalid JSON body", { requestId, error });
      return jsonApiResponse({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = UpdatePostStatusSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[updatePostStatus] validation failed", { requestId, issues: parsed.error.issues });
      return jsonApiResponse({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const postId = parsed.data.post_id ?? parsed.data.postId ?? parsed.data.id!;
    const nextStatus = parsed.data.status;
    const errorLog = parsed.data.error_log ?? parsed.data.error;

    const { data: existingPost, error: lookupError } = await supabaseAdmin
      .from("scheduled_posts")
      .select("id,status")
      .eq("id", postId)
      .maybeSingle();

    if (lookupError) {
      console.error("[updatePostStatus] post lookup failed", { requestId, postId, error: lookupError });
      return jsonApiResponse({ success: false, error: lookupError.message }, { status: 500 });
    }

    if (!existingPost) {
      console.warn("[updatePostStatus] post not found", { requestId, postId });
      return jsonApiResponse({ success: false, error: "Post not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    if (errorLog !== undefined) update.error_log = errorLog;
    if (nextStatus === "posted") update.posted_at = parsed.data.posted_at ?? new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("scheduled_posts")
      .update(update as never)
      .eq("id", postId);

    if (updateError) {
      console.error("[updatePostStatus] database update failed", { requestId, postId, nextStatus, error: updateError });
      return jsonApiResponse({ success: false, error: updateError.message }, { status: 500 });
    }

    console.info("[updatePostStatus] post status updated", {
      requestId,
      postId,
      previousStatus: existingPost.status,
      nextStatus,
    });

    return jsonApiResponse({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[updatePostStatus] unexpected error", { requestId, error });
    return jsonApiResponse({ success: false, error: message }, { status: 500 });
  }
}