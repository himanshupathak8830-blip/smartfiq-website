/**
 * SMARTFIQ Web Components & Layout Manager
 * Single source of truth for Header, Footer, Lead Modal, and Site Scripts.
 */

(function () {
    // Determine active page name from URL
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const activePage = (currentPath === '' || currentPath === '/') ? 'index.html' : currentPath;

    // --- 1. HEADER COMPONENT ---
    function renderHeader() {
        const existingHeader = document.getElementById('smartfiq-header');
        const headerContainer = document.getElementById('site-header') || document.getElementById('smartfiq-header-container');

        const navLinks = [
            { name: 'Home', href: 'index.html' },
            { name: 'Services', href: 'Services.html' },
            { name: 'Case Studies', href: 'case-studies.html' },
            { name: 'Blog', href: 'blog.html' },
            { name: 'About', href: 'About.html' }
        ];

        const desktopNavHTML = navLinks.map(link => {
            const isActive = activePage.toLowerCase() === link.href.toLowerCase();
            const textClass = isActive ? 'text-[#FF6B3D]' : 'text-[#B8B8B8] hover:text-[#FF6B3D]';
            const lineClass = isActive ? 'w-full' : 'w-0 group-hover:w-full';
            return `
                <a href="${link.href}" class="relative py-1 text-[15px] font-medium tracking-[0.2px] ${textClass} transition-colors duration-300 group">
                    ${link.name}
                    <span class="absolute bottom-0 left-1/2 -translate-x-1/2 ${lineClass} h-[2px] bg-[#FF6B3D] rounded-full transition-all duration-300"></span>
                </a>
            `;
        }).join('');

        const mobileNavHTML = navLinks.map(link => {
            const isActive = activePage.toLowerCase() === link.href.toLowerCase();
            const textClass = isActive ? 'text-[#FF6B3D]' : 'text-[#B8B8B8] hover:text-[#FF6B3D]';
            return `
                <a href="${link.href}" onclick="toggleSmartfiqMobileMenu()" class="${textClass} font-medium text-[16px] tracking-[0.2px] py-2 border-b border-white/5 transition-colors">${link.name}</a>
            `;
        }).join('');

        if (headerContainer && !existingHeader) {
            headerContainer.innerHTML = `
            <header id="smartfiq-header"
                class="fixed top-[20px] left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-[1180px] h-[64px] rounded-full bg-[rgba(15,15,18,0.75)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.12)] shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-all duration-300 ease-in-out font-plus-jakarta">
                <div class="w-full h-full px-6 flex items-center justify-between relative">
                    <!-- LEFT: Transparent Logo -->
                    <a href="index.html" class="flex items-center group">
                        <img src="logo-transparent.png" alt="SmartFiQ Logo" class="h-8 md:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
                    </a>

                    <!-- CENTER: Navigation Links -->
                    <nav class="hidden md:flex items-center space-x-7 lg:space-x-9">
                        ${desktopNavHTML}
                    </nav>

                    <!-- RIGHT: Primary CTA Button -->
                    <div class="hidden md:flex items-center">
                        <button onclick="openContactModal()" class="inline-flex items-center justify-center px-[28px] py-[14px] text-[15px] font-semibold text-white bg-gradient-to-r from-[#FF6B3D] to-[#FF3D00] rounded-full transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(255,107,61,0.5)] active:scale-95 cursor-pointer">
                            Book Consultation &rarr;
                        </button>
                    </div>

                    <!-- Mobile Hamburger Menu Button -->
                    <button id="mobileMenuBtn" onclick="toggleSmartfiqMobileMenu()" class="md:hidden flex flex-col justify-center items-center w-9 h-9 text-white focus:outline-none p-1 rounded-full hover:bg-white/5 transition-colors" aria-label="Toggle Navigation Menu">
                        <div id="bar1" class="w-5 h-[2px] bg-white rounded-full transition-all duration-300"></div>
                        <div id="bar2" class="w-5 h-[2px] bg-white rounded-full transition-all duration-300 my-1"></div>
                        <div id="bar3" class="w-5 h-[2px] bg-white rounded-full transition-all duration-300"></div>
                    </button>

                    <!-- Mobile Glass Dropdown Menu -->
                    <div id="smartfiqMobileDropdown" class="hidden md:hidden absolute top-[calc(100%+12px)] left-0 w-full bg-[rgba(15,15,18,0.92)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.08)] p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                        ${mobileNavHTML}
                        <button onclick="openContactModal(); toggleSmartfiqMobileMenu();" class="w-full mt-2 inline-flex items-center justify-center px-[28px] py-[14px] text-[15px] font-semibold text-white bg-gradient-to-r from-[#FF6B3D] to-[#FF3D00] rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,107,61,0.5)] active:scale-95">
                            Book Consultation &rarr;
                        </button>
                    </div>
                </div>
            </header>
            `;
        }

        // Scroll Shrink Listener
        window.addEventListener('scroll', function () {
            const header = document.getElementById('smartfiq-header');
            if (!header) return;
            if (window.scrollY > 20) {
                header.classList.remove('h-[64px]', 'bg-[rgba(15,15,18,0.55)]', 'backdrop-blur-[20px]');
                header.classList.add('h-[58px]', 'bg-[rgba(10,10,14,0.85)]', 'backdrop-blur-[28px]', 'shadow-[0_16px_48px_rgba(0,0,0,0.4)]');
            } else {
                header.classList.remove('h-[58px]', 'bg-[rgba(10,10,14,0.85)]', 'backdrop-blur-[28px]', 'shadow-[0_16px_48px_rgba(0,0,0,0.4)]');
                header.classList.add('h-[64px]', 'bg-[rgba(15,15,18,0.55)]', 'backdrop-blur-[20px]');
            }
        });
    }

    // --- 2. FOOTER COMPONENT ---
    function renderFooter() {
        const footerContainer = document.getElementById('site-footer') || document.getElementById('smartfiq-footer-container');
        if (!footerContainer) return;

        footerContainer.outerHTML = `
        <footer class="w-full pt-16 pb-8 bg-[#0E0E0E] border-t border-white/10 font-plus-jakarta">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-10 px-6 max-w-[1280px] mx-auto">
                <div class="col-span-1 md:col-span-2">
                    <a href="index.html" class="inline-block h-10 mb-6 hover:opacity-90 transition-opacity">
                        <img alt="SMARTFIQ Logo" class="h-full w-auto object-contain" src="logo-transparent.png" />
                    </a>
                    <p class="text-[#E7BDB2] text-sm max-w-xs mb-6 leading-relaxed">
                        Empowering businesses through cutting-edge AI, WhatsApp automations, and intelligent voice agents. Built for the modern enterprise.
                    </p>
                    <!-- Social Icons Container under SmartFiQ Logo & Tagline -->
                    <div class="flex items-center gap-3 mt-6">
                      <!-- Instagram -->
                      <a href="https://www.instagram.com/smartfiq/" target="_blank" rel="noopener noreferrer" 
                         aria-label="SmartFiQ Instagram"
                         class="w-9 h-9 rounded-full bg-white/5 hover:bg-[#ff5625]/20 border border-white/10 hover:border-[#ff5625]/50 flex items-center justify-center text-[#E7BDB2] hover:text-[#ff5625] transition-all duration-300">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </a>

                      <!-- LinkedIn -->
                      <a href="https://www.linkedin.com/company/smartfiq/" target="_blank" rel="noopener noreferrer" 
                         aria-label="SmartFiQ LinkedIn"
                         class="w-9 h-9 rounded-full bg-white/5 hover:bg-[#ff5625]/20 border border-white/10 hover:border-[#ff5625]/50 flex items-center justify-center text-[#E7BDB2] hover:text-[#ff5625] transition-all duration-300">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>

                      <!-- YouTube -->
                      <a href="https://www.youtube.com/@smartfiq" target="_blank" rel="noopener noreferrer" 
                         aria-label="SmartFiQ YouTube"
                         class="w-9 h-9 rounded-full bg-white/5 hover:bg-[#ff5625]/20 border border-white/10 hover:border-[#ff5625]/50 flex items-center justify-center text-[#E7BDB2] hover:text-[#ff5625] transition-all duration-300">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                        </svg>
                      </a>
                    </div>
                </div>
                <div>
                    <h5 class="text-[#ffb5a0] font-bold text-sm uppercase tracking-wider mb-6">Services</h5>
                    <ul class="space-y-3 text-[#E7BDB2] text-sm font-medium">
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="Services.html">AI Automation</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="Services.html">WhatsApp Automation</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="Services.html">Voice AI Agents</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="Services.html">Custom AI Solutions</a></li>
                    </ul>
                </div>
                <div>
                    <h5 class="text-[#ffb5a0] font-bold text-sm uppercase tracking-wider mb-6">Resources</h5>
                    <ul class="space-y-3 text-[#E7BDB2] text-sm font-medium">
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="case-studies.html">Case Studies</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="blog.html">Insights &amp; Blogs</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="About.html">About Us</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="our-story.html">Our Story</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="faq.html">FAQs</a></li>
                    </ul>
                </div>
                <div>
                    <h5 class="text-[#ffb5a0] font-bold text-sm uppercase tracking-wider mb-6">Legal &amp; Support</h5>
                    <ul class="space-y-3 text-[#E7BDB2] text-sm font-medium">
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="privacy-policy.html">Privacy Policy</a></li>
                        <li><a class="hover:text-[#ff5625] transition-colors hover:translate-x-1 inline-block transition-transform duration-300" href="terms.html">Terms of Service</a></li>
                        <li>
                            <button onclick="openContactModal()" class="inline-flex items-center gap-1.5 text-[#ff5625] hover:text-white transition-colors font-bold text-xs uppercase tracking-wider mt-1">
                                <span class="material-symbols-outlined text-sm">support_agent</span> Contact Support
                            </button>
                        </li>
                        <li class="pt-3 border-t border-white/10 mt-3">
                            <p class="text-[11px] text-[#ffb5a0] font-bold mb-1.5 uppercase">Subscribe to AI Insights</p>
                            <form onsubmit="submitNewsletter(event)" class="flex flex-col gap-2">
                                <input type="email" required placeholder="Enter work email..." class="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#ff5625]" />
                                <button type="submit" class="w-full py-2 bg-[#ff5625] hover:bg-[#e04518] text-white font-bold text-xs rounded-lg transition-all">Subscribe</button>
                            </form>
                            <div class="newsletter-status hidden text-emerald-400 text-[10px] mt-1 font-semibold">✓ Subscribed successfully!</div>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="max-w-[1280px] mx-auto px-6 mt-16 pt-8 border-t border-white/10 text-center flex flex-col md:flex-row items-center justify-between gap-4">
                <p id="footer-copyright" class="text-[#E7BDB2] text-xs">© 2026 SmartFiQ AI Solutions. All rights reserved. Smart Intelligence. Faster Growth.</p>
                <div class="flex items-center gap-6 text-xs text-[#E7BDB2]">
                    <a href="privacy-policy.html" class="hover:text-white transition-colors">Privacy</a>
                    <span>•</span>
                    <a href="terms.html" class="hover:text-white transition-colors">Terms</a>
                    <span>•</span>
                    <a href="faq.html" class="hover:text-white transition-colors">Help Center</a>
                </div>
            </div>
        </footer>
        `;
    }

    // --- 3. CONTACT MODAL COMPONENT ---
    function renderContactModal() {
        const modalContainer = document.getElementById('site-modal') || document.getElementById('smartfiq-modal-container');
        if (!modalContainer) return;

        modalContainer.outerHTML = `
        <div id="contactModal" class="fixed inset-0 z-[200] hidden items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all duration-300 opacity-0">
            <div class="glass-card relative w-full max-w-lg bg-[#0F0F12]/95 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl transition-all duration-300 scale-95 text-left">
                <button onclick="closeContactModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
                    <span class="material-symbols-outlined">close</span>
                </button>
                <div class="mb-6">
                    <h3 class="text-2xl font-bold text-white mb-2">Book Your Free AI Consultation</h3>
                    <p class="text-gray-400 text-sm">Fill in your details below and our AI architects will contact you within 24 hours.</p>
                </div>
                <form id="modalContactForm" onsubmit="submitModalLead(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Full Name</label>
                        <input type="text" id="modalName" required placeholder="John Doe" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B3D] transition-colors" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Work Email</label>
                        <input type="email" id="modalEmail" required placeholder="john@company.com" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B3D] transition-colors" />
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Phone Number</label>
                            <input type="tel" id="modalPhone" required placeholder="+91 98765 43210" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B3D] transition-colors" />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Project Budget</label>
                            <select id="modalBudget" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FF6B3D] transition-colors">
                                <option value="< ₹50k" class="bg-[#0F0F12]">Under ₹50,000</option>
                                <option value="₹50k - ₹1.5L" class="bg-[#0F0F12]" selected>₹50k - ₹1.5 Lakhs</option>
                                <option value="₹1.5L - ₹5L" class="bg-[#0F0F12]">₹1.5L - ₹5 Lakhs</option>
                                <option value="₹5L+" class="bg-[#0F0F12]">₹5 Lakhs+</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">Requirements / Goals</label>
                        <textarea id="modalMessage" rows="3" placeholder="Tell us about your automation needs..." class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B3D] transition-colors resize-none"></textarea>
                    </div>
                    <button type="submit" id="modalSubmitBtn" class="w-full py-3.5 px-6 text-white font-semibold bg-gradient-to-r from-[#FF6B3D] to-[#FF3D00] rounded-xl hover:scale-[1.02] shadow-[0_0_20px_rgba(255,107,61,0.4)] transition-all duration-300 active:scale-95">
                        Submit & Book Call
                    </button>
                    <div id="modalFormStatus" class="hidden items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm mt-3">
                        <span class="material-symbols-outlined text-lg">check_circle</span>
                        <span>Request submitted! We will contact you within 24 hours.</span>
                    </div>
                </form>
            </div>
        </div>
        `;

        // Click outside listener
        setTimeout(() => {
            const modalEl = document.getElementById('contactModal');
            if (modalEl) {
                modalEl.addEventListener('click', function (e) {
                    if (e.target === this) {
                        closeContactModal();
                    }
                });
            }
        }, 100);
    }

    // --- Initialize Components immediately or on DOM ready ---
    function initComponents() {
        renderHeader();
        renderFooter();
        renderContactModal();
        if (typeof loadCmsData === 'function') loadCmsData();
        if (typeof trackVisitor === 'function') trackVisitor();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        initComponents();
    }
})();

