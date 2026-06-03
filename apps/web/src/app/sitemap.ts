import type { MetadataRoute } from 'next';

const BASE = 'https://globalwakili.co.ke';
const NOW = new Date().toISOString();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: NOW, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/legal/terms`, lastModified: NOW, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/legal/privacy`, lastModified: NOW, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/login`, lastModified: NOW, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
