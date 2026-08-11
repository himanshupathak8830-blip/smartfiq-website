const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const caseStudiesDir = path.join(rootDir, 'case-studies');
const blogDir = path.join(rootDir, 'blog');
const servicesDir = path.join(rootDir, 'services');

[caseStudiesDir, blogDir, servicesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function markdownToProseHTML(md) {
  if (!md) return '';

  const lines = md.split('\n');
  let contentLines = [];
  let inMetaHeader = false;
  let isFirstH1 = true;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (i === 0 && trimmed.startsWith('# ')) {
      // Skip top-level # heading in body because page <header> contains the <h1>
      continue;
    }
    if (trimmed.startsWith('**Meta Title:**') || trimmed.startsWith('**Meta Description:**') || trimmed.startsWith('**Target Keywords:**') || trimmed.startsWith('**Meta Description:')) {
      inMetaHeader = true;
      continue;
    }
    if (inMetaHeader && (trimmed === '---' || trimmed === '***')) {
      inMetaHeader = false;
      continue;
    }
    if (inMetaHeader) {
      continue;
    }
    contentLines.push(lines[i]);
  }

  let result = [];
  let inList = false;
  let listType = 'ul';
  let inTable = false;

  for (let i = 0; i < contentLines.length; i++) {
    let line = contentLines[i];
    const trimmed = line.trim();

    // Check Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      
      // Separator row like |---|---|
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        result.push('<div class="overflow-x-auto my-8"><table class="w-full text-left border-collapse border border-white/10 rounded-xl overflow-hidden"><thead><tr class="bg-[#1A1A1A] border-b border-white/10 text-white font-bold">');
        cells.forEach(cell => {
          result.push(`<th class="p-4 text-sm font-bold text-[#ffb5a0]">${parseInline(cell)}</th>`);
        });
        result.push('</tr></thead><tbody class="divide-y divide-white/5 text-stone-300 text-sm sm:text-base">');
      } else {
        result.push('<tr class="hover:bg-white/5 transition-colors">');
        cells.forEach(cell => {
          result.push(`<td class="p-4">${parseInline(cell)}</td>`);
        });
        result.push('</tr>');
      }
      continue;
    } else if (inTable) {
      result.push('</tbody></table></div>');
      inTable = false;
    }

    // Check Headings - convert # and ## to h2 for single 1 h1 constraint
    if (trimmed.startsWith('# ')) {
      if (inList) { result.push(`</${listType}>`); inList = false; }
      const text = parseInline(trimmed.substring(2));
      result.push(`<h2 class="text-2xl sm:text-3xl font-bold text-white mt-12 mb-6 border-b border-white/10 pb-3">${text}</h2>`);
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
    <p class="text-base text-[#E7BDB2] italic leading-relaxed mb-0">${text}</p>
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
  if (inTable) {
    result.push('</tbody>mtable></div>');
  }

  return result.join('\n');
}

function parseInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-[#E7BDB2]">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#1A1A1A] text-[#ffb5a0] px-2 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#ff5625] font-semibold hover:underline transition-colors">$1</a>');
}

function formatSeoTitle(rawTitle) {
  if (!rawTitle) return 'SmartFiQ AI Solutions';
  let cleaned = rawTitle.replace(/\|.*/, '').trim();
  if (cleaned.length > 55) {
    cleaned = cleaned.substring(0, 55).replace(/\s+\S*$/, '');
  }
  return `${cleaned} | SmartFiQ`;
}

