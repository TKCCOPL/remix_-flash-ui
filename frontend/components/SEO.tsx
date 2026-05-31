import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
}

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime
}: SEOProps) {
  useEffect(() => {
    // 页面标题
    document.title = `${title} | XiaoC'blog`;

    // Open Graph 标签
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:type', type);
    setMeta('og:url', url || window.location.href);
    setMeta('og:image', image || '/og-default.png');
    setMeta('og:site_name', "XiaoC'blog");

    // Twitter Card 标签
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image || '/og-default.png');

    // 文章特定标签
    if (type === 'article') {
      if (publishedTime) setMeta('article:published_time', publishedTime);
      if (modifiedTime) setMeta('article:modified_time', modifiedTime);
    }

    // JSON-LD 结构化数据
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : type === 'profile' ? 'Person' : 'WebSite',
      name: title,
      description,
      url: url || window.location.href,
      image: image || '/og-default.png',
      ...(type === 'article' && {
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: {
          '@type': 'Person',
          name: 'XiaoC',
        },
      }),
      ...(type === 'profile' && {
        jobTitle: 'Software Engineer & Designer',
      }),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [title, description, image, url, type, publishedTime, modifiedTime]);

  return null;
}

function setMeta(property: string, content: string) {
  if (!content) return;

  let meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    if (property.startsWith('og:') || property.startsWith('article:')) {
      meta.setAttribute('property', property);
    } else {
      meta.setAttribute('name', property);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}