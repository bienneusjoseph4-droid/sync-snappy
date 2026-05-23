import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const API_JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function isPublicApiRequest(request: Request): boolean {
  return new URL(request.url).pathname.startsWith("/api/public/");
}

function publicApiErrorResponse(error: string, status = 500): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: API_JSON_HEADERS,
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeServerResponse(request: Request, response: Response): Promise<Response> {
  const isPublicApi = isPublicApiRequest(request);
  const contentType = response.headers.get("content-type") ?? "";

  if (isPublicApi && response.status >= 300 && response.status < 400) {
    return publicApiErrorResponse("API route redirected unexpectedly", 502);
  }

  if (response.status < 500) {
    if (isPublicApi && !contentType.includes("application/json")) {
      return publicApiErrorResponse("API route returned non-JSON response", response.status >= 400 ? response.status : 500);
    }
    return response;
  }

  if (!contentType.includes("application/json")) {
    return isPublicApi ? publicApiErrorResponse("Internal API error") : response;
  }

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return isPublicApi ? publicApiErrorResponse("Internal API error") : brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeServerResponse(request, response);
    } catch (error) {
      console.error(error);
      if (isPublicApiRequest(request)) {
        return publicApiErrorResponse("Internal API error");
      }
      return brandedErrorResponse();
    }
  },
};