function renderFullPageHTML({ title, metaDesc, canonicalUrl, sectionName, sectionLink, badgeText, coverImage, author, date, metricsBadge, contentHtml, ctaTitle, ctaSubtitle }) {
  const seoTitle = formatSeoTitle(title);
  return `<!DOCTYPE html>
<html class="dark" lang="en">

<head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>${seoTitle}</title>
    <meta name="description" content="${metaDesc}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" type="image/png" href="/logo-transparent.png" />

    <!-- Open Graph & Social Cards -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${seoTitle}" />
    <meta property="og:description" content="${metaDesc}" />
    <meta property="og:image" content="${coverImage || 'https://smartfiq.website/logo-transparent.png'}" />
    <meta name="twitter:card" content="summary_large_image" />

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "@id": "${canonicalUrl}#article",
          "headline": "${title.replace(/"/g, '\\"')}",
          "description": "${metaDesc.replace(/"/g, '\\"')}",
          "image": "${coverImage || 'https://smartfiq.website/logo-transparent.png'}",
          "author": {
            "@type": "Organization",
            "name": "${author || 'SmartFiQ AI Lab'}"
          },
          "publisher": {
            "@type": "Organization",
            "name": "SmartFiQ AI Solutions",
            "url": "https://smartfiq.website",
            "logo": {
              "@type": "ImageObject",
              "url": "https://smartfiq.website/logo-transparent.png"
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
              "name": "${sectionName}",
              "item": "https://smartfiq.website${sectionLink}"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "${title.replace(/"/g, '\\"')}",
              "item": "${canonicalUrl}"
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
        .primary-gradient { background: linear-gradient(45deg, #ff5625, #920703); }
        .lava-gradient-text { background: linear-gradient(45deg, #ff5625, #ffb5a0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
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
            <a href="${sectionLink}" class="hover:text-[#ff5625] transition-colors">${sectionName}</a>
            <span>/</span>
            <span class="text-stone-200">${title}</span>
        </nav>

        <!-- Header Article Info -->
        <header class="mb-10">
            ${badgeText ? `<div class="inline-block px-3 py-1 bg-[#ff5625]/10 border border-[#ff5625]/30 rounded-full text-xs font-bold text-[#ffb5a0] uppercase tracking-wider mb-4">
                ${badgeText}
            </div>` : ''}
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
                ${title}
            </h1>
            <div class="flex flex-wrap items-center gap-4 text-sm text-stone-400 border-b border-white/10 pb-6">
                ${author ? `<div>By <span class="text-white font-semibold">${author}</span></div>` : ''}
                ${date ? `<span>•</span><div>Published: <span class="text-stone-300">${date}</span></div>` : ''}
                ${metricsBadge ? `<span>•</span><div>Highlight: <span class="text-[#ffb5a0] font-bold">${metricsBadge}</span></div>` : ''}
            </div>
        </header>

        ${coverImage ? `<!-- Featured Image -->
        <div class="rounded-2xl overflow-hidden mb-12 border border-white/10 shadow-2xl">
            <img src="${coverImage}" alt="${title}" class="w-full h-auto object-cover max-h-[500px]" />
        </div>` : ''}

        <!-- Article Pre-rendered HTML Body -->
        <article class="prose prose-invert prose-orange max-w-none space-y-6 text-stone-300 text-base sm:text-lg leading-relaxed">
${contentHtml}
        </article>

        <!-- Bottom Consultation CTA -->
        <div class="mt-16 glass-card rounded-3xl p-8 md:p-12 text-center border border-[#ff5625]/30 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-[#ff5625]/10 rounded-full blur-3xl pointer-events-none"></div>
            <h2 class="text-2xl md:text-3xl font-extrabold text-white mb-4">${ctaTitle || 'Ready to Scale Your Operations with AI?'}</h2>
            <p class="text-sm md:text-base text-[#E7BDB2] max-w-xl mx-auto mb-8">
                ${ctaSubtitle || 'Our principal architects analyze your manual workflow bottlenecks and deliver a tailored automation roadmap within 48 hours.'}
            </p>
            <button onclick="openContactModal()" class="px-8 py-4 primary-gradient text-white font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_25px_rgba(255,86,37,0.4)] cursor-pointer">
                Book Free AI Audit →
            </button>
        </div>
    </main>

    <!-- Modal Popup Container -->
    <div id="site-modal"></div>

    <!-- Dynamic Footer Container -->
    <div id="site-footer"></div>

    <script src="/components.js"></script>
    <script src="/cms-engine.js"></script>
</body>

</html>`;
}

