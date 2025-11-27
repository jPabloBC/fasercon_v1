import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://fasercon.cl/', lastModified: new Date() },
    { url: 'https://fasercon.cl/services/', lastModified: new Date() },
    { url: 'https://fasercon.cl/projects/', lastModified: new Date() },
    { url: 'https://fasercon.cl/dashboard/', lastModified: new Date() },
    { url: 'https://fasercon.cl/quote/', lastModified: new Date() },
    { url: 'https://fasercon.cl/about-us/', lastModified: new Date() },
    { url: 'https://fasercon.cl/products/', lastModified: new Date() },
    { url: 'https://fasercon.cl/clients/', lastModified: new Date() },
  ]
}
