import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://kvantm.tech";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/news", changefreq: "weekly", priority: "0.8" },
          { path: "/legal", changefreq: "monthly", priority: "0.5" },
          { path: "/terms", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "monthly", priority: "0.5" },
          { path: "/cookies", changefreq: "monthly", priority: "0.4" },
          { path: "/rules", changefreq: "monthly", priority: "0.6" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
