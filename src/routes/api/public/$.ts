import { createFileRoute } from "@tanstack/react-router";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Worker-Secret, x-worker-secret, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

function notFound() {
  return new Response(
    JSON.stringify({ success: false, error: "API route not found" }),
    { status: 404, headers: JSON_HEADERS },
  );
}

export const Route = createFileRoute("/api/public/$")({
  server: {
    handlers: {
      GET: async () => notFound(),
      POST: async () => notFound(),
      PUT: async () => notFound(),
      PATCH: async () => notFound(),
      DELETE: async () => notFound(),
      OPTIONS: async () => notFound(),
    },
  },
});