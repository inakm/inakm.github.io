const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://inakm.github.io';
const DIRECTORIES_TO_SCAN = ['./', './page', './page/projects', './page/projects/dashboards', './page/prompts', './me'];

let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) return;
        if (path.extname(file) === '.html' && !fullPath.includes('404.html')) {
            let relativePath = fullPath.split(path.sep).join('/').replace(/^\.\//, '');
            const url = relativePath === 'index.html' ? BASE_URL + '/' : `${BASE_URL}/${relativePath}`;
            const lastMod = stat.mtime.toISOString().split('T')[0];
            
            const priority = relativePath === 'index.html' ? '1.0' : (relativePath.includes('projects') ? '0.8' : '0.6');

            sitemapXML += `  <url>\n`;
            sitemapXML += `    <loc>${url}</loc>\n`;
            sitemapXML += `    <lastmod>${lastMod}</lastmod>\n`;
            sitemapXML += `    <changefreq>weekly</changefreq>\n`;
            sitemapXML += `    <priority>${priority}</priority>\n`;
            sitemapXML += `  </url>\n`;
        }
    });
}

DIRECTORIES_TO_SCAN.forEach(dir => scanDirectory(dir));
sitemapXML += `</urlset>`;

fs.writeFileSync('./sitemap.xml', sitemapXML);
console.log('sitemap.xml generated successfully.');
