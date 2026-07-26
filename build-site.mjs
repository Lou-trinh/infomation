import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(projectRoot, 'dist');
const serverRoot = path.join(distRoot, 'server');

const sourceFiles = [
  { route: '/index.html', file: 'index.html', type: 'text/html; charset=utf-8' },
  { route: '/chan_dung.jpg', file: 'chan_dung.jpg', type: 'image/jpeg' },
  { route: '/favicon.svg', file: 'favicon.svg', type: 'image/svg+xml; charset=utf-8' },
  { route: '/og.png', file: 'og.png', type: 'image/png' },
  { route: '/cv-trinh-tuan-cuong.pdf', file: 'cv-trinh-tuan-cuong.pdf', type: 'application/pdf' },
];

const files = {};

for (const source of sourceFiles) {
  let body = await readFile(path.join(projectRoot, source.file));

  if (source.route === '/index.html') {
    const html = body
      .toString('utf8')
      .replace('content="/og.png"', 'content="__SITE_ORIGIN__/og.png"');
    body = Buffer.from(html, 'utf8');
  }

  files[source.route] = {
    type: source.type,
    body: body.toString('base64'),
  };
}

const workerSource = `const FILES = ${JSON.stringify(files)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const route = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = FILES[route];

    if (!file) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    const bytes = decodeBase64(file.body);
    const body = route === '/index.html'
      ? new TextDecoder().decode(bytes).replaceAll('__SITE_ORIGIN__', url.origin)
      : bytes;

    return new Response(body, {
      headers: {
        'content-type': file.type,
        'cache-control': route === '/index.html'
          ? 'no-cache'
          : 'public, max-age=86400',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
`;

await rm(distRoot, { recursive: true, force: true });
await mkdir(serverRoot, { recursive: true });
await writeFile(path.join(serverRoot, 'index.js'), workerSource, 'utf8');

console.log('Site build created at dist/server/index.js');