// --- GLOBAL HELPER FUNCTIONS ---
function toggleSmartfiqMobileMenu() {
    const dropdown = document.getElementById('smartfiqMobileDropdown');
    const bar1 = document.getElementById('bar1');
    const bar2 = document.getElementById('bar2');
    const bar3 = document.getElementById('bar3');
    if (!dropdown) return;

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        if (bar1 && bar2 && bar3) {
            bar1.classList.add('rotate-45', 'translate-y-[6px]');
            bar2.classList.add('opacity-0');
            bar3.classList.add('-rotate-45', '-translate-y-[6px]');
        }
    } else {
        dropdown.classList.add('hidden');
        if (bar1 && bar2 && bar3) {
            bar1.classList.remove('rotate-45', 'translate-y-[6px]');
            bar2.classList.remove('opacity-0');
            bar3.classList.remove('-rotate-45', '-translate-y-[6px]');
        }
    }
}

function openContactModal() {
    const modal = document.getElementById('contactModal');
    if (!modal) return;
    const card = modal.querySelector('.glass-card');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (card) card.classList.remove('scale-95');
    }, 10);
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (!modal) return;
    const card = modal.querySelector('.glass-card');
    modal.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
}

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwL8EqUfiH6Twt4ooj5U3K0H1vNaDlwJuWWXp8beZnCemyOYZQ3B9C-f084Hr3CKBDs/exec";

