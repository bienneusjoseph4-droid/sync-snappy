import { createFileRoute } from "@tanstack/react-router";
import { publicApiOptionsResponse, updatePostStatus } from "@/lib/update-post-status";

export const Route = createFileRoute("/api/public/updatePostStatus")({
  server: {
    handlers: {
      OPTIONS: async () => publicApiOptionsResponse(),
      GET: async ({ request }) => updatePostStatus(request),
      POST: async ({ request }) => updatePostStatus(request),
      PATCH: async ({ request }) => updatePostStatus(request),
      PUT: async ({ request }) => updatePostStatus(request),
      DELETE: async ({ request }) => updatePostStatus(request),
    },
  },
});