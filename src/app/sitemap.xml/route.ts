// src/app/sitemap.xml/route.ts

export async function GET() {
  const baseUrl = "https://hijabtryon.com";

  const urls = [
    { loc: baseUrl, priority: "1.0", changefreq: "monthly" },
    { loc: `${baseUrl}/auth/sign-in`, priority: "0.3", changefreq: "yearly" },
    { loc: `${baseUrl}/auth/sign-up`, priority: "0.5", changefreq: "yearly" },
    { loc: `${baseUrl}/dashboard`, priority: "0.8", changefreq: "weekly" },
    { loc: `${baseUrl}/dashboard/create`, priority: "0.7", changefreq: "weekly" },
    { loc: `${baseUrl}/dashboard/projects`, priority: "0.7", changefreq: "weekly" },
    { loc: `${baseUrl}/dashboard/settings`, priority: "0.4", changefreq: "monthly" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, priority, changefreq }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}