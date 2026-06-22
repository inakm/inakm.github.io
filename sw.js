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

function htmlToMarkdown(html) {
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  html = html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  html = html.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  const doc = new DOMParser().parseFromString(html, 'text/html');
  let md = '';
  const body = doc.body;

  function walk(node, listDepth) {
    listDepth = listDepth || 0;
    for (let i = 0; i < node.childNodes.length; i++) {
      const el = node.childNodes[i];
      if (el.nodeType === 3) {
        let text = el.textContent.replace(/\s+/g, ' ').trim();
        if (text) md += text;
        continue;
      }
      if (el.nodeType !== 1) continue;
      const tag = el.tagName.toLowerCase();
      const innerText = el.textContent.replace(/\s+/g, ' ').trim();

      if (tag === 'h1') { md += '# '; walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'h2') { md += '## '; walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'h3') { md += '### '; walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'h4') { md += '#### '; walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'h5') { md += '##### '; walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'h6') { md += '###### '; walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'p') { walk(el, listDepth); md += '\n\n'; }
      else if (tag === 'br') { md += '\n'; }
      else if (tag === 'hr') { md += '---\n\n'; }
      else if (tag === 'strong' || tag === 'b') { md += '**'; walk(el, listDepth); md += '**'; }
      else if (tag === 'em' || tag === 'i') { md += '*'; walk(el, listDepth); md += '*'; }
      else if (tag === 'code' && el.parentElement?.tagName?.toLowerCase() !== 'pre') {
        md += '`' + innerText + '`';
      } else if (tag === 'pre') {
        const code = el.querySelector('code');
        const lang = code?.className?.match(/language-(\w+)/)?.[1] || code?.className?.match(/lang-(\w+)/)?.[1] || '';
        md += '```' + lang + '\n' + (code ? code.textContent : el.textContent) + '\n```\n\n';
      } else if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        let text = '';
        walk(el, listDepth);
        text = md.split('\n').pop();
        if (href && text && !href.startsWith('#')) {
          md += ' (' + href + ')';
        }
        md += text;
      } else if (tag === 'img') {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        md += '![' + alt + '](' + src + ')';
      } else if (tag === 'ul') {
        md += '\n';
        for (let j = 0; j < el.children.length; j++) {
          const li = el.children[j];
          if (li.tagName.toLowerCase() === 'li') {
            md += '  '.repeat(listDepth) + '- ';
            walk(li, listDepth + 1);
            md += '\n';
          }
        }
        md += '\n';
      } else if (tag === 'ol') {
        md += '\n';
        for (let j = 0; j < el.children.length; j++) {
          const li = el.children[j];
          if (li.tagName.toLowerCase() === 'li') {
            md += '  '.repeat(listDepth) + (j + 1) + '. ';
            walk(li, listDepth + 1);
            md += '\n';
          }
        }
        md += '\n';
      } else if (tag === 'li') {
        walk(el, listDepth);
      } else if (tag === 'blockquote') {
        const quote = el.textContent.replace(/\s+/g, ' ').trim();
        md += '> ' + quote.replace(/\n/g, '\n> ') + '\n\n';
      } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span' || tag === 'main') {
        walk(el, listDepth);
      } else if (tag === 'table') {
        md += convertTable(el);
      }
    }
  }

  walk(body, 0);

  return md
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+/, '')
    .trim();
}

function convertTable(table) {
  const rows = table.querySelectorAll('tr');
  if (!rows.length) return '';
  let md = '\n';
  const colCount = Math.max(...Array.from(rows).map(r => r.querySelectorAll('td, th').length));

  rows.forEach((row, ri) => {
    const cells = row.querySelectorAll('td, th');
    const vals = Array.from(cells).map(c => c.textContent.replace(/\s+/g, ' ').trim());
    md += '| ' + vals.join(' | ') + ' |\n';
    if (ri === 0) {
      md += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
    }
  });
  return md + '\n';
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
