import { PUBLIC_APP_URL } from "@/lib/legal";

export default function robots() {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/cookies"],
      disallow: [
        "/api/",
        "/analytics",
        "/assistant",
        "/desk",
        "/forgot-password",
        "/history",
        "/home",
        "/login",
        "/onboarding",
        "/plan",
        "/postmarket",
        "/premarket",
        "/process",
        "/prop-economics",
        "/reset-password",
        "/settings",
        "/signup",
        "/weekly-review",
        "/wiki",
        "/*-redesign",
        "/*-preview",
        "/*-options",
      ],
    }],
    sitemap: `${PUBLIC_APP_URL}/sitemap.xml`,
    host: PUBLIC_APP_URL,
  };
}
