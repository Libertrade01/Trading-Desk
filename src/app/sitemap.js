import { PUBLIC_APP_URL } from "@/lib/legal";

export default function sitemap() {
  const lastModified = new Date("2026-07-14T00:00:00.000Z");
  return [
    { url: PUBLIC_APP_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${PUBLIC_APP_URL}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${PUBLIC_APP_URL}/terms`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${PUBLIC_APP_URL}/cookies`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}
