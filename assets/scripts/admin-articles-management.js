// API Configuration
const API_CONFIG = {
    // You need to configure this URL to point to your deployed Lambda function
    BASE_URL: 'https://hub.comparehubprices.co.za/admin/manage-articles',
};

// State
let articles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initRBAC();
    initializeCustomDropdowns(); // Init Dropdowns
    loadArticles();

    // Set default date to today
    const dateInput = document.getElementById('articleDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
});

// Auth & RBAC
let currentUserRole = 'viewer';

async function initRBAC() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.warn('Admin auth service not available');
            return;
        }

        const result = await window.adminAWSAuthService.getUserInfo();

        if (result.success && result.user) {
            const user = result.user;

            // Update Role
            currentUserRole = user.role || 'viewer';

            // RBAC Logic - Init
            if (currentUserRole === 'viewer') {
                const form = document.getElementById('addArticleForm');
                if (form) {
                    const section = form.closest('.form-section');
                    if (section) section.style.display = 'none';
                    else form.style.display = 'none';
                }
            }

        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

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
                ${currentUserRole !== 'viewer' ? `
                <button class="btn-delete" onclick="confirmDelete('${article.id}')">
                    <i class="fas fa-trash me-1"></i> Delete
                </button>` : ''}
            </div>
        </article>
    `).join('');
}

// Create Article
document.getElementById('addArticleForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading & Publishing...';

    try {
        const title = document.getElementById('articleTitle').value;
        const category = document.getElementById('articleCategory').value;
        const date = document.getElementById('articleDate').value;
        const content = document.getElementById('articleExcerpt').value;
        const authorName = document.getElementById('articleAuthorName').value;

        // Handle Image Uploads
        const imageFile = document.getElementById('articleImageFile').files[0];
        const authorImageFile = document.getElementById('articleAuthorImageFile').files[0];

        let imageUrl = '';
        let authorImageUrl = '';

        if (imageFile) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading Article Image...';
            imageUrl = await uploadFileToS3(imageFile);
        }

        if (authorImageFile) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading Author Image...';
            authorImageUrl = await uploadFileToS3(authorImageFile);
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Publishing...';

        const articleData = {
            title,
            category,
            image: imageUrl,
            date,
            content,
            authorName,
            authorImage: authorImageUrl
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

        // Show Success Modal
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();

    } catch (error) {
        console.error('Error creating article:', error);
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

/**
 * Uploads a file to S3 using a presigned URL
 * @param {File} file 
 * @returns {Promise<string>} The final public URL of the uploaded file
 */
async function uploadFileToS3(file) {
    // 1. Get Presigned URL
    const urlParams = new URLSearchParams({
        action: 'get-upload-url',
        fileName: file.name,
        fileType: file.type
    });

    const presignResponse = await fetch(`${API_CONFIG.BASE_URL}?${urlParams.toString()}`);

    if (!presignResponse.ok) {
        throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, fileUrl } = await presignResponse.json();

    // 2. Upload File to S3
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type
        }
    });

    if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
    }

    return fileUrl;
}

// Delete Article
function confirmDelete(id) {
    // Set the ID on the modal's confirm button
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => deleteArticle(id);
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    modal.show();
}

async function deleteArticle(id) {
    // Hide modal if open
    const modalEl = document.getElementById('deleteConfirmationModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

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

// Initialize Custom Dropdowns
function initializeCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const input = dropdown.querySelector('input[type="hidden"]');
        const selectedText = dropdown.querySelector('.selected-text');
        const items = dropdown.querySelectorAll('.dropdown-item-custom');

        if (!trigger || !input || !selectedText) return;

        // Toggle Dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        });

        // Select Item
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.dataset.value;
                // Get text content excluding key (if strict text needed) or just use item.textContent
                // We'll use the item's clean text (removing icon if needed or keeping it?)
                // Actually Design 2 typically just shows text in the trigger or text + icon.
                // Let's just grab the text for now.
                const text = item.textContent.trim();

                // Update Input
                input.value = value;
                selectedText.textContent = text; // or value if mapping needed

                // Update Visual Selection
                items.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                // Close
                dropdown.classList.remove('active');
            });
        });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            dropdowns.forEach(d => d.classList.remove('active'));
        }
    });
}
