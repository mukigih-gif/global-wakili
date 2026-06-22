import type { MetadataRoute } from 'next';

const BASE = 'https://global-wakili-api.vercel.app';
const NOW = new Date().toISOString();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: NOW, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/legal/privacy`, lastModified: NOW, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified: NOW, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/legal/data-erasure`, lastModified: NOW, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