async function submitLeadData(data, statusElementId, submitBtnId) {
    const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
    const btnEl = submitBtnId ? document.getElementById(submitBtnId) : null;
    let originalBtnText = '';

    if (btnEl) {
        originalBtnText = btnEl.innerHTML;
        btnEl.disabled = true;
        btnEl.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Submitting...</span>
        `;
    }

    const sheetPayload = {
        fullName: data.name || data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        budget: data.budget || '',
        requirements: data.message || data.requirements || ''
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sheetPayload)
        });
    } catch (err) {
        console.error('Google Sheet submission error:', err);
    }

    try {
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        if (resData && resData.lead) {
            const stored = JSON.parse(localStorage.getItem('smartfiq_leads') || '[]');
            stored.unshift(resData.lead);
            localStorage.setItem('smartfiq_leads', JSON.stringify(stored));
        }
    } catch (err) {
        console.warn('Local API save warning:', err);
        const stored = JSON.parse(localStorage.getItem('smartfiq_leads') || '[]');
        const localLead = {
            name: data.name || 'Newsletter Subscriber',
            email: data.email,
            phone: data.phone || 'N/A',
            budget: data.budget || 'N/A',
            message: data.message || 'Subscribed via Website',
            source: data.source || 'Newsletter',
            timestamp: new Date().toISOString(),
            status: 'New',
            aiScore: 85
        };
        stored.unshift(localLead);
        localStorage.setItem('smartfiq_leads', JSON.stringify(stored));
    }

    if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = originalBtnText;
    }

    if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.classList.add('flex');
    }

    return true;
}

async function submitModalLead(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('modalName').value,
        email: document.getElementById('modalEmail').value,
        phone: document.getElementById('modalPhone').value,
        budget: document.getElementById('modalBudget').value,
        message: document.getElementById('modalMessage').value,
        source: 'Modal Form'
    };
    await submitLeadData(data, 'modalFormStatus', 'modalSubmitBtn');
    const form = document.getElementById('modalContactForm');
    if (form) form.reset();
    setTimeout(() => {
        closeContactModal();
        const statusEl = document.getElementById('modalFormStatus');
        if (statusEl) {
            statusEl.classList.add('hidden');
            statusEl.classList.remove('flex');
        }
    }, 2500);
}

// Modern Glassmorphic Toast Notification System (Replaces browser alert popups)
function showSmartfiqToast(message, type = 'success') {
    let container = document.getElementById('sf-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'sf-toast-container';
        container.className = 'fixed bottom-6 right-6 z-[300] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 transform translate-y-4 opacity-0 ${
        type === 'error' 
            ? 'bg-red-950/90 text-red-200 border-red-500/40 shadow-red-950/50' 
            : 'bg-[#131313]/95 text-white border-[#ff5625]/40 shadow-black/80'
    }`;

    toast.innerHTML = `
        <span class="material-symbols-outlined text-[#ff5625] text-xl shrink-0">${type === 'error' ? 'error' : 'check_circle'}</span>
        <span class="text-xs font-semibold leading-relaxed flex-1">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-white p-1">
            <span class="material-symbols-outlined text-sm">close</span>
        </button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global Newsletter submission function called by ALL subscribe forms across website
async function submitNewsletter(event) {
    if (event && event.preventDefault) event.preventDefault();
    const form = event ? (event.target || event.srcElement) : null;
    const emailInput = form ? form.querySelector('input[type="email"]') : null;
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        showSmartfiqToast('Please enter a valid email address.', 'error');
        return;
    }

    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    let btnId = submitBtn ? submitBtn.id : null;
    if (submitBtn && !btnId) {
        btnId = 'subscribeBtn_' + Math.random().toString(36).substring(2, 7);
        submitBtn.id = btnId;
    }

    const data = {
        name: 'Newsletter Subscriber',
        email: email,
        phone: 'N/A',
        budget: 'N/A',
        message: 'Subscribed to Newsletter & AI Insights',
        source: 'Newsletter Form'
    };

    const statusEl = form ? form.querySelector('.newsletter-status') : null;
    let statusId = null;
    if (statusEl) {
        if (!statusEl.id) statusEl.id = 'status_' + Math.random().toString(36).substring(2, 7);
        statusId = statusEl.id;
    }

    await submitLeadData(data, statusId, btnId);

    if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.classList.add('flex');
    }

    showSmartfiqToast('🎉 Thank you for subscribing! Your email has been registered.');
    if (form && form.reset) form.reset();
}

async function submitInlineLead(e) {
    if (e && e.preventDefault) e.preventDefault();
    const data = {
        name: document.getElementById('contactName') ? document.getElementById('contactName').value : 'Website Visitor',
        email: document.getElementById('contactEmail') ? document.getElementById('contactEmail').value : '',
        phone: document.getElementById('contactPhone') ? document.getElementById('contactPhone').value : '',
        budget: document.getElementById('contactBudget') ? document.getElementById('contactBudget').value : '',
        message: document.getElementById('contactMessage') ? document.getElementById('contactMessage').value : '',
        source: 'Landing Page Form'
    };
    await submitLeadData(data, 'inlineFormStatus', 'inlineSubmitBtn');
    const form = document.getElementById('inlineContactForm');
    if (form) form.reset();
}

async function loadCmsData() {
    try {
        const cmsRes = await fetch(`/api/cms?t=${Date.now()}`, { cache: 'no-store' });
        if (!cmsRes.ok) throw new Error('Failed to fetch CMS');
        const cms = await cmsRes.json();

        if (cms) {
            localStorage.setItem('smartfiq_cms', JSON.stringify(cms));
            applyCmsToPage(cms);
        }
    } catch (err) {
        console.warn('CMS payload load fallback to LocalStorage:', err);
        const stored = localStorage.getItem('smartfiq_cms');
        if (stored) {
            try { applyCmsToPage(JSON.parse(stored)); } catch (e) {}
        }
    }
}

function applyCmsToPage(cms) {
    if (!cms) return;
    const email = cms.contactEmail || cms.consultEmail || cms.supportEmail || 'smartfiqagency@gmail.com';
    const phone = cms.contactPhone || cms.phone || '+91 7678188047';

    if (document.getElementById('hero-title') && cms.heroTitle) {
        document.getElementById('hero-title').innerHTML = cms.heroTitle;
    }
    if (document.getElementById('hero-subtitle') && cms.heroSubtitle) {
        document.getElementById('hero-subtitle').textContent = cms.heroSubtitle;
    }
    if (document.getElementById('footer-copyright') && cms.footerText) {
        document.getElementById('footer-copyright').textContent = cms.footerText;
    }

    const emailEls = document.querySelectorAll('#cms-email, .cms-email');
    emailEls.forEach(el => {
        el.textContent = email;
        if (el.tagName === 'A') el.href = `mailto:${email}`;
    });

    const phoneEls = document.querySelectorAll('#cms-phone, .cms-phone');
    phoneEls.forEach(el => {
        el.textContent = phone;
        if (el.tagName === 'A') el.href = `tel:${phone.replace(/\s+/g, '')}`;
    });

    const whatsappLinks = document.querySelectorAll('a[href*="wa.me"]');
    whatsappLinks.forEach(link => {
        link.href = `https://wa.me/${cms.whatsappNumber || '917678188047'}?text=Hi%20SmartFiQ,%20I%20would%20like%20to%20know%20more%20about%20your%20services!`;
    });
}

