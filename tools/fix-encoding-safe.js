const fs = require('fs');
const path = require('path');

// Known corrupted byte sequences and their correct replacements
// All are caused by double UTF-8 encoding
const FIXES = [
    // Double-encoded em dash (—) : â (C3 A2) + € (E2 82 AC) + " (E2 80 9D)
    { pattern: [0xC3,0xA2,0xE2,0x82,0xAC,0xE2,0x80,0x9D], replace: Buffer.from('&mdash;') },

    // Double-encoded en dash (–) : â (C3 A2) + € (E2 82 AC) + " (E2 80 9C) 
    { pattern: [0xC3,0xA2,0xE2,0x82,0xAC,0xE2,0x80,0x9C], replace: Buffer.from('&ndash;') },

    // Double-encoded bullet (•) : â (C3 A2) + € (E2 82 AC) + ¢ (C2 A2)
    { pattern: [0xC3,0xA2,0xE2,0x82,0xAC,0xC2,0xA2], replace: Buffer.from('&bull;') },

    // Double-encoded right arrow (→) : â (C3 A2) + † (E2 80 A0) + ' (E2 80 99)
    { pattern: [0xC3,0xA2,0xE2,0x80,0xA0,0xE2,0x80,0x99], replace: Buffer.from('&rarr;') },

    // Double-encoded replacement char (ï¿½) : ï (C3 AF) + ¿ (C2 BF) + ½ (C2 BD)
    { pattern: [0xC3,0xAF,0xC2,0xBF,0xC2,0xBD], replace: Buffer.from('?') },
];

function collectHtmlFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
                files.push(...collectHtmlFiles(full));
            }
        } else if (entry.name.endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

function fixFile(filePath) {
    const bytes = fs.readFileSync(filePath);
    let fixed = false;
    let result = Buffer.from(bytes);

    for (const fix of FIXES) {
        const pat = Buffer.from(fix.pattern);
        const repl = fix.replace;
        let idx = result.indexOf(pat);
        while (idx !== -1) {
            console.log(`  Fixed pat ${fix.pattern.slice(0,3).join(',')}... at byte ${idx} in ${path.relative('.', filePath)}`);
            result = Buffer.concat([
                result.subarray(0, idx),
                repl,
                result.subarray(idx + pat.length)
            ]);
            idx = result.indexOf(pat, idx + repl.length);
            fixed = true;
        }
    }

    if (fixed) {
        fs.writeFileSync(filePath, result);
    }
    return fixed;
}

const files = collectHtmlFiles('.');
let fixedCount = 0;
for (const file of files) {
    try {
        if (fixFile(file)) fixedCount++;
    } catch (e) {
        console.error(`Error on ${file}: ${e.message}`);
    }
}
console.log(`\nTotal files fixed: ${fixedCount}`);
