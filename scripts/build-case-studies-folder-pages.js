const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const caseStudiesDir = path.join(rootDir, 'case-studies');

if (!fs.existsSync(caseStudiesDir)) {
  fs.mkdirSync(caseStudiesDir, { recursive: true });
}

const caseStudiesConfig = [
  {
    mdFileName: 'E-Commerce Retail Co_ How WhatsApp Automation Scaled Customer Support to 50K+ Monthly Active Users.md',
    htmlFileName: 'whatsapp-automation-guide.html',
    slug: 'whatsapp-automation-guide',
    title: 'E-Commerce Retail Co: How WhatsApp Automation Scaled Customer Support to 50K+ Monthly Active Users',
    clientName: 'E-Commerce Retail Co',
    categoryBadge: 'WhatsApp Automation Case Study',
    author: 'SmartFiQ Systems Architect',
    date: 'August 2026',
    readTime: '50,000+ MAU',
    metricsBadge: '85% Resolution Cut',
    coverImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfOxYS-ZbkAlIiB-Hf_glz2BrQKPhekHmrEUu7jefG3s88z854mngU68wi&s=10',
    metaDesc: 'Detailed case study on how E-Commerce Retail Co scaled WhatsApp customer support to 50,000+ monthly active users with SmartFiQ AI automation.'
  },
  {
    mdFileName: 'Lead Extraction & Email Enrichment Agent.md',
    htmlFileName: 'lead-extraction-agent.html',
    slug: 'lead-extraction-agent',
    title: 'Lead Extraction & Email Enrichment Agent: Automating Sales Pipeline',
    clientName: 'Real Estate Group',
    categoryBadge: 'Lead Gen & Scraper Case Study',
    author: 'SmartFiQ Automation Team',
    date: 'August 2026',
    readTime: '140+ Meetings Monthly',
    metricsBadge: '140+ Meetings Monthly',
    coverImage: 'https://media.licdn.com/dms/image/v2/D4D12AQE9-axP-Ajqcg/article-cover_image-shrink_720_1280/B4DZWlxArvHAAY-/0/1742242847803?e=1787788800&v=beta&t=TEnsSbWt31XHTTiVQ85cRw3cxEOhrftDy4Xg420Nvos',
    metaDesc: 'Case study on automating lead generation, web scraping, email enrichment, and automated sales outreach with SmartFiQ AI agents.'
  },
  {
    mdFileName: 'Automated Data Modeling & Executive BI Dashboard.md',
    htmlFileName: 'data-modeling-bi-dashboard.html',
    slug: 'data-modeling-bi-dashboard',
    title: 'Automated Data Modeling & Executive BI Dashboard',
    clientName: 'Enterprise Logistics',
    categoryBadge: 'BI & Data Pipeline Case Study',
    author: 'SmartFiQ Data Engineering Lab',
    date: 'August 2026',
    readTime: '$120k Saved Annually',
    metricsBadge: '$120k Saved Annually',
    coverImage: 'https://assets.qlik.com/image/upload/w_2378/q_auto/qlik/glossary/dashboard-examples/seo-hero-dashboard-examples_uyouwd.png',
    metaDesc: 'Case study on building automated ETL data modeling pipelines and Looker Studio DAX dashboards for real-time revenue reporting.'
  }
];

function markdownToProseHTML(md) {
  if (!md) return '';

  const lines = md.split('\n');
  let result = [];
  let inList = false;
  let listType = 'ul';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Check headings
    if (trimmed.startsWith('# ')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const text = parseInline(trimmed.substring(2));
      result.push(`<h1 class="text-3xl sm:text-4xl font-extrabold text-white mt-10 mb-6 leading-tight">${text}</h1>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const text = parseInline(trimmed.substring(3));
      result.push(`<h2 class="text-2xl sm:text-3xl font-bold text-white mt-12 mb-6 border-b border-white/10 pb-3">${text}</h2>`);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const text = parseInline(trimmed.substring(4));
      result.push(`<h3 class="text-xl font-bold text-[#ffb5a0] mt-8 mb-4">${text}</h3>`);
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const text = parseInline(trimmed.substring(5));
      result.push(`<h4 class="text-lg font-bold text-[#ff5625] mt-6 mb-3">${text}</h4>`);
      continue;
    }

    // Check Blockquote
    if (trimmed.startsWith('> ')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const text = parseInline(trimmed.substring(2));
      result.push(`<div class="glass-card border-l-4 border-[#ff5625] p-6 rounded-2xl my-8 bg-[#1A1A1A]/80">
    <p class="text-base text-[#E7BDB2] italic leading-relaxed">${text}</p>
</div>`);
      continue;
    }

    // Check Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      result.push(`<hr class="my-10 border-white/10" />`);
      continue;
    }

    // Check Unordered List
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul class="list-disc pl-6 space-y-3 my-6 text-stone-300">');
        inList = true;
        listType = 'ul';
      }
      const text = parseInline(trimmed.substring(2));
      result.push(`<li>${text}</li>`);
      continue;
    }

    // Check Ordered List
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol class="list-decimal pl-6 space-y-3 my-6 text-stone-300">');
        inList = true;
        listType = 'ol';
      }
      const text = parseInline(numMatch[2]);
      result.push(`<li>${text}</li>`);
      continue;
    }

    // Blank line
    if (trimmed === '') {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      continue;
    }

    // Normal paragraph
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
    }

    result.push(`<p class="mb-6 text-stone-300 text-base sm:text-lg leading-relaxed">${parseInline(line)}</p>`);
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join('\n');
}

function parseInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#E7BDB2]">$1</em>');
}

caseStudiesConfig.forEach(item => {
  const mdPath = path.join(rootDir, item.mdFileName);
  const mdContent = fs.readFileSync(mdPath, 'utf8').trim();
  const parsedContent = markdownToProseHTML(mdContent);

  const pageHtml = `<!DOCTYPE html>
<html class="dark" lang="en">

<head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>${item.title} | SmartFiQ Case Study</title>
    <meta name="description" content="${item.metaDesc}" />
    <link rel="canonical" href="https://smartfiq.website/case-studies/${item.slug}" />
    <link rel="icon" type="image/png" href="../smartfiq-ai-automation-logo.png" />

    <!-- Open Graph & Social Cards -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://smartfiq.website/case-studies/${item.slug}" />
    <meta property="og:title" content="${item.title} | SmartFiQ" />
    <meta property="og:description" content="${item.metaDesc}" />
    <meta property="og:image" content="${item.coverImage}" />
    <meta name="twitter:card" content="summary_large_image" />

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": "https://smartfiq.website/case-studies/${item.slug}#article",
          "headline": "${item.title}",
          "description": "${item.metaDesc}",
          "image": "${item.coverImage}",
          "author": {
            "@type": "Organization",
            "name": "${item.author}"
          },
          "publisher": {
            "@type": "Organization",
            "name": "SmartFiQ AI Solutions",
            "url": "https://smartfiq.website",
            "logo": {
              "@type": "ImageObject",
              "url": "https://smartfiq.website/smartfiq-ai-automation-logo.png"
            }
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://smartfiq.website/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Case Studies",
              "item": "https://smartfiq.website/case-studies"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "${item.clientName}",
              "item": "https://smartfiq.website/case-studies/${item.slug}"
            }
          ]
        }
      ]
    }
    </script>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1" rel="stylesheet" />
    <style>
        .font-plus-jakarta { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        body { background-color: #0A0A0A; color: #e5e2e1; font-family: 'Inter', sans-serif; }
        .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255, 86, 37, 0.15); }
    </style>
