// API Configuration
const API_CONFIG = {
    // You need to configure this URL to point to your deployed Lambda function
    BASE_URL: 'https://hub.comparehubprices.co.za/admin/manage-articles',
};

// State
let articles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    
    // Set default date to today
    const dateInput = document.getElementById('articleDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
});

// Load Articles
async function loadArticles() {
    try {
        const grid = document.getElementById('articlesGrid');
        if (grid) {
            grid.innerHTML = '<div class="col-12 text-center"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        articles = data.articles || [];
        renderArticles(articles);

    } catch (error) {
        console.error('Error loading articles:', error);
        const grid = document.getElementById('articlesGrid');
        if (grid) {
            grid.innerHTML = `<div class="col-12 text-center text-danger">Error loading articles: ${error.message}</div>`;
        }
    }
}

// Render Articles
function renderArticles(articlesData) {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;

    if (articlesData.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="far fa-newspaper fa-3x text-muted mb-3"></i>
                <p class="text-muted">No articles found. Publish your first article above.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = articlesData.map(article => `
        <article class="article-card">
            <img src="${article.image || 'assets/placeholder.jpg'}" 
                 alt="${article.title}" 
                 class="article-image"
                 onerror="this.src='https://via.placeholder.com/800x400?text=No+Image'">
            <div class="article-content">
                <div class="article-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(article.date)}</span>
                    <span><i class="far fa-folder"></i> ${article.category}</span>
                </div>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${article.content}</p>
            </div>
            <div class="article-actions">
                <button class="btn-delete" onclick="deleteArticle('${article.id}')">
                    <i class="fas fa-trash me-1"></i> Delete
                </button>
            </div>
        </article>
    `).join('');
}

// Create Article
document.getElementById('addArticleForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Publishing...';

    try {
        const articleData = {
            title: document.getElementById('articleTitle').value,
            category: document.getElementById('articleCategory').value,
            image: document.getElementById('articleImage').value,
            date: document.getElementById('articleDate').value,
            content: document.getElementById('articleExcerpt').value
        };

        const response = await fetch(`${API_CONFIG.BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(articleData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create article');
        }

        // Success
        this.reset();
        document.getElementById('articleDate').valueAsDate = new Date();
        loadArticles();
        alert('Article published successfully!');

    } catch (error) {
        console.error('Error creating article:', error);
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Delete Article
async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}?id=${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete article');
        }

        // Remove from local state and re-render (optimistic update) or reload
        articles = articles.filter(a => a.id !== id);
        renderArticles(articles);

    } catch (error) {
        console.error('Error deleting article:', error);
        alert('Failed to delete article: ' + error.message);
    }
}

// Helper: Format Date
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
