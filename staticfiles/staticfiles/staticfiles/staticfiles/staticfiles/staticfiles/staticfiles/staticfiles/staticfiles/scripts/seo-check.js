/**
 * SMARTFIQ Comprehensive Technical SEO & Compliance Checker
 * Validates H1 tags, meta descriptions, canonical URLs, image alt attributes,
 * JSON-LD schema validity, and sitemap synchronization.
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
    console.log(`\n🔍 Running Comprehensive Technical SEO Audit across ${htmlFiles.length} HTML files...\n`);

    let totalErrors = 0;

    htmlFiles.forEach(file => {
        const relativePath = path.relative(ROOT_DIR, file);
        const content = fs.readFileSync(file, 'utf8');
        const errors = [];

        // 1. Title Check
        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!titleMatch || !titleMatch[1].trim()) {
            errors.push('Missing or empty <title> tag');
        } else if (titleMatch[1].trim().length > 70) {
            errors.push(`Title tag exceeds recommended length: ${titleMatch[1].trim().length} chars`);
        }

        // 2. Meta Description Check
        const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (!descMatch || !descMatch[1].trim()) {
            errors.push('Missing or empty <meta name="description"> tag');
        } else if (descMatch[1].trim().length > 175) {
            errors.push(`Meta description exceeds recommended length: ${descMatch[1].trim().length} chars`);
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

        // 4. Forbidden Domain References Check
        FORBIDDEN_DOMAINS.forEach(forbidden => {
            if (content.toLowerCase().includes(forbidden)) {
                errors.push(`Forbidden domain "${forbidden}" found in file content`);
            }
        });

        // 5. Single H1 Tag Check
        const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
        if (!h1Matches || h1Matches.length === 0) {
            errors.push('Missing <h1> heading tag');
        } else if (h1Matches.length > 1) {
            errors.push(`Multiple <h1> tags found (${h1Matches.length} count). Exactly one <h1> required for SEO.`);
        }

        // 6. Image Alt Attribute Check
        const imgRegex = /<img\s+[^>]*\/?>/gi;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(content)) !== null) {
            const imgTag = imgMatch[0];
            if (!imgTag.includes('alt=')) {
                errors.push(`Image tag missing alt attribute: ${imgTag.slice(0, 50)}...`);
            }
        }

        // 7. JSON-LD Schema Validity Check
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
            console.log(`✅ ${relativePath}: 100% Compliant!`);
        }
    });

    // 8. Sitemap Synchronization Check
    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
        const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
        FORBIDDEN_DOMAINS.forEach(forbidden => {
            if (sitemapXml.toLowerCase().includes(forbidden)) {
                console.log(`❌ sitemap.xml: Contains forbidden domain "${forbidden}"`);
                totalErrors++;
            }
        });
    }

    console.log('\n----------------------------------------');
    if (totalErrors === 0) {
        console.log('🎉 Technical SEO Validation Passed! 100% Compliant.\n');
        process.exit(0);
    } else {
        console.log(`⚠️ Technical SEO Validation finished with ${totalErrors} warning/issue(s).\n`);
        process.exit(1);
    }
}

runSeoCheck();
