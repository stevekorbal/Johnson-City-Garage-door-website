import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

function generateSitemapPlugin() {
  return {
    name: 'generate-sitemap-plugin',
    buildStart() {
      try {
        execSync('node scripts/generate-sitemap.js', { stdio: 'inherit' });
      } catch (err) {
        console.error('[Sitemap Plugin] Error running generate-sitemap.js:', err);
      }
    }
  };
}

function contactApiPlugin() {
  return {
    name: 'contact-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && (req.url === '/api/contact' || req.url.startsWith('/api/contact?'))) {
          // Handle CORS preflight
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Method Not Allowed. Use POST.' }));
            return;
          }

          let bodyStr = '';
          req.on('data', (chunk: any) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              let body: any = {};
              try {
                body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON body in request.' }));
                return;
              }

              // Honeypot spam check
              const honeypot = body.website_hp || body.hp_field || body.bot_field || '';
              if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Spam submission detected.' }));
                return;
              }

              const sanitize = (str: unknown, maxLen = 500): string => {
                if (typeof str !== 'string') return '';
                return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
              };

              const name = sanitize(body.name, 200);
              const phone = sanitize(body.phone, 50);
              const email = sanitize(body.email, 200);
              const city = sanitize(body.city, 200);
              const service = sanitize(body.service || body.serviceNeeded, 200);
              const message = sanitize(body.message, 2000);

              if (!name) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Your Full Name is required.' }));
                return;
              }

              if (!phone || phone.length < 7) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'A valid Phone Number is required.' }));
                return;
              }

              if (!city) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'City / Location is required.' }));
                return;
              }

              if (!service) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Service Needed is required.' }));
                return;
              }

              if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Please enter a valid email address.' }));
                return;
              }

              const webhookUrl =
                process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
                'https://script.google.com/macros/s/AKfycbz0v3r0fYvggUx5qGUFUgqIyRopT687iE_wZqYqCvtAWNTEKtA0ovub2yp60GiQTMh0/exec';

              const sheetsPayload = {
                sheet: 'Johnson City',
                website: 'garagedoorrepairjohnsoncity.com',
                name,
                phone,
                email: email || '',
                city,
                service,
                message: message || '',
              };

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000);

              const gasResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sheetsPayload),
                redirect: 'follow',
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!gasResponse.ok) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "Sorry, we couldn't send your request. Please call us directly.",
                  })
                );
                return;
              }

              const responseText = await gasResponse.text();
              let responseJson: any = null;
              try {
                responseJson = JSON.parse(responseText);
              } catch {
                responseJson = null;
              }

              if (
                gasResponse.status === 200 &&
                (responseJson === null || responseJson.success === true || !responseJson.error)
              ) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Thank you. Your request has been received. We'll be in touch shortly.",
                  })
                );
                return;
              }

              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Sorry, we couldn't send your request. Please call us directly.",
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Sorry, we couldn't send your request. Please call us directly.",
                })
              );
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [generateSitemapPlugin(), contactApiPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
