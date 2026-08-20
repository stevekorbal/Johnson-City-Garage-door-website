import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const blogDir = path.join(rootDir, 'content', 'blog');

// Helper to extract frontmatter from markdown
function parseFrontmatter(rawMarkdown) {
  if (!rawMarkdown) return { attributes: {}, body: '' };
  const matches = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!matches) return { attributes: {}, body: rawMarkdown };

  const frontmatterStr = matches[1];
  const body = matches[2];
  const attributes = {};
  const lines = frontmatterStr.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    attributes[key] = value;
  }
  return { attributes, body };
}

async function runPrerender() {
  console.log('[SSG] Starting static pre-rendering of SEO pages...');

  const templatePath = path.join(distDir, 'index.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error('dist/index.html not found. Run "vite build" before pre-rendering.');
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Create a Vite dev/SSR runner to load the TypeScript entry-server cleanly
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: rootDir
  });

  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');

  // Discover all routes to pre-render
  const routesToPrerender = [
    // Home
    '/',

    // Primary Core Services
    '/garage-door-repair',
    '/garage-door-spring-repair',
    '/garage-door-opener-repair',
    '/garage-door-opener-installation',
    '/garage-door-installation',
    '/emergency-garage-door-repair',
    '/garage-door-off-track-repair',
    '/garage-door-tune-ups',
    '/commercial-garage-doors',
    '/garage-door-cable-repair',
    '/garage-door-roller-replacement',
    '/garage-door-remote-programming',
    '/garage-door-replacement',
    '/broken-garage-door-springs',
    '/garage-door-maintenance',

    // City Pages (Standard URL patterns)
    '/city/johnson-city-tn',
    '/city/kingsport-tn',
    '/city/bristol-tn',
    '/city/elizabethton-tn',
    '/city/jonesborough-tn',
    '/city/erwin-tn',
    '/city/piney-flats-tn',
    '/city/gray-tn',

    // City Pages (Direct SEO Keyword URL patterns)
    '/garage-door-repair-johnson-city-tn',
    '/garage-door-repair-kingsport-tn',
    '/garage-door-repair-bristol-tn',
    '/garage-door-repair-elizabethton-tn',
    '/garage-door-repair-jonesborough-tn',
    '/garage-door-repair-erwin-tn',
    '/garage-door-repair-piney-flats-tn',
    '/garage-door-repair-gray-tn',

    // General Informational Pages
    '/service-areas',
    '/about-us',
    '/about',
    '/why-choose-us',
    '/faqs',
    '/contact',
    '/privacy-policy',
    '/terms-and-conditions',

    // Blog Index
    '/blog'
  ];

  // Dynamically add all Markdown blog posts
  if (fs.existsSync(blogDir)) {
    const files = fs.readdirSync(blogDir);
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const fileContent = fs.readFileSync(path.join(blogDir, file), 'utf8');
        try {
          const parsed = parseFrontmatter(fileContent);
          const slug = parsed.attributes?.slug || file.replace(/\.mdx?$/, '');
          if (slug) {
            routesToPrerender.push(`/blog/${slug}`);
          }
        } catch (e) {
          console.error(`Failed to parse ${file}:`, e);
        }
      }
    }
  }

  // Deduplicate routes
  const uniqueRoutes = Array.from(new Set(routesToPrerender));
  let count = 0;

  for (const route of uniqueRoutes) {
    try {
      const { appHtml, seo } = render(route);

      // Build complete head tags
      const titleTag = `<title>${seo.title}</title>`;
      const metaTags = `
    <meta name="description" content="${seo.description.replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="${seo.canonicalUrl}" />
    <meta property="og:type" content="${seo.ogType || 'website'}" />
    <meta property="og:title" content="${seo.title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${seo.description.replace(/"/g, '&quot;')}" />
    <meta property="og:url" content="${seo.canonicalUrl}" />
    <meta property="og:image" content="${seo.ogImage}" />
    <meta property="og:site_name" content="Johnson City Garage Door Repair" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${seo.description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${seo.ogImage}" />
    <script type="application/ld+json">
${JSON.stringify(seo.schemaJson, null, 2)}
    </script>`;

      let html = template;

      // Replace or insert title
      if (html.includes('<title>')) {
        html = html.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
      } else {
        html = html.replace('</head>', `  ${titleTag}\n</head>`);
      }

      // Replace or inject description & canonical
      html = html.replace(/<meta name="description"[\s\S]*?>/i, '');
      html = html.replace(/<link rel="canonical"[\s\S]*?>/i, '');
      html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '');

      html = html.replace('</head>', `${metaTags}\n  </head>`);

      // Inject rendered app HTML into root container
      html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

      // Determine output file path
      const cleanPath = route.replace(/^\/|\/$/g, '');
      let filePath;
      if (!cleanPath || cleanPath === 'home') {
        filePath = path.join(distDir, 'index.html');
      } else {
        const routeDir = path.join(distDir, cleanPath);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        filePath = path.join(routeDir, 'index.html');
      }

      fs.writeFileSync(filePath, html, 'utf8');
      count++;
    } catch (err) {
      console.error(`[SSG Error] Failed to pre-render route "${route}":`, err);
    }
  }

  await vite.close();
  console.log(`[SSG] Successfully pre-rendered ${count} static HTML routes with full visible content, H1, internal links, meta tags, and JSON-LD schema!`);
}

runPrerender().catch((err) => {
  console.error('[SSG Fatal Error]', err);
  process.exit(1);
});
