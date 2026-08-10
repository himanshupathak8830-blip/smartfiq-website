/**
 * SMARTFIQ Automated Technical SEO Validation Script
 * Crawls and parses all HTML files to ensure 100% compliance with SEO & domain standards.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PREFERRED_DOMAIN = 'https://smartfiq.website';
const FORBIDDEN_DOMAINS = ['smartfiq.com', 'www.smartfiq.website'];

function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.agents') {
                results = results.concat(getHtmlFiles(filePath));
            }
        } else if (file.endsWith('.html') && file !== 'admin.html') {
            results.push(filePath);
        }
    });
    return results;
}

function runSeoCheck() {
    const htmlFiles = getHtmlFiles(ROOT_DIR);
    console.log(`\n🔍 Found ${htmlFiles.length} HTML files to inspect...\n`);

    let totalErrors = 0;

    htmlFiles.forEach(file => {
        const relativePath = path.relative(ROOT_DIR, file);
        const content = fs.readFileSync(file, 'utf8');
        const errors = [];

        // 1. Title Check
        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!titleMatch || !titleMatch[1].trim()) {
            errors.push('Missing or empty <title> tag');
        }

        // 2. Meta Description Check
        const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (!descMatch || !descMatch[1].trim()) {
            errors.push('Missing or empty <meta name="description"> tag');
        }

        // 3. Canonical Tag Check
        const canonicalMatch = content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
        if (!canonicalMatch) {
            errors.push('Missing <link rel="canonical"> tag');
        } else {
            const canonicalUrl = canonicalMatch[1];
            if (!canonicalUrl.startsWith(PREFERRED_DOMAIN)) {
                errors.push(`Canonical URL domain mismatch: ${canonicalUrl} (expected start with ${PREFERRED_DOMAIN})`);
            }
        }

        // 4. Forbidden Domain References
        FORBIDDEN_DOMAINS.forEach(forbidden => {
            if (content.toLowerCase().includes(forbidden)) {
                errors.push(`Forbidden domain "${forbidden}" found in file content`);
            }
        });

        // 5. H1 Tag Check
        const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (!h1Match || !h1Match[1].trim()) {
            errors.push('Missing or empty <h1> tag');
        }

        // 6. JSON-LD Schema Validity Check
        const ldJsonRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = ldJsonRegex.exec(content)) !== null) {
            try {
                JSON.parse(match[1]);
            } catch (err) {
                errors.push(`Invalid JSON-LD schema syntax: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            console.log(`❌ ${relativePath}:`);
            errors.forEach(err => console.log(`   - ${err}`));
            totalErrors += errors.length;
        } else {
            console.log(`✅ ${relativePath}: All checks passed!`);
        }
    });

    console.log('\n----------------------------------------');
    if (totalErrors === 0) {
        console.log('🎉 Technical SEO Validation Passed! 100% Compliant.\n');
        process.exit(0);
    } else {
        console.log(`⚠️ Technical SEO Validation Failed with ${totalErrors} issue(s).\n`);
        process.exit(1);
    }
}

runSeoCheck();
