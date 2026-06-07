// frontend/scripts/generate-sitemap.ts
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SITE_URL = process.env.SITE_URL || 'https://blog.xiaocc.dev';
const API_URL = process.env.API_URL || 'http://127.0.0.1:8000';

interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  slug: string;
  name: string;
}

async function fetchPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API_URL}/api/posts?limit=1000`);
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  } catch (error) {
    console.warn('⚠️ Could not fetch posts from API, using empty list');
    return [];
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/api/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  } catch (error) {
    console.warn('⚠️ Could not fetch categories from API, using empty list');
    return [];
  }
}

function formatDate(date: string): string {
  return new Date(date).toISOString();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemap() {
  console.log('📝 Generating sitemap...');

  const posts = await fetchPosts();
  const categories = await fetchCategories();

  console.log(`   Found ${posts.length} posts, ${categories.length} categories`);

  const urls = [
    // 首页
    `<url>
      <loc>${SITE_URL}/</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`,

    // 关于页
    `<url>
      <loc>${SITE_URL}/about</loc>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>`,

    // 归档页
    `<url>
      <loc>${SITE_URL}/archive</loc>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
    </url>`,

    // 分类页
    `<url>
      <loc>${SITE_URL}/categories</loc>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`,

    // 分类详情页
    ...categories.map(cat => `
    <url>
      <loc>${SITE_URL}/categories/${escapeXml(cat.slug)}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>`),

    // 文章详情页
    ...posts.map(post => `
    <url>
      <loc>${SITE_URL}/post/${post.id}</loc>
      <lastmod>${formatDate(post.updated_at)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('')}
</urlset>`;

  const outputDir = join(process.cwd(), 'dist');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, 'sitemap.xml');
  writeFileSync(outputPath, sitemap);
  console.log(`✅ Sitemap generated: ${outputPath}`);
}

generateSitemap().catch(error => {
  console.error('❌ Error generating sitemap:', error);
  process.exit(1);
});
