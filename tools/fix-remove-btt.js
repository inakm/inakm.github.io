const fs = require('fs');
const path = require('path');

function collectHtmlFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'v0') {
                files.push(...collectHtmlFiles(full));
            }
        } else if (entry.name.endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

// Remove back-to-top button and associated JS/CSS
function removeBackToTop(content) {
    let modified = content;

    // Pattern 1: index.html / prompts/index.html style - button with children + scroll JS + click handler
    // Remove the button element
    modified = modified.replace(
        /<button[^>]*\b(?:id="back-to-top"|id="backToTop")[^>]*>[\s\S]*?<\/button>\s*\n*/g,
        ''
    );

    // Remove CSS blocks for #backToTop
    modified = modified.replace(
        /#backToTop\s*\{[\s\S]*?\}\s*\n*[\s\S]*?#backToTop\.show\s*\{[\s\S]*?\}\s*\n*/g,
        ''
    );
    modified = modified.replace(
        /#backToTop\s*\{[\s\S]*?\}\s*\n*/g,
        ''
    );

    // Remove "Back to Top" comment lines
    modified = modified.replace(/<!-- Back to Top[^>]*-->\s*\n*/g, '');
    modified = modified.replace(/<!-- Back to top[^>]*-->\s*\n*/g, '');

    // Remove scroll/click JS for back-to-top - handle multiple patterns

    // Pattern: const btt = document.getElementById('backToTop'); + scroll handler + scrollToTop function
    modified = modified.replace(
        /const\s+(?:btt|backToTop)\s*=\s*document\.getElementById\s*\(\s*['"]backToTop['"]\s*\)\s*;[\s\S]*?window\.addEventListener\s*\(\s*['"]scroll['"]\s*,\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;?\s*\n*/g,
        ''
    );
    modified = modified.replace(
        /const\s+(?:btt|backToTop)\s*=\s*document\.getElementById\s*\(\s*['"]backToTop['"]\s*\)\s*;[\s\S]*?window\.addEventListener\s*\(\s*['"]scroll['"]\s*,\s*function\s*\(\)\s*\{[\s\S]*?\}\s*\)\s*;?\s*\n*/g,
        ''
    );

    // Pattern: const backToTop = document.getElementById('back-to-top'); + scroll handler + click handler
    modified = modified.replace(
        /const\s+backToTop\s*=\s*document\.getElementById\s*\(\s*['"]back-to-top['"]\s*\)\s*;[\s\S]*?window\.addEventListener\s*\(\s*['"]scroll['"]\s*,\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;?\s*[\s\S]*?if\s*\(\s*backToTop\s*\)\s*\{[\s\S]*?backToTop\.addEventListener\s*\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;?\s*\}\s*\n*/g,
        ''
    );

    // Pattern: onclick="window.scrollTo({top:0,behavior:'smooth'})" buttons (inline onclick)
    // These are already removed by the button pattern above

    // Remove standalone scrollToTop function
    modified = modified.replace(
        /function\s+scrollToTop\s*\(\)\s*\{[\s\S]*?window\.scrollTo\s*\(\s*\{[\s\S]*?top:\s*0[\s\S]*?behavior:\s*['"]smooth['"][\s\S]*?\}\s*\)\s*;?\s*\}\s*\n*/g,
        ''
    );

    // Remove backToTop.addEventListener('click', ...) standalone
    modified = modified.replace(
        /backToTop\.addEventListener\s*\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*[\s\S]*?window\.scrollTo\s*\(\s*\{[\s\S]*?top:\s*0[\s\S]*?behavior:\s*['"]smooth['"][\s\S]*?\}\s*\)\s*\)\s*;?\s*\n*/g,
        ''
    );

    // Pattern: // Back to Top Button comment line
    modified = modified.replace(/\/\/\s*Back\s*to\s*Top\s*Button\s*\n*/g, '');
    modified = modified.replace(/\/\/\s*Back\s*to\s*Top\s*\n*/g, '');
    modified = modified.replace(/\/\/\s*Scroll\s*Logic\s*\n*/g, '');

    // Remove extra blank lines
    modified = modified.replace(/\n{3,}/g, '\n\n');

    return modified;
}

const files = collectHtmlFiles('.');
let changed = 0;
for (const file of files) {
    try {
        let content = fs.readFileSync(file, 'utf-8');
        let newContent = removeBackToTop(content);
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf-8');
            console.log('Fixed: ' + file);
            changed++;
        }
    } catch (e) {
        console.error('Error on ' + file + ': ' + e.message);
    }
}
console.log('\nTotal files modified: ' + changed);
