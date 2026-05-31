---
name: seo-component
description: SEO component for managing meta tags, Open Graph, Twitter Card, and JSON-LD structured data
metadata:
  type: reference
---

SEO component has been created at `frontend/components/SEO.tsx`.

**Key features:**
- Sets page title with blog name suffix
- Manages Open Graph meta tags (og:title, og:description, og:type, og:url, og:image, og:site_name)
- Manages Twitter Card meta tags (twitter:card, twitter:title, twitter:description, twitter:image)
- Supports article-specific meta tags (article:published_time, article:modified_time)
- Generates JSON-LD structured data for both website and article types
- Uses helper function `setMeta()` for dynamic meta tag management

**Usage:**
```tsx
<SEO
  title="Post Title"
  description="Post description"
  type="article"
  image="/path/to/image.png"
  publishedTime="2026-05-31T10:00:00Z"
  modifiedTime="2026-05-31T12:00:00Z"
/>
```

**How to apply:**
- Use this component in page components to manage SEO metadata
- For blog posts, use `type="article"` with published/modified times
- For other pages, use the default `type="website"`
- The component automatically handles cleanup on unmount