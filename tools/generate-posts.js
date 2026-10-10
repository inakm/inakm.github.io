/**
 * generate-posts.js
 *
 * Builds assets/data/posts.json from the Jekyll blog sitemap at
 * https://inakm.github.io/posts/sitemap.xml
 *
 * The front page (#writing-analysis "Writing & Analysis" grid) merges this
 * manifest with the existing Blogspot JSONP feeds. Because that grid is
 * populated at runtime, CORS and feed downtime would otherwise blank the
 * section out - shipping a pre-built manifest keeps it populated.
 *
 * Usage:  node tools/generate-posts.js [sitemapUrl]
 *         npm run posts
 */

const fs = require('fs');
const path = require('path');

const SITEMAP_URL = process.argv[2] || 'https://inakm.github.io/posts/sitemap.xml';
const OUTPUT = path.join('assets', 'data', 'posts.json');
const SOURCE_LABEL = 'Insights';

// Jekyll permalinks look like /posts/YYYY/MM/DD/slug.html
const POST_PATH = /\/posts\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.html?$/;

// Sidebar/utility pages that also live in the sitemap (/posts/, /archive/, ...).
const EXCLUDED = ['/posts/archive/', '/posts/author/', '/posts/privacy-policy/', '/posts/resume/'];

const decodeEntities = (s) => String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

const meta = (html, key) => {
    const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
    const alt = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i');
    const m = html.match(re) || html.match(alt);
    return m ? decodeEntities(m[1]) : '';
};

function dateFromUrl(url) {
    const m = url.match(/\/posts\/(\d{4})\/(\d{2})\/(\d{2})\//);
    return m ? `${m[1]}-${m[2]}-${m[3]}T00:00:00+00:00` : null;
}

async function main() {
    console.log(`Reading sitemap: ${SITEMAP_URL}`);
    const xml = await (await fetch(SITEMAP_URL)).text();

    const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].trim());
    const urls = locs.filter((u) => POST_PATH.test(u) && !EXCLUDED.includes(u));

    console.log(`Found ${urls.length} post(s) in the sitemap.`);

    const posts = [];
    for (const url of urls) {
        try {
            const html = await (await fetch(url)).text();
            const title = meta(html, 'og:title') || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).split('|')[0];
            if (!title) { console.warn(`  ! skipped (no title): ${url}`); continue; }

            posts.push({
                title,
                url,
                date: meta(html, 'article:published_time') || dateFromUrl(url),
                description: meta(html, 'og:description')
            });
            console.log(`  ok  ${title}`);
        } catch (err) {
            console.warn(`  ! failed ${url}: ${err.message}`);
        }
    }

    // Newest first
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const payload = {
        generated: new Date().toISOString(),
        sitemap: SITEMAP_URL,
        label: SOURCE_LABEL,
        count: posts.length,
        posts
    };

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    console.log(`\nWrote ${posts.length} post(s) to ${OUTPUT}`);
    if (posts.length === 0) {
        console.error('WARNING: no posts written - check the sitemap URL.');
        process.exitCode = 1;
    }
}

main().catch((err) => {
    console.error('generate-posts failed:', err.message);
    process.exitCode = 1;
});