// Configuration
const API_CONFIG = {
    BASE_URL: 'https://acc.comparehubprices.site/data',
    LIST_PRODUCTS_ENDPOINT: '/products',
};

// Load saved API URL
const savedUrl = localStorage.getItem('comparehubprices_api_url');
if (savedUrl) {
    API_CONFIG.BASE_URL = savedUrl;
}

// Load analytics data
async function loadAnalytics() {
    const category = document.getElementById('categoryFilter').value;
    const timeRange = document.getElementById('timeRange').value;
    const brand = document.getElementById('brandFilter').value;

    try {
        // Load products for statistics
        let url = `${API_CONFIG.BASE_URL}${API_CONFIG.LIST_PRODUCTS_ENDPOINT}`;
        if (category) {
            url += `?category=${category}&limit=1000`;
        } else {
            // If no category, we'll need to aggregate across all
            url += `?category=smartphones&limit=1000`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const products = data.body ? JSON.parse(data.body) : data;
        const productList = products.products || products.items || [];

        // Calculate statistics
        calculateStats(productList);
        displayTopProducts(productList);
        displayCategoryStats(productList);

    } catch (error) {
        console.error('Error loading analytics:', error);
        showAlert('Error loading analytics: ' + error.message, 'danger');
    }
}

// Calculate statistics
function calculateStats(products) {
    const totalProducts = products.length;
    const uniqueRetailers = new Set();
    let totalPriceUpdates = 0;
    let totalAlerts = 0;

    products.forEach(product => {
        if (product.offers) {
            product.offers.forEach(offer => {
                if (offer.retailer) uniqueRetailers.add(offer.retailer);
            });
        }
        // Estimate price updates (this would come from price history in real implementation)
        totalPriceUpdates += product.offers?.length || 0;
    });

    // Update stats
    document.getElementById('totalProducts').textContent = totalProducts.toLocaleString();
    document.getElementById('totalRetailers').textContent = uniqueRetailers.size;
    document.getElementById('priceUpdates').textContent = totalPriceUpdates.toLocaleString();
    document.getElementById('activeAlerts').textContent = totalAlerts.toLocaleString();

    // Update changes (placeholder - would come from historical data)
    const productsChangeEl = document.getElementById('productsChange');
    if (productsChangeEl) {
        const changeValue = Math.floor(totalProducts * 0.1);
        productsChangeEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${changeValue} this month</span>`;
    }
    
    const updatesChangeEl = document.getElementById('updatesChange');
    if (updatesChangeEl) {
        const changeValue = Math.floor(totalPriceUpdates * 0.05);
        updatesChangeEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${changeValue} today</span>`;
    }
}

// Display top products
function displayTopProducts(products) {
    const tbody = document.getElementById('topProductsTable');
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    No products found
                </td>
            </tr>
        `;
        return;
    }

    // Sort by number of offers (price updates)
    const sortedProducts = [...products].sort((a, b) => {
        const aOffers = a.offers?.length || 0;
        const bOffers = b.offers?.length || 0;
        return bOffers - aOffers;
    }).slice(0, 10);

    tbody.innerHTML = sortedProducts.map((product, index) => {
        const offers = product.offers || [];
        const prices = offers.map(o => o.price || o.originalPrice || 0).filter(p => p > 0);
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

        return `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${product.model || product.product_id || 'Unknown'}</td>
                <td><span class="badge badge-primary">${product.brand || 'N/A'}</span></td>
                <td>${product.category || 'N/A'}</td>
                <td><strong>${offers.length}</strong></td>
                <td>R${lowestPrice.toLocaleString()}</td>
                <td><span class="badge badge-success">Active</span></td>
            </tr>
        `;
    }).join('');
}

// Display category statistics
function displayCategoryStats(products) {
    const tbody = document.getElementById('categoryStatsTable');
    
    // Group by category
    const categoryMap = {};
    products.forEach(product => {
        const cat = product.category || 'unknown';
        if (!categoryMap[cat]) {
            categoryMap[cat] = {
                products: [],
                totalUpdates: 0,
                prices: []
            };
        }
        categoryMap[cat].products.push(product);
        categoryMap[cat].totalUpdates += product.offers?.length || 0;
        
        if (product.offers) {
            product.offers.forEach(offer => {
                const price = offer.price || offer.originalPrice || 0;
                if (price > 0) categoryMap[cat].prices.push(price);
            });
        }
    });

    if (Object.keys(categoryMap).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    No category data available
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = Object.entries(categoryMap).map(([category, data]) => {
        const prices = data.prices;
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        return `
            <tr>
                <td><strong>${category}</strong></td>
                <td>${data.products.length}</td>
                <td>${data.totalUpdates}</td>
                <td>R${avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td>R${minPrice.toLocaleString()}</td>
                <td>R${maxPrice.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}

// Show alert
function showAlert(message, type = 'info') {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'mb-3';
        const contentWrapper = document.querySelector('.content-wrapper');
        const filterSection = document.querySelector('.filter-section');
        if (contentWrapper && filterSection) {
            contentWrapper.insertBefore(alertContainer, filterSection);
        }
    }

    const alertId = 'alert-' + Date.now();
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Check Login State
async function checkLoginState() {
    try {
        if (window.adminAWSAuthService) {
            const result = await window.adminAWSAuthService.getUserInfo();
            
            if (result.success && result.user) {
                const user = result.user;
                const userAvatar = document.getElementById('userAvatar');
                const userName = document.getElementById('userName');
                
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

                if (userAvatar) {
                    userAvatar.textContent = initials;
                }
                
                if (userName) {
                    userName.textContent = displayName;
                }
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Error checking login state:', error);
    }
}

// Sidebar Toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkLoginState();
    loadAnalytics();
});