</head>

<body class="selection:bg-[#ff5625]/30 selection:text-[#ffb5a0] antialiased">
    <!-- Dynamic Header -->
    <div id="site-header"></div>

    <main class="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-plus-jakarta">
        <!-- Breadcrumbs -->
        <nav class="flex items-center text-xs text-stone-400 mb-8 space-x-2">
            <a href="/" class="hover:text-[#ff5625] transition-colors">Home</a>
            <span>/</span>
            <a href="/case-studies" class="hover:text-[#ff5625] transition-colors">Case Studies</a>
            <span>/</span>
            <span class="text-stone-200">${item.clientName}</span>
        </nav>

        <!-- Header Article Info -->
        <header class="mb-10">
            <div class="inline-block px-3 py-1 bg-[#ff5625]/10 border border-[#ff5625]/30 rounded-full text-xs font-bold text-[#ffb5a0] uppercase tracking-wider mb-4">
                ${item.categoryBadge}
            </div>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
                ${item.title}
            </h1>
            <div class="flex flex-wrap items-center gap-4 text-sm text-stone-400 border-b border-white/10 pb-6">
                <div>Client: <span class="text-white font-semibold">${item.clientName}</span></div>
                <span>•</span>
                <div>By <span class="text-white font-semibold">${item.author}</span></div>
                <span>•</span>
                <div>Impact: <span class="text-[#ffb5a0] font-bold">${item.metricsBadge}</span></div>
            </div>
        </header>

        <!-- Featured Image -->
        <div class="rounded-2xl overflow-hidden mb-12 border border-white/10 shadow-2xl">
            <img src="${item.coverImage}" alt="${item.title}" class="w-full h-auto object-cover max-h-[500px]" />
        </div>

        <!-- Article Pre-rendered HTML Body -->
        <article class="prose prose-invert prose-orange max-w-none space-y-8 text-stone-300 text-base sm:text-lg leading-relaxed">
${parsedContent}
        </article>

        <!-- Bottom Consultation CTA -->
        <div class="mt-16 glass-card rounded-3xl p-8 md:p-12 text-center border border-[#ff5625]/30 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-[#ff5625]/10 rounded-full blur-3xl pointer-events-none"></div>
            <h2 class="text-2xl md:text-3xl font-extrabold text-white mb-4">Want Similar AI ROI For Your Business?</h2>
            <p class="text-sm md:text-base text-[#E7BDB2] max-w-xl mx-auto mb-8">
                Our principal architects analyze your manual workflow bottlenecks and deliver a tailored automation roadmap within 48 hours.
            </p>
            <button onclick="openContactModal()" class="px-8 py-4 bg-gradient-to-r from-[#ff5625] to-[#920703] text-white font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_25px_rgba(255,86,37,0.4)] cursor-pointer">
                Book Free AI Consultation →
            </button>
        </div>
    </main>

    <!-- Modal Popup Container -->
    <div id="site-modal"></div>

    <!-- Dynamic Footer Container -->
    <div id="site-footer"></div>

    <script src="../components.js"></script>
    <script src="../cms-engine.js"></script>
</body>

</html>`;

  // Write inside case-studies/ folder
  const subFolderPath = path.join(caseStudiesDir, item.htmlFileName);
  fs.writeFileSync(subFolderPath, pageHtml, 'utf8');
  console.log(`Generated in case-studies/: ${item.htmlFileName}`);

  // Also write in root directory for fallbacks
  const rootFilePath = path.join(rootDir, item.htmlFileName);
  fs.writeFileSync(rootFilePath, pageHtml, 'utf8');
  console.log(`Generated in root: ${item.htmlFileName}`);
});
