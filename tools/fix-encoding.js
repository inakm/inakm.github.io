const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const EXCLUDE_DIRS = ['node_modules', '.git', 'v0'];

function collectHtmlFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!EXCLUDE_DIRS.includes(entry.name)) {
                files.push(...collectHtmlFiles(path.join(dir, entry.name)));
            }
        } else if (entry.name.endsWith('.html')) {
            files.push(path.join(dir, entry.name));
        }
    }
    return files;
}

function needsFix(bytes) {
    const patterns = [
        [0xC3, 0xA2, 0xE2, 0x82, 0xAC],
        [0xC3, 0xAF, 0xC2, 0xBF, 0xC2, 0xBD],
    ];
    for (const pat of patterns) {
        for (let i = 0; i <= bytes.length - pat.length; i++) {
            let match = true;
            for (let j = 0; j < pat.length; j++) {
                if (bytes[i + j] !== pat[j]) { match = false; break; }
            }
            if (match) return true;
        }
    }
    return false;
}

function fixFile(filePath) {
    const bytes = fs.readFileSync(filePath);
    if (!needsFix(bytes)) return false;

    const corruptedStr = iconv.decode(bytes, 'utf-8');
    const originalBytes = iconv.encode(corruptedStr, 'windows-1252');
    const fixedStr = iconv.decode(originalBytes, 'utf-8');

    fs.writeFileSync(filePath, fixedStr, 'utf-8');
    return true;
}

const files = collectHtmlFiles('.');
let fixedCount = 0;
for (const file of files) {
    try {
        if (fixFile(file)) {
            console.log(`Fixed: ${file}`);
            fixedCount++;
        }
    } catch (e) {
        console.error(`Error fixing ${file}: ${e.message}`);
    }
}
console.log(`\nTotal files fixed: ${fixedCount}`);
