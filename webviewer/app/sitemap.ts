import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://openloom.live";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/technology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