// ----------------------------------------------------
// 1. BUILD CASE STUDIES HTML PAGES
// ----------------------------------------------------
const caseStudiesConfig = [
  {
    mdFileName: 'E-Commerce Retail Co_ How WhatsApp Automation Scaled Customer Support to 50K+ Monthly Active Users.md',
    htmlFileName: 'whatsapp-automation-guide.html',
    slug: 'whatsapp-automation-guide',
    title: 'E-Commerce Retail Co: How WhatsApp Automation Scaled Customer Support to 50K+ Monthly Active Users',
    categoryBadge: 'WhatsApp Automation Case Study',
    author: 'SmartFiQ Systems Architect',
    date: 'August 2026',
    metricsBadge: '85% Resolution Cut',
    coverImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfOxYS-ZbkAlIiB-Hf_glz2BrQKPhekHmrEUu7jefG3s88z854mngU68wi&s=10',
    metaDesc: 'Detailed case study on how E-Commerce Retail Co scaled WhatsApp customer support to 50,000+ monthly active users with SmartFiQ AI automation.'
  },
  {
    mdFileName: 'Lead Extraction & Email Enrichment Agent.md',
    htmlFileName: 'lead-extraction-agent.html',
    slug: 'lead-extraction-agent',
    title: 'Lead Extraction & Email Enrichment Agent: Automating Sales Pipeline',
    categoryBadge: 'Lead Gen & Scraper Case Study',
    author: 'SmartFiQ Automation Team',
    date: 'August 2026',
    metricsBadge: '140+ Meetings Monthly',
    coverImage: 'https://media.licdn.com/dms/image/v2/D4D12AQE9-axP-Ajqcg/article-cover_image-shrink_720_1280/B4DZWlxArvHAAY-/0/1742242847803?e=1787788800&v=beta&t=TEnsSbWt31XHTTiVQ85cRw3cxEOhrftDy4Xg420Nvos',
    metaDesc: 'Case study on automating lead generation, web scraping, email enrichment, and automated sales outreach with SmartFiQ AI agents.'
  },
  {
    mdFileName: 'Automated Data Modeling & Executive BI Dashboard.md',
    htmlFileName: 'data-modeling-bi-dashboard.html',
    slug: 'data-modeling-bi-dashboard',
    title: 'Automated Data Modeling & Executive BI Dashboard',
    categoryBadge: 'BI & Data Pipeline Case Study',
    author: 'SmartFiQ Data Engineering Lab',
    date: 'August 2026',
    metricsBadge: '$120k Saved Annually',
    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
    metaDesc: 'Case study on building automated ETL data modeling pipelines and Looker Studio DAX dashboards for real-time revenue reporting.'
  }
];

caseStudiesConfig.forEach(item => {
  const mdPath = path.join(rootDir, item.mdFileName);
  if (fs.existsSync(mdPath)) {
    const mdContent = fs.readFileSync(mdPath, 'utf8').trim();
    const parsedContent = markdownToProseHTML(mdContent);
    const htmlPage = renderFullPageHTML({
      title: item.title,
      metaDesc: item.metaDesc,
      canonicalUrl: `https://smartfiq.website/case-studies/${item.slug}`,
      sectionName: 'Case Studies',
      sectionLink: '/case-studies',
      badgeText: item.categoryBadge,
      coverImage: item.coverImage,
      author: item.author,
      date: item.date,
      metricsBadge: item.metricsBadge,
      contentHtml: parsedContent,
      ctaTitle: 'Want Similar AI ROI For Your Business?',
      ctaSubtitle: 'Our principal architects analyze your manual workflow bottlenecks and deliver a tailored automation roadmap within 48 hours.'
    });

    fs.writeFileSync(path.join(caseStudiesDir, item.htmlFileName), htmlPage, 'utf8');
    fs.writeFileSync(path.join(rootDir, item.htmlFileName), htmlPage, 'utf8');
    console.log(`Generated Case Study HTML: case-studies/${item.htmlFileName}`);
  }
});

