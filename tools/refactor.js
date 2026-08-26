const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const htmlFiles = [];

function findHtmlFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'assets', 'myprojects', 'v0'].includes(file)) {
                findHtmlFiles(fullPath);
            }
        } else if (path.extname(fullPath) === '.html') {
            htmlFiles.push(fullPath);
        }
    }
}

findHtmlFiles(process.cwd());
console.log('Found ' + htmlFiles.length + ' HTML files');
htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(content, { decodeEntities: false });

    let modified = false;

    // 1. Add <noscript> if not present
    if ($('noscript').length === 0) {
        const noScriptTag = `<noscript><div style="padding: 20px; background: #222; color: white; text-align: center;">This portfolio requires JavaScript to load interactive elements. Please enable JavaScript or view the static text summaries below.</div></noscript>`;
        $('body').prepend(noScriptTag);
        modified = true;
    }

    // 2. Fix div-soup for Headers with H1
    $('div.mb-12').each((i, el) => {
        if ($(el).find('h1').length > 0) {
            el.tagName = 'header';
            modified = true;
        }
    });

    // 3. Fix generic cards to <article>
    $('div.liquid-glass.rounded-2xl.mac-window').each((i, el) => {
        el.tagName = 'article';
        modified = true;
    });

    // 4. Ensure sections have accessible labels and H2
    $('section[aria-label]').each((i, el) => {
        const label = $(el).attr('aria-label');
        if (label) {
            $(el).removeAttr('aria-label');
            const id = 'section-' + i;
            $(el).attr('aria-labelledby', id);
            
            // if no h2 exists in section
            if ($(el).find('h2').length === 0) {
                $(el).prepend(`<h2 id="${id}" class="sr-only">${label}</h2>`);
            } else {
                $(el).find('h2').first().attr('id', id);
            }
            modified = true;
        }
    });

    // 5. Add legal links to footer (find the Resources column)
    // Look for "Resources" h4
    $('h4:contains("Resources")').each((i, h4) => {
        const ul = $(h4).next('ul');
        if (ul.length > 0) {
            // Check if Privacy Policy is already there
            if (ul.find('a:contains("Privacy Policy")').length === 0) {
                // Determine relative path depth
                const depth = file.replace(__dirname, '').split(path.sep).length - 2;
                const prefix = depth > 0 ? '../'.repeat(depth) : '';
                
                ul.append(`<li><a href="${prefix}page/privacy.html" class="hover:text-white transition-colors">Privacy Policy</a></li>`);
                ul.append(`<li><a href="${prefix}page/terms.html" class="hover:text-white transition-colors">Terms of Service</a></li>`);
                modified = true;
            }
        }
    });

    // 6. Fix empty alt tags on images
    $('img').each((i, img) => {
        const alt = $(img).attr('alt');
        if (!alt || alt.trim() === '' || alt.toLowerCase().includes('dashboard') || alt.toLowerCase().includes('img')) {
            // improve alt tag based on adjacent headings or parent text if it's too short
            const parentArticle = $(img).closest('article');
            if (parentArticle.length > 0) {
                const title = parentArticle.find('h3').text();
                if (title) {
                    $(img).attr('alt', `Interactive visualization of ${title} highlighting key financial and operational metrics`);
                    modified = true;
                }
            }
        }
    });

    if (modified) {
        fs.writeFileSync(file, $.html());
        console.log(`Refactored ${file}`);
    }
});
console.log("Refactoring complete.");
