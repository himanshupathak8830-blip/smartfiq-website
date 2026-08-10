/**
 * SmartFiQ Blog Main Script Wrapper
 * Imports data store and provides global interface.
 */

if (typeof window.SmartfiqBlog === 'undefined') {
    // If blog-data.js wasn't loaded first, load inline fallback logic
    console.warn('SmartfiqBlog library loading via blog.js wrapper...');
}

// Global helper functions as requested in SECTION 4
function getArticles() {
    return window.SmartfiqBlog ? window.SmartfiqBlog.getArticles() : [];
}

function getArticleById(id) {
    return window.SmartfiqBlog ? window.SmartfiqBlog.getArticleById(id) : null;
}

function saveArticle(articleData) {
    return window.SmartfiqBlog ? window.SmartfiqBlog.saveArticle(articleData) : null;
}

function deleteArticle(id) {
    return window.SmartfiqBlog ? window.SmartfiqBlog.deleteArticle(id) : false;
}
