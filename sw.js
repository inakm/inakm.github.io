self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const accept = request.headers.get('Accept') || '';
  if (!accept.includes('text/markdown')) return;

  if (request.headers.get('X-Markdown-Internal')) return;

  event.respondWith(handleMarkdownRequest(event));
});

async function handleMarkdownRequest(event) {
  const request = event.request;

  try {
    const internalReq = new Request(request, {
      headers: { ...request.headers, 'X-Markdown-Internal': '1' },
    });

    const htmlResponse = await fetch(internalReq);
    if (!htmlResponse.ok) return htmlResponse;

    const ct = htmlResponse.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return htmlResponse;

    const html = await htmlResponse.text();
    const markdown = htmlToMarkdown(html);
    const tokenCount = Math.round(markdown.length / 4);

    return new Response(markdown, {
      status: htmlResponse.status,
      statusText: htmlResponse.statusText,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': String(tokenCount),
        'x-original-tokens': String(Math.round(html.length / 4)),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return fetch(request);
  }
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201D', ldquo: '\u201C',
  copy: '\u00A9', reg: '\u00AE', trade: '\u2122', deg: '\u00B0',
  middot: '\u00B7', bull: '\u2022', times: '\u00D7', rupee: '\u20B9', euro: '\u20AC', pound: '\u00A3',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCode(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] || m);
}

function safeFromCode(n) {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '');
}

function inline(s) {
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
    const t = stripTags(text).trim();
    if (!href || href.startsWith('#') || !t) return t;
    return '[' + t + '](' + href + ')';
  });
  s = s.replace(/<img\b[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
  s = s.replace(/<img\b[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  s = s.replace(/<img\b[^>]*>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  return s;
}

function convertTable(tableHtml) {
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(tableHtml)) !== null) {
    const cells = [];
    const tdRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let tdM;
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      cells.push(stripTags(inline(tdM[1])).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim());
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return '';
  const cols = Math.max(...rows.map(r => r.length));
  let md = '\n';
  rows.forEach((row, i) => {
    while (row.length < cols) row.push('');
    md += '| ' + row.join(' | ') + ' |\n';
    if (i === 0) md += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
  });
  return md + '\n';
}

function htmlToMarkdown(html) {
  html = html.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  html = html.replace(/<(nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  html = html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (m) => convertTable(m));

  const pres = [];
  html = html.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (m, code) => {
    pres.push(decodeEntities(stripTags(code)));
    return '\n\n\u0000PRE' + (pres.length - 1) + '\u0000\n\n';
  });

  html = inline(html);

  html = html.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (m, lvl, text) => '\n\n' + '#'.repeat(+lvl) + ' ' + text.trim() + '\n\n');
  html = html.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');
  html = html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, q) =>
    '\n\n' + stripTags(q).trim().split('\n').map(l => '> ' + l.trim()).join('\n') + '\n\n');
  html = html.replace(/<li\b[^>]*>([\s\S]*?)<\/li>\s*/gi, '- $1\n');
  html = html.replace(/<\/?(ul|ol|menu|dir)\b[^>]*>\s*/gi, '\n');
  html = html.replace(/<(p|div|section|article|main|aside|figure|figcaption|h[1-6]|form|label|fieldset|legend|address|details|summary|dl|dd|dt)\b[^>]*>/gi, '\n\n');
  html = html.replace(/<\/(p|div|section|article|main|aside|figure|figcaption|h[1-6]|form|fieldset|address|details|summary|dl|dd|dt|table|thead|tbody|tfoot|tr|video|audio|canvas|iframe)\s*>/gi, '\n\n');

  html = stripTags(html);
  html = decodeEntities(html);

  html = html.replace(/\u0000PRE(\d+)\u0000/g, (_, i) =>
    '\n\n```\n' + (pres[+i] || '') + '\n```\n\n');

  html = html.replace(/[ \t]+\n/g, '\n');
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/^[ \t]+/, '').trim();

  return html;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