// ----------------------------------------------------
// 2. BUILD BLOG HTML PAGES
// ----------------------------------------------------
const blogConfig = [
  {
    mdFileName: 'What Is AI Automation_ A Complete Guide to AI Automation for Businesses.md',
    htmlFileName: 'what-is-ai-automation-guide.html',
    slug: 'what-is-ai-automation-guide',
    title: 'What Is AI Automation? A Complete Guide to AI Automation for Businesses',
    categoryBadge: 'AI Automation Guide',
    author: 'SmartFiQ AI Lab',
    date: '2026-07-20',
    coverImage: 'https://media.licdn.com/dms/image/v2/D4D12AQE-AiKp6gZZ9Q/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1727069319719?e=1787788800&v=beta&t=H-eMPdDuZMWH2koOoR1sE6Jsox4wQ8dGGg6QunL4lbM',
    metaDesc: 'Discover how autonomous workflow orchestration and intelligent AI agents are redefining business operations and driving 10x throughput for modern Indian enterprises.'
  },
  {
    mdFileName: 'blog-1-whatsapp-automation-guide.md',
    htmlFileName: 'whatsapp-automation-guide.html',
    slug: 'whatsapp-automation-guide',
    title: 'How WhatsApp Automation Increases Sales by 300% in India',
    categoryBadge: 'Messaging & Sales',
    author: 'SmartFiQ CX Specialist',
    date: '2026-07-21',
    coverImage: 'https://enterpriseautomation.in/wp-content/uploads/2026/08/How-WhatsApp-Automation-Can-Help-Small-Businesses-Increase-Conversions_enterpriseautomation-scaled.jpg',
    metaDesc: 'A complete step-by-step guide on scaling customer service, capturing 24/7 leads, and automating broadcasts with WhatsApp Business API and CRM syncing.'
  },
  {
    mdFileName: 'blog-2-ai-voice-agents-vs-human-support.md',
    htmlFileName: 'ai-voice-agents-vs-human-support.html',
    aliasFileNames: ['ai-chatbots-vs-human-support.html'],
    slug: 'ai-voice-agents-vs-human-support',
    title: 'AI Voice Agents vs Human Support: ROI & Setup Guide for Indian Businesses',
    categoryBadge: 'Voice AI & ROI',
    author: 'SmartFiQ CX Lab',
    date: '2026-07-22',
    coverImage: 'https://www.nextiva.com/cdn-cgi/image/width=1300,format=auto/blog/wp-content/uploads/sites/10/2025/12/AI-Voice-Agent-Services-for-Businesses-1.webp',
    metaDesc: 'Finding the perfect sweet spot between instantaneous AI response times and deep human empathy in modern customer experience management.'
  },
  {
    mdFileName: 'blog-3-future-of-no-code-ai-automation.md',
    htmlFileName: 'future-of-no-code-ai-automation.html',
    aliasFileNames: ['ai-voice-agents-explained.html'],
    slug: 'future-of-no-code-ai-automation',
    title: 'The Future of No-Code AI Automation for Growing Enterprises',
    categoryBadge: 'No-Code & Future Tech',
    author: 'SmartFiQ Tech Team',
    date: '2026-07-23',
    coverImage: 'https://media.licdn.com/dms/image/v2/D4E12AQFNmb5Iel8ZCQ/article-cover_image-shrink_720_1280/B4EZY.jkqBHUAI-/0/1744806235909?e=1787788800&v=beta&t=hl-2NZrIHI8tu9WWMWMwAbqrhMC6kjvher3DM-eaFZs',
    metaDesc: 'How visual workflow builders, LLM function calling, and voice synthesis empower businesses to automate phone calls and appointment bookings.'
  },
  {
    mdFileName: 'blog-4-enterprise-ai-security-data-privacy.md',
    htmlFileName: 'enterprise-ai-security-data-privacy.html',
    aliasFileNames: ['top-processes-to-automate-with-ai.html'],
    slug: 'enterprise-ai-security-data-privacy',
    title: 'Enterprise AI Security & Data Privacy Protocols in 2026',
    categoryBadge: 'Security & Privacy',
    author: 'SmartFiQ Security',
    date: '2026-07-24',
    coverImage: 'https://community.trustcloud.ai/kbuPFACeFReXReB/uploads/2025/04/Data-privacy-in-2025-What-lies-ahead-Trends-and-predictions.jpg',
    metaDesc: 'A practical checklist of the highest-ROI business processes worth automating first with artificial intelligence and workflow orchestration.'
  }
];