// ==================== ADVANCED VISITOR INTENT TELEMETRY ====================
const sf_startTime = Date.now();

let sessionId = sessionStorage.getItem('sf_session_id');
if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('sf_session_id', sessionId);
}

if (!sessionStorage.getItem('sf_entry_page')) {
    sessionStorage.setItem('sf_entry_page', window.location.pathname);
}

let clientPublicIp = sessionStorage.getItem('sf_client_ip');
async function getClientPublicIp() {
    if (clientPublicIp) return clientPublicIp;
    try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            const data = await res.json();
            if (data && data.ip) {
                clientPublicIp = data.ip;
                sessionStorage.setItem('sf_client_ip', clientPublicIp);
                return clientPublicIp;
            }
        }
    } catch (e) {}
    return '';
}

window.sf_clicksQueue = window.sf_clicksQueue || [];

// Event delegation for capturing user click interactions
document.addEventListener('click', function(e) {
    let target = e.target;
    // Walk up to find clickable container if child element clicked
    while (target && target !== document.body && !['A', 'BUTTON', 'INPUT'].includes(target.tagName) && !target.hasAttribute('onclick')) {
        target = target.parentElement;
    }
    if (!target || target === document.body) return;

    // Privacy guard: do not capture sensitive password/credit card inputs
    if (target.type === 'password' || (target.name && target.name.includes('pass'))) return;

    const label = (target.innerText || target.value || target.alt || target.title || target.id || target.tagName || 'Click').trim().substring(0, 60);
    if (!label) return;

    const clickEvent = {
        label: label,
        tagName: target.tagName,
        id: target.id || '',
        className: (target.className || '').toString().substring(0, 40),
        page: window.location.pathname,
        x: e.clientX,
        y: e.clientY,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    window.sf_clicksQueue.push(clickEvent);
    if (window.sf_clicksQueue.length > 25) {
        window.sf_clicksQueue.shift();
    }

    sendBeaconTelemetry(false, clickEvent);
}, { passive: true });

async function sendBeaconTelemetry(isUnloading = false, latestClick = null) {
    try {
        const userIp = clientPublicIp || await getClientPublicIp();
        const sessionDuration = Math.floor((Date.now() - sf_startTime) / 1000);
        const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1);
        const scrollPct = Math.min(100, Math.max(0, Math.floor(((window.scrollY + window.innerHeight) / docH) * 100)));

        const payloadData = {
            sessionId: sessionId,
            clientIp: userIp,
            entryPage: sessionStorage.getItem('sf_entry_page') || window.location.pathname,
            currentPage: window.location.pathname,
            exitPage: isUnloading ? window.location.pathname : '',
            scrollPercentage: scrollPct,
            sessionDuration: sessionDuration,
            clickEvent: latestClick || (window.sf_clicksQueue.length > 0 ? window.sf_clicksQueue[window.sf_clicksQueue.length - 1] : null),
            allClicks: window.sf_clicksQueue,
            referrer: document.referrer || ''
        };

        const payloadStr = JSON.stringify(payloadData);

        if (isUnloading && navigator.sendBeacon) {
            const blob = new Blob([payloadStr], { type: 'application/json' });
            navigator.sendBeacon('/api/track', blob);
        } else {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadStr,
                keepalive: true
            }).catch(() => {});
        }
    } catch (err) {
        console.warn('Telemetry payload failed:', err);
    }
}

// Auto-run visitor tracking immediately on page view
getClientPublicIp().then(() => sendBeaconTelemetry(false));
setInterval(() => sendBeaconTelemetry(false), 6000);

window.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        sendBeaconTelemetry(true);
    }
});

window.addEventListener('pagehide', function() {
    sendBeaconTelemetry(true);
});

window.addEventListener('scroll', function() {
    if (!window.sf_scrolled_tracked) {
        window.sf_scrolled_tracked = true;
        sendBeaconTelemetry(false);
    }
}, { passive: true });
