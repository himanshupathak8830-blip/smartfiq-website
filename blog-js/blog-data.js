/**
 * SMARTFIQ Dynamic Blog Data Store & Management Library
 * Centralized LocalStorage & API Data Controller for Insights & Articles.
 */

(function () {
    const STORAGE_KEY = 'smartfiq_blogs';
    const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23ff5625'/%3E%3Ctext x='50' y='58' font-size='36' font-weight='bold' fill='%23ffffff' text-anchor='middle' font-family='sans-serif'%3ESF%3C/text%3E%3C/svg%3E";

    const SEED_ARTICLES = [
        {
            id: 1,
            slug: "what-is-ai-automation-guide",
            title: "What is AI Automation and How Can It Grow Your Business?",
            category: "AI Automation",
            readTime: "12 min",
            author: "SmartFiQ AI Lab",
            authorRole: "Principal Systems Architect",
            authorAvatar: DEFAULT_AVATAR,
            date: "2026-07-20",
            coverImage: "https://media.licdn.com/dms/image/v2/D4D12AQE-AiKp6gZZ9Q/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1727069319719?e=1787788800&v=beta&t=H-eMPdDuZMWH2koOoR1sE6Jsox4wQ8dGGg6QunL4lbM",
            excerpt: "Discover how autonomous workflow orchestration and intelligent AI agents are redefining business operations and driving 10x throughput for modern Indian enterprises."
        },
        {
            id: 2,
            slug: "whatsapp-automation-guide",
            title: "How WhatsApp Automation Increases Sales by 300% in India",
            category: "Messaging",
            readTime: "8 min",
            author: "SmartFiQ CX Specialist",
            authorRole: "Conversational AI Strategist",
            authorAvatar: DEFAULT_AVATAR,
            date: "2026-07-21",
            coverImage: "https://enterpriseautomation.in/wp-content/uploads/2026/08/How-WhatsApp-Automation-Can-Help-Small-Businesses-Increase-Conversions_enterpriseautomation-scaled.jpg",
            excerpt: "A complete step-by-step guide on scaling customer service, capturing 24/7 leads, and automating broadcasts with WhatsApp Business API and CRM syncing."
        },
        {
            id: 3,
            slug: "ai-chatbots-vs-human-support",
            title: "AI Voice Agents vs Human Support: ROI & Setup Guide for Indian Businesses",
            category: "Strategy",
            readTime: "15 min",
            author: "SmartFiQ CX Lab",
            authorRole: "Lead Support Operations Analyst",
            authorAvatar: DEFAULT_AVATAR,
            date: "2026-07-22",
            coverImage: "https://www.nextiva.com/cdn-cgi/image/width=1300,format=auto/blog/wp-content/uploads/sites/10/2025/12/AI-Voice-Agent-Services-for-Businesses-1.webp",
            excerpt: "Finding the perfect sweet spot between instantaneous AI response times and deep human empathy in modern customer experience management."
        },
        {
            id: 4,
            slug: "ai-voice-agents-explained",
            title: "The Future of No-Code AI Automation for Growing Enterprises",
            category: "Future Tech",
            readTime: "6 min",
            author: "SmartFiQ Tech Team",
            authorRole: "No-Code Ecosystem Lead",
            authorAvatar: DEFAULT_AVATAR,
            date: "2026-07-23",
            coverImage: "https://media.licdn.com/dms/image/v2/D4E12AQFNmb5Iel8ZCQ/article-cover_image-shrink_720_1280/B4EZY.jkqBHUAI-/0/1744806235909?e=1787788800&v=beta&t=hl-2NZrIHI8tu9WWMWMwAbqrhMC6kjvher3DM-eaFZs",
            excerpt: "How visual workflow builders, LLM function calling, and voice synthesis empower businesses to automate phone calls and appointment bookings."
        },
        {
            id: 5,
            slug: "top-processes-to-automate-with-ai",
            title: "Enterprise AI Security & Data Privacy Protocols in 2026",
            category: "Security",
            readTime: "10 min",
            author: "SmartFiQ Security",
            authorRole: "Cybersecurity & Data Privacy Officer",
            authorAvatar: DEFAULT_AVATAR,
            date: "2026-07-24",
            coverImage: "https://community.trustcloud.ai/kbuPFACeFReXReB/uploads/2025/04/Data-privacy-in-2025-What-lies-ahead-Trends-and-predictions.jpg",
            excerpt: "A practical checklist of the highest-ROI business processes worth automating first with artificial intelligence and workflow orchestration."
        }
    ];

    let articlesCache = null;

    function normalizeArticle(article) {
        const coverImage = article.coverImage || article.cover_image_url || article.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";
        const excerpt = article.excerpt || article.summary || "";
        const seedMatch = SEED_ARTICLES.find(s => Number(s.id) === Number(article.id) || s.slug === article.slug);
        const slug = article.slug || (seedMatch ? seedMatch.slug : null) || (article.title ? article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `article-${article.id}`);
        const content = article.content || article.body || (excerpt ? `<p>${excerpt}</p>` : "");
        return {
            ...article,
            slug,
            coverImage: seedMatch ? seedMatch.coverImage : coverImage,
            image: seedMatch ? seedMatch.coverImage : coverImage,
            content,
            excerpt,
            summary: excerpt,
            readTime: article.readTime || "6 min",
            date: article.date || new Date().toISOString().split("T")[0],
            author: article.author || "SmartFiQ Author",
            authorRole: article.authorRole || "AI Researcher",
            authorAvatar: article.authorAvatar || DEFAULT_AVATAR
        };
    }

    function initSeedData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ARTICLES));
        articlesCache = SEED_ARTICLES.map(normalizeArticle);
    }

    const SmartfiqBlog = {
        init: function () {
            initSeedData();
            this.ready = this.loadArticles();
        },

        loadArticles: async function () {
            try {
                const res = await fetch(`/api/blogs?t=${Date.now()}`, { cache: "no-store" });
                if (res.ok) {
                    const articles = await res.json();
                    if (Array.isArray(articles) && articles.length > 0) {
                        articlesCache = articles.map(normalizeArticle);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(articlesCache));
                        return articlesCache;
                    }
                }
            } catch (err) {
                console.warn("Blog API unavailable, using local cache:", err);
            }
            initSeedData();
            return articlesCache;
        },

        getArticles: function () {
            if (!articlesCache) initSeedData();
            return articlesCache;
        },

        getBlogUrl: function (article) {
            if (!article) return '/blog';
            if (article.slug) return `/blog/${article.slug}`;
            return `/blog`;
        },

        getArticleBySlug: function (slug) {
            const articles = this.getArticles();
            return articles.find(a => a.slug === slug) || null;
        },

        getArticleById: function (id) {
            const articles = this.getArticles();
            return articles.find(a => Number(a.id) === Number(id)) || null;
        }
    };

    SmartfiqBlog.init();
    window.SmartfiqBlog = SmartfiqBlog;
})();
