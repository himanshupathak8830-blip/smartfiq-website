/**
 * SmartFiQ AI Automation - Centralized CMS State Engine (cms-engine.js)
 * Provides unified state management for Team Members, Case Studies, and Global Hero Content.
 */

(function () {
    const DEFAULT_TEAM = [
        {
            id: 1,
            name: "Himanshu Pathak",
            role: "Founder & Principal AI Architect",
            bio: "Specializes in enterprise LLM orchestration, vector databases, and high-frequency workflow automation using n8n and Python.",
            image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400",
            linkedin: "https://www.linkedin.com/company/smartfiq/"
        },
        {
            id: 2,
            name: "Aman Verma",
            role: "Head of Solutions & Voice AI",
            bio: "Pioneers natural conversational Voice AI agents and Meta WhatsApp Business API integrations for retail and real estate enterprises.",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400",
            linkedin: "https://www.linkedin.com/company/smartfiq/"
        },
        {
            id: 3,
            name: "Priya Iyer",
            role: "Lead Data & BI Engineer",
            bio: "Expert in automated ETL pipelines, DAX modeling, and executive Looker Studio dashboards for real-time revenue tracking.",
            image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400",
            linkedin: "https://www.linkedin.com/company/smartfiq/"
        }
    ];

    const DEFAULT_CASE_STUDIES = [
        {
            id: 1,
            client: "E-Commerce Retail Co",
            title: "Automated WhatsApp Support Scaling to 50k MAU",
            metrics: "85% Resolution Cut",
            challenge: "Client was overwhelmed with over 2,000 daily order status and return inquiries causing support delays and missed sales.",
            solution: "Built a custom WhatsApp Business API bot connected to Shopify API & OpenAI function calling, automating order tracking and Instant FAQs with zero human agent intervention.",
            image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600",
            featured: true
        },
        {
            id: 2,
            client: "Real Estate Group",
            title: "Lead Extraction & Email Enrichment Agent",
            metrics: "140+ Meetings Monthly",
            challenge: "Manual property lead qualification was taking 4+ hours per agent daily, leading to cold response rates.",
            solution: "Architected an automated n8n workflow using webhooks, Google Maps enrichment, and Voice AI agent follow-ups, qualification scores, and direct Calendly scheduling.",
            image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600",
            featured: true
        },
        {
            id: 3,
            client: "Enterprise Logistics",
            title: "Automated Data Modeling & Executive BI Dashboard",
            metrics: "$120k Saved Annually",
            challenge: "Data scattered across multi-channel sales reports caused delayed financial decision-making.",
            solution: "Engineered automated ETL pipelines and Looker Studio DAX dashboards providing real-time revenue forecasting and operational bottleneck alerts.",
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600",
            featured: true
        }
    ];

    // Core State Initialization
    window.SmartfiqCMS = {
        team: [],
        caseStudies: [],

        async init() {
            // Load Agency Team
            try {
                const res = await fetch('/api/agency-team');
                if (res.ok) {
                    this.team = await res.json();
                    localStorage.setItem('smartfiq_agency_team', JSON.stringify(this.team));
                }
            } catch (err) {
                const stored = localStorage.getItem('smartfiq_agency_team');
                this.team = stored ? JSON.parse(stored) : DEFAULT_TEAM;
            }
            if (!this.team || this.team.length === 0) this.team = DEFAULT_TEAM;

            // Load Case Studies
            try {
                const res = await fetch('/api/case-studies');
                if (res.ok) {
                    this.caseStudies = await res.json();
                    localStorage.setItem('smartfiq_case_studies', JSON.stringify(this.caseStudies));
                }
            } catch (err) {
                const stored = localStorage.getItem('smartfiq_case_studies');
                this.caseStudies = stored ? JSON.parse(stored) : DEFAULT_CASE_STUDIES;
            }
            if (!this.caseStudies || this.caseStudies.length === 0) this.caseStudies = DEFAULT_CASE_STUDIES;
        },

        getAgencyTeam() {
            if (!this.team || this.team.length === 0) {
                const stored = localStorage.getItem('smartfiq_agency_team');
                return stored ? JSON.parse(stored) : DEFAULT_TEAM;
            }
            return this.team;
        },

        getAgencyTeamById(id) {
            return this.getAgencyTeam().find(m => m.id === Number(id));
        },

        async saveAgencyTeamMember(member) {
            let team = this.getAgencyTeam();
            if (member.id) {
                const idx = team.findIndex(m => m.id === member.id);
                if (idx !== -1) team[idx] = member;
                else team.push(member);
            } else {
                member.id = team.length > 0 ? Math.max(...team.map(m => m.id || 0)) + 1 : 1;
                team.push(member);
            }
            this.team = team;
            localStorage.setItem('smartfiq_agency_team', JSON.stringify(team));

            try {
                await fetch('/api/agency-team', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(member)
                });
            } catch (e) {
                console.warn('API save fallback:', e);
            }
            return member;
        },

        async deleteAgencyTeamMember(id) {
            let team = this.getAgencyTeam().filter(m => m.id !== Number(id));
            this.team = team;
            localStorage.setItem('smartfiq_agency_team', JSON.stringify(team));

            try {
                await fetch(`/api/agency-team/${id}`, { method: 'DELETE' });
            } catch (e) {
                console.warn('API delete fallback:', e);
            }
            return true;
        },

        getCaseStudies() {
            if (!this.caseStudies || this.caseStudies.length === 0) {
                const stored = localStorage.getItem('smartfiq_case_studies');
                return stored ? JSON.parse(stored) : DEFAULT_CASE_STUDIES;
            }
            return this.caseStudies;
        },

        getCaseStudyById(id) {
            return this.getCaseStudies().find(c => c.id === Number(id));
        },

        async saveCaseStudy(cs) {
            let list = this.getCaseStudies();
            if (cs.id) {
                const idx = list.findIndex(c => c.id === cs.id);
                if (idx !== -1) list[idx] = cs;
                else list.push(cs);
            } else {
                cs.id = list.length > 0 ? Math.max(...list.map(c => c.id || 0)) + 1 : 1;
                list.push(cs);
            }
            this.caseStudies = list;
            localStorage.setItem('smartfiq_case_studies', JSON.stringify(list));

            try {
                await fetch('/api/case-studies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cs)
                });
            } catch (e) {
                console.warn('API save fallback:', e);
            }
            return cs;
        },

        async deleteCaseStudy(id) {
            let list = this.getCaseStudies().filter(c => c.id !== Number(id));
            this.caseStudies = list;
            localStorage.setItem('smartfiq_case_studies', JSON.stringify(list));

            try {
                await fetch(`/api/case-studies/${id}`, { method: 'DELETE' });
            } catch (e) {
                console.warn('API delete fallback:', e);
            }
            return true;
        },

        async loadCMSContent() {
            // Website CMS Fix: Fetch live CMS configuration from /api/cms and dynamically populate public page DOM elements on page load.
            try {
                let cms = null;
                const res = await fetch(`/api/cms?t=${Date.now()}`);
                if (res.ok) {
                    cms = await res.json();
                    localStorage.setItem('smartfiq_cms', JSON.stringify(cms));
                } else {
                    const stored = localStorage.getItem('smartfiq_cms');
                    if (stored) cms = JSON.parse(stored);
                }

                if (!cms) return;

                // Inject Hero Title
                const heroTitleEl = document.getElementById('hero-title') || document.getElementById('heroTitle');
                if (heroTitleEl && cms.heroTitle) {
                    heroTitleEl.innerHTML = cms.heroTitle;
                }

                // Inject Hero Subtitle
                const heroSubtitleEl = document.getElementById('hero-subtitle') || document.getElementById('heroSubtitle');
                if (heroSubtitleEl && cms.heroSubtitle) {
                    heroSubtitleEl.textContent = cms.heroSubtitle;
                }

                // Inject About Title
                const aboutTitleEl = document.getElementById('about-title') || document.getElementById('aboutTitle');
                if (aboutTitleEl && cms.aboutTitle) {
                    aboutTitleEl.innerHTML = cms.aboutTitle;
                }

                // Inject About Content
                const aboutContentEl = document.getElementById('about-content') || document.getElementById('aboutContent');
                if (aboutContentEl && cms.aboutContent) {
                    aboutContentEl.textContent = cms.aboutContent;
                }

                // Inject Contact Email
                const email = cms.contactEmail || cms.consultEmail || cms.supportEmail;
                if (email) {
                    document.querySelectorAll('.cms-contact-email, #contact-email').forEach(el => {
                        el.textContent = email;
                        if (el.tagName === 'A') el.href = `mailto:${email}`;
                    });
                }

                // Inject Contact Phone
                if (cms.contactPhone) {
                    document.querySelectorAll('.cms-contact-phone, #contact-phone').forEach(el => {
                        el.textContent = cms.contactPhone;
                        if (el.tagName === 'A') el.href = `tel:${cms.contactPhone.replace(/\s+/g, '')}`;
                    });
                }

                // Inject WhatsApp Link
                if (cms.whatsappNumber) {
                    document.querySelectorAll('.cms-whatsapp-link, #whatsapp-number').forEach(el => {
                        if (el.tagName === 'A') el.href = `https://wa.me/${cms.whatsappNumber.replace(/\+/g, '').replace(/\s+/g, '')}`;
                        else el.textContent = cms.whatsappNumber;
                    });
                }

                // Inject Footer Copyright / Text
                if (cms.footerText) {
                    const footerTextEl = document.getElementById('footer-copyright') || document.getElementById('cms-footer-text');
                    if (footerTextEl) footerTextEl.textContent = cms.footerText;
                }
            } catch (err) {
                console.warn('CMS content load error:', err);
            }
        }
    };

    // Auto init and load CMS dynamic content
    window.SmartfiqCMS.init();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.SmartfiqCMS.loadCMSContent());
    } else {
        window.SmartfiqCMS.loadCMSContent();
    }
})();