blogConfig.forEach(item => {
  const mdPath = path.join(rootDir, item.mdFileName);
  if (fs.existsSync(mdPath)) {
    const mdContent = fs.readFileSync(mdPath, 'utf8').trim();
    const parsedContent = markdownToProseHTML(mdContent);
    const htmlPage = renderFullPageHTML({
      title: item.title,
      metaDesc: item.metaDesc,
      canonicalUrl: `https://smartfiq.website/blog/${item.slug}`,
      sectionName: 'Blog',
      sectionLink: '/blog',
      badgeText: item.categoryBadge,
      coverImage: item.coverImage,
      author: item.author,
      date: item.date,
      contentHtml: parsedContent,
      ctaTitle: 'Ready to Automate Your Business?',
      ctaSubtitle: 'Subscribe to SmartFiQ Insights or schedule a zero-risk 30-minute automation audit with our principal AI engineers.'
    });

    fs.writeFileSync(path.join(blogDir, item.htmlFileName), htmlPage, 'utf8');
    console.log(`Generated Blog HTML: blog/${item.htmlFileName}`);

    if (item.aliasFileNames) {
      item.aliasFileNames.forEach(alias => {
        fs.writeFileSync(path.join(blogDir, alias), htmlPage, 'utf8');
        console.log(`Generated Blog Alias HTML: blog/${alias}`);
      });
    }
  }
});

// ----------------------------------------------------
// 3. BUILD SERVICES HTML PAGES
// ----------------------------------------------------
const servicesFolderMD = path.join(rootDir, 'services.md');

if (fs.existsSync(servicesFolderMD)) {
  const serviceFiles = fs.readdirSync(servicesFolderMD).filter(f => f.endsWith('.md'));

  serviceFiles.forEach(file => {
    const mdPath = path.join(servicesFolderMD, file);
    const mdContent = fs.readFileSync(mdPath, 'utf8').trim();
    const slug = file.replace(/\.md$/, '');

    let metaTitleMatch = mdContent.match(/\*\*Meta Title:\*\*\s*(.*)/i);
    let metaDescMatch = mdContent.match(/\*\*Meta Description:\*\*\s*(.*)/i);
    let h1Match = mdContent.match(/^#\s*(.*)/m);

    let title = h1Match ? h1Match[1].replace(/\|.*/, '').trim() : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (metaTitleMatch) title = metaTitleMatch[1].replace(/\|.*/, '').trim();

    let metaDesc = metaDescMatch ? metaDescMatch[1].trim() : `SmartFiQ professional service page for ${title}. Modern, automated, enterprise-ready.`;

    const parsedContent = markdownToProseHTML(mdContent);

    const htmlPage = renderFullPageHTML({
      title: title,
      metaDesc: metaDesc,
      canonicalUrl: `https://smartfiq.website/services/${slug}`,
      sectionName: 'Services',
      sectionLink: '/services',
      badgeText: 'SmartFiQ Service',
      author: 'SmartFiQ Service Engineering',
      date: 'August 2026',
      contentHtml: parsedContent,
      ctaTitle: `Automate ${title} Today`,
      ctaSubtitle: 'Talk directly with our technical lead to integrate this custom solution into your business workflow within 48-72 hours.'
    });

    const targetHtmlPath = path.join(servicesDir, `${slug}.html`);
    fs.writeFileSync(targetHtmlPath, htmlPage, 'utf8');
    console.log(`Generated Service HTML: services/${slug}.html`);

    const aliasMap = {
      'ai-voice-call-agents': ['ai-voice-call-agents-for-business.html', 'ai-voice-agents.html'],
      'bulk-whatsapp-marketing': ['bulk-whatsapp-marketing-solutions.html'],
      'website-development': ['website-development-m.html'],
      'viralpilot-ai-social-reel-automation': ['viralpilot.html', 'viral-pilot.html'],
      'logo-brand-identity-design': ['logo-and-brand-identity-design.html', 'logo-design.html']
    };

    if (aliasMap[slug]) {
      aliasMap[slug].forEach(alias => {
        fs.writeFileSync(path.join(servicesDir, alias), htmlPage, 'utf8');
        console.log(`Generated Service Alias HTML: services/${alias}`);
      });
    }
  });
}

console.log('All Case Study, Blog, and Service HTML pages generated successfully!');
