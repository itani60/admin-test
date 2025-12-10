// Sidebar toggle functionality
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
        });

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }
    }
}

// Configuration
const API_CONFIG = {
    BASE_URL: 'https://hub.comparehubprices.co.za/data',
    GET_PRODUCT_ENDPOINT: '/products',
    GET_PRICE_HISTORY_ENDPOINT: '/products/price-history',
};

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('product_id');
const category = urlParams.get('category');

// Load saved API URL
const savedUrl = localStorage.getItem('comparehubprices_api_url');
if (savedUrl) {
    API_CONFIG.BASE_URL = savedUrl;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 0,
    }).format(amount);
}

// Calculate savings
function calculateSavings(originalPrice, currentPrice) {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    const savings = originalPrice - currentPrice;
    const percent = ((savings / originalPrice) * 100).toFixed(0);
    return { amount: savings, percent };
}

// Render specifications
function renderSpecs(specs) {
    const container = document.getElementById('productSpecs');
    if (!specs || Object.keys(specs).length === 0) {
        container.innerHTML = '<p class="text-muted">No specifications available.</p>';
        return;
    }

    let html = '';
    Object.keys(specs).forEach(category => {
        const categoryData = specs[category];
        html += `<div class="spec-category">`;
        html += `<div class="spec-category-title">${category}</div>`;
        
        if (typeof categoryData === 'object' && !Array.isArray(categoryData)) {
            Object.keys(categoryData).forEach(key => {
                const value = categoryData[key];
                if (Array.isArray(value)) {
                    html += `<div class="spec-item">`;
                    html += `<div class="spec-label">${key}:</div>`;
                    html += `<div class="spec-array">`;
                    value.forEach(item => {
                        html += `<span class="spec-array-item">${item}</span>`;
                    });
                    html += `</div></div>`;
                } else if (typeof value === 'object') {
                    // Nested object
                    html += `<div class="spec-item">`;
                    html += `<div class="spec-label">${key}:</div>`;
                    Object.keys(value).forEach(subKey => {
                        html += `<div class="spec-value ms-3">${subKey}: ${value[subKey]}</div>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<div class="spec-item">`;
                    html += `<span class="spec-label">${key}:</span>`;
                    html += `<span class="spec-value">${value}</span>`;
                    html += `</div>`;
                }
            });
        } else {
            html += `<div class="spec-value">${categoryData}</div>`;
        }
        
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Render offers
function renderOffers(offers) {
    const container = document.getElementById('productOffers');
    if (!offers || offers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tag"></i><h4>No offers available</h4></div>';
        return;
    }

    let html = '';
    offers.forEach(offer => {
        const savings = calculateSavings(offer.originalPrice, offer.price);
        html += `<div class="offer-card">`;
        html += `<div class="offer-header">`;
        html += `<div class="offer-retailer">${offer.retailer || 'Unknown Retailer'}</div>`;
        if (offer.logoUrl) {
            html += `<img src="${offer.logoUrl}" alt="${offer.retailer}" class="offer-logo" onerror="this.style.display='none'">`;
        }
        html += `</div>`;
        html += `<div class="price-section">`;
        html += `<div class="current-price">${formatCurrency(offer.price || 0)}</div>`;
        if (offer.originalPrice && offer.originalPrice > offer.price) {
            html += `<div class="original-price">${formatCurrency(offer.originalPrice)}</div>`;
        }
        if (savings) {
            html += `<div class="price-savings">Save ${formatCurrency(savings.amount)} (${savings.percent}%)</div>`;
        }
        html += `</div>`;
        if (offer.saleEnds) {
            html += `<div class="mt-2"><small class="text-muted"><i class="fas fa-clock"></i> Sale ends: ${offer.saleEnds}</small></div>`;
        }
        if (offer.url) {
            html += `<div class="mt-2"><a href="${offer.url}" target="_blank" class="btn btn-sm btn-primary"><i class="fas fa-external-link-alt"></i> View on ${offer.retailer}</a></div>`;
        }
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Render price history
function renderPriceHistory(history) {
    const container = document.getElementById('priceHistoryContent');
    if (!history || history.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><h4>No price history available</h4><p>Price history will appear here once prices are updated.</p></div>';
        return;
    }

    let html = '<div class="table-responsive"><table class="price-history-table">';
    html += '<thead><tr><th>Date</th><th>Retailer</th><th>Old Price</th><th>New Price</th><th>Change</th><th>Change %</th></tr></thead>';
    html += '<tbody>';

    history.forEach(entry => {
        const date = new Date(entry.createdAt || entry.timestamp);
        const dateStr = date.toLocaleDateString('en-ZA', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const change = entry.priceChange || (entry.newPrice - entry.oldPrice);
        const changePercent = entry.priceChangePercent || (entry.oldPrice > 0 ? ((change / entry.oldPrice) * 100).toFixed(2) : 0);
        const changeClass = change >= 0 ? 'price-change-positive' : 'price-change-negative';
        const changeSign = change >= 0 ? '+' : '';

        html += '<tr>';
        html += `<td>${dateStr}</td>`;
        html += `<td>${entry.retailer || 'N/A'}</td>`;
        html += `<td>${formatCurrency(entry.oldPrice || 0)}</td>`;
        html += `<td>${formatCurrency(entry.newPrice || 0)}</td>`;
        html += `<td class="${changeClass}">${changeSign}${formatCurrency(change)}</td>`;
        html += `<td class="${changeClass}">${changeSign}${changePercent}%</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Load product data
async function loadProduct() {
    if (!productId || !category) {
        showError('Missing product ID or category in URL parameters.');
        return;
    }

    try {
        // Load product
        const productResponse = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.GET_PRODUCT_ENDPOINT}/${productId}?category=${category}`
        );

        if (!productResponse.ok) {
            throw new Error(`Failed to load product: ${productResponse.statusText}`);
        }

        const productData = await productResponse.json();
        const product = productData.body ? JSON.parse(productData.body) : productData;
        const productInfo = product.product || product;

        // Display product information
        const productTitle = `${productInfo.brand || ''} ${productInfo.model || productId}`.trim();
        document.getElementById('productTitle').textContent = productTitle;
        
        const metaContainer = document.getElementById('productMeta');
        metaContainer.innerHTML = `
            <span class="badge badge-primary">${productInfo.brand || 'N/A'}</span>
            <span class="badge badge-success">${productInfo.category || category}</span>
            ${productInfo.color ? `<span class="badge badge-danger">${productInfo.color}</span>` : ''}
        `;

        document.getElementById('productDescription').textContent = 
            productInfo.description || 'No description available.';

        if (productInfo.imageUrl) {
            document.getElementById('productImage').src = productInfo.imageUrl;
        }

        // Render specs
        renderSpecs(productInfo.specs);

        // Render offers
        renderOffers(productInfo.offers);

        // Load price history
        await loadPriceHistory();

        // Show content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('productContent').style.display = 'block';

    } catch (error) {
        console.error('Error loading product:', error);
        showError('Failed to load product information: ' + error.message);
    }
}

// Load price history
async function loadPriceHistory() {
    try {
        const historyResponse = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.GET_PRICE_HISTORY_ENDPOINT}?product_id=${productId}&category=${category}&limit=100`
        );

        if (!historyResponse.ok) {
            console.warn('Failed to load price history:', historyResponse.statusText);
            renderPriceHistory([]);
            return;
        }

        const historyData = await historyResponse.json();
        const history = historyData.body ? JSON.parse(historyData.body) : historyData;
        const priceHistory = history.priceHistory || history.history || [];

        // Sort by date (newest first)
        priceHistory.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.timestamp || 0);
            const dateB = new Date(b.createdAt || b.timestamp || 0);
            return dateB - dateA;
        });

        renderPriceHistory(priceHistory);
    } catch (error) {
        console.error('Error loading price history:', error);
        renderPriceHistory([]);
    }
}

// Show error
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    const errorDiv = document.getElementById('errorState');
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `
        <div class="error-message">
            <h4><i class="fas fa-exclamation-triangle"></i> Error</h4>
            <p>${message}</p>
            <a href="admin-product-management.html" class="btn btn-primary mt-2">
                <i class="fas fa-arrow-left"></i> Back to Products
            </a>
        </div>
    `;
}

// Check login state and update header
async function checkLoginState() {
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    try {
        const result = await window.adminAWSAuthService.getUserInfo();
        
        if (result.success && result.user) {
            const user = result.user;
            let displayName = '';
            let initials = '';

            if (user.givenName && user.familyName) {
                displayName = `${user.givenName} ${user.familyName}`;
                initials = `${user.givenName.charAt(0)}${user.familyName.charAt(0)}`.toUpperCase();
            } else if (user.givenName) {
                displayName = user.givenName;
                initials = user.givenName.substring(0, 2).toUpperCase();
            } else if (user.email) {
                const name = user.email.split('@')[0];
                displayName = name.charAt(0).toUpperCase() + name.slice(1);
                initials = name.substring(0, 2).toUpperCase();
            } else {
                displayName = 'Admin User';
                initials = 'AU';
            }

            if (userAvatar) userAvatar.textContent = initials;
            if (userName) userName.textContent = displayName;
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Handle logout
async function handleLogout() {
    try {
        await window.adminAWSAuthService.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = 'admin-login.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    loadProduct();
    checkLoginState();

    // Attach logout handler to user profile
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
        userProfile.addEventListener('click', handleLogout);
    }
});

