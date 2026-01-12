// Configuration
const API_CONFIG = {
    BASE_URL: 'https://hub.comparehubprices.co.za/data',
    LIST_PRODUCTS_ENDPOINT: '/products',
};

// Load saved API URL
const savedUrl = localStorage.getItem('comparehubprices_api_url');
if (savedUrl) {
    API_CONFIG.BASE_URL = savedUrl;
}

// Load analytics data
const ALL_CATEGORIES = ['smartphones', 'windows-laptops', 'macbooks-laptops', 'chromebooks-laptops', 'tablets', 'wearables', 'televisions', 'audio', 'gaming', 'appliances'];
let chartInstances = {};

async function loadAnalytics() {
    const categorySelect = document.getElementById('categorySelect');
    const timeRangeSelect = document.getElementById('timeRangeSelect');
    const brandSelect = document.getElementById('brandSelect');

    const category = categorySelect ? categorySelect.value : '';
    const brand = brandSelect ? brandSelect.value : '';

    try {
        let allProducts = [];

        // Show loading indicator in tables
        document.getElementById('topProductsTable').innerHTML = '<tr><td colspan="7" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading data...</td></tr>';

        if (category) {
            allProducts = await fetchCategoryProducts(category);
        } else {
            // Fetch ALL known categories in parallel
            // This enables Global Analytics
            const promises = ALL_CATEGORIES.map(cat => fetchCategoryProducts(cat));
            const results = await Promise.all(promises);
            allProducts = results.flat();
        }

        // Apply Brand Filter
        if (brand) {
            allProducts = allProducts.filter(p => p.brand && p.brand.toLowerCase() === brand.toLowerCase());
        }

        console.log(`Analytics loaded: ${allProducts.length} products total.`);

        calculateStats(allProducts);
        displayTopProducts(allProducts);
        displayCategoryStats(allProducts);
        renderCharts(allProducts);

    } catch (error) {
        console.error('Error loading analytics:', error);
        showAlert('Error loading analytics: ' + error.message, 'danger');
    }
}

async function fetchCategoryProducts(category) {
    try {
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.LIST_PRODUCTS_ENDPOINT}?category=${category}&limit=1000`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        if (data.body) {
            const parsed = JSON.parse(data.body);
            return parsed.products || parsed.items || [];
        }
        return data.products || data.items || [];
    } catch (e) {
        console.warn(`Failed to fetch ${category}:`, e);
        return [];
    }
}

// Calculate statistics
function calculateStats(products) {
    const totalProducts = products.length;
    const uniqueRetailers = new Set();
    let totalPriceUpdates = 0;

    products.forEach(p => {
        if (p.offers) {
            p.offers.forEach(o => { if (o.retailer) uniqueRetailers.add(o.retailer); });
            totalPriceUpdates += p.offers.length;
        }
    });

    safeSetText('totalProducts', totalProducts.toLocaleString());
    safeSetText('totalRetailers', uniqueRetailers.size.toLocaleString());
    safeSetText('priceUpdates', totalPriceUpdates.toLocaleString());
    // Mock Active Alerts
    safeSetText('activeAlerts', Math.floor(totalProducts * 0.05).toLocaleString());

    // Changes
    const productsChangeEl = document.getElementById('productsChange');
    if (productsChangeEl) productsChangeEl.innerHTML = `<i class="fas fa-arrow-up"></i> <span>+${Math.floor(totalProducts * 0.02)} this month</span>`;
}

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Render Charts using Chart.js
function renderCharts(products) {
    const categoryCounts = {};
    const brandCounts = {};
    const categoryPrices = {};

    products.forEach(p => {
        // Category
        const cat = p.category || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        // Brand
        const b = p.brand || 'Unknown';
        brandCounts[b] = (brandCounts[b] || 0) + 1;

        // Prices for Avg
        if (p.offers && p.offers.length > 0) {
            const prices = p.offers.map(o => o.price || o.originalPrice || 0).filter(v => v > 0);
            if (prices.length > 0) {
                const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                if (!categoryPrices[cat]) categoryPrices[cat] = [];
                categoryPrices[cat].push(avg);
            }
        }
    });

    // --- Global Chart Defaults (Dark Mode) ---
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#334155';
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // --- 1. Products by Category (Design 2: Doughnut) ---
    const ctxCategory = document.getElementById('categoryChart');
    if (ctxCategory) {
        if (chartInstances['categoryChart']) chartInstances['categoryChart'].destroy();
        chartInstances['categoryChart'] = new Chart(ctxCategory.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryCounts),
                datasets: [{
                    data: Object.values(categoryCounts),
                    backgroundColor: [
                        '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899',
                        '#10b981', '#f59e0b', '#f97316', '#ef4444'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { usePointStyle: true, boxWidth: 6, padding: 20, color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // --- 2. Price Updates Activity (Design 1: Smooth Line) ---
    const ctxUpdates = document.getElementById('updatesChart');
    if (ctxUpdates) {
        if (chartInstances['updatesChart']) chartInstances['updatesChart'].destroy();

        const ctx = ctxUpdates.getContext('2d');
        const gradient1 = ctx.createLinearGradient(0, 0, 0, 300);
        gradient1.addColorStop(0, 'rgba(37, 99, 235, 0.5)');
        gradient1.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        // Mock Data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const mockData = days.map(() => Math.floor(Math.random() * (products.length / 5)) + 5);

        chartInstances['updatesChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Updates',
                    data: mockData,
                    borderColor: '#3b82f6',
                    backgroundColor: gradient1,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5], color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // --- 3. Products by Brand (Design 6: Horizontal Bar) ---
    const ctxBrand = document.getElementById('brandChart');
    if (ctxBrand) {
        if (chartInstances['brandChart']) chartInstances['brandChart'].destroy();

        const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

        chartInstances['brandChart'] = new Chart(ctxBrand.getContext('2d'), {
            type: 'bar',
            indexAxis: 'y', // Horizontal
            data: {
                labels: sortedBrands.map(x => x[0]),
                datasets: [{
                    label: 'Products',
                    data: sortedBrands.map(x => x[1]),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { borderDash: [5, 5], color: 'rgba(255, 255, 255, 0.05)' },
                        beginAtZero: true
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // --- 4. Avg Price by Category (Design 3: Vertical Bar) ---
    const ctxPrice = document.getElementById('priceChart');
    if (ctxPrice) {
        if (chartInstances['priceChart']) chartInstances['priceChart'].destroy();

        const ctx = ctxPrice.getContext('2d');
        const gradient3 = ctx.createLinearGradient(0, 0, 0, 300);
        gradient3.addColorStop(0, '#8b5cf6');
        gradient3.addColorStop(1, '#6366f1');

        const avgPriceData = Object.keys(categoryPrices).map(cat => {
            const prices = categoryPrices[cat];
            return {
                cat,
                avg: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
            };
        });

        chartInstances['priceChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: avgPriceData.map(x => x.cat),
                datasets: [{
                    label: 'Avg Price (R)',
                    data: avgPriceData.map(x => x.avg),
                    backgroundColor: gradient3,
                    borderRadius: 8,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// Display top products (Design 1: Modern Gradient Card)
function displayTopProducts(products) {
    // We target the CONTAINER of the table section, not the tbody directly, because we need to replace the wrapper
    const container = document.querySelector('.table-section:has(#topProductsTable)');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<div class="card-d1 text-center text-muted py-4">No products found</div>`;
        return;
    }

    // Sort by number of offers (price updates)
    const sortedProducts = [...products].sort((a, b) => {
        const aOffers = a.offers?.length || 0;
        const bOffers = b.offers?.length || 0;
        return bOffers - aOffers;
    }).slice(0, 10);

    let html = `
    <div class="card-d1">
        <h3 class="mb-3 fw-bold" style="font-size:1.2rem; color: #1e293b;">Top Products by Price Updates</h3>
        <div class="table-responsive">
            <table class="table-d1 w-100">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Product</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Updates</th>
                        <th>Lowest Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    html += sortedProducts.map((product, index) => {
        const offers = product.offers || [];
        const prices = offers.map(o => o.price || o.originalPrice || 0).filter(p => p > 0);
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const brand = product.brand || 'N/A';
        const category = product.category || 'N/A';

        return `
            <tr>
                <td style="font-weight:700; color:#64748b;">#${index + 1}</td>
                <td class="fw-bold">${product.model || product.title || product.product_id || 'Unknown'}</td>
                <td><span class="badge-brand-modern">${brand}</span></td>
                <td>${category}</td>
                <td style="font-weight:700; color:#1e293b;">${offers.length}</td>
                <td><span style="font-weight:700; color:#0f172a;">R${lowestPrice.toLocaleString()}</span></td>
                <td><span class="badge-status-modern">Active</span></td>
            </tr>
        `;
    }).join('');

    html += `
                </tbody>
            </table>
        </div>
    </div>
    `;

    // Replace the entire old table-section content or the container itself if feasible
    // Since we selected the .table-section, we replace that entirely with our new card design structure
    // But wait, .table-section has its own styles (white bg, padding). 
    // Design 1 expects to be standalone. Let's clear the container classes to avoid double padding/shadow.
    container.className = '';
    container.style.background = 'transparent';
    container.style.padding = '0';
    container.style.boxShadow = 'none';
    container.style.border = 'none';

    container.innerHTML = html;
}

// Display category statistics (Design 2: Grid Cards)
function displayCategoryStats(products) {
    const container = document.querySelector('.table-section:has(#categoryStatsTable)');
    if (!container) return;

    const categoryMap = {};
    products.forEach(product => {
        const cat = product.category || 'unknown';
        if (!categoryMap[cat]) categoryMap[cat] = { count: 0, updates: 0, prices: [] };

        categoryMap[cat].count++;
        categoryMap[cat].updates += product.offers?.length || 0;

        if (product.offers) {
            product.offers.forEach(offer => {
                const price = offer.price || offer.originalPrice || 0;
                if (price > 0) categoryMap[cat].prices.push(price);
            });
        }
    });

    if (Object.keys(categoryMap).length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4">No category data available</div>`;
        return;
    }

    let html = `
    <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-dark); margin-bottom: 1.5rem;">Category Statistics</h3>
    <div class="grid-d2">
    `;

    const iconMap = {
        'smartphones': 'fa-mobile-alt',
        'laptops': 'fa-laptop',
        'windows-laptops': 'fa-laptop',
        'macbooks-laptops': 'fa-laptop',
        'chromebooks-laptops': 'fa-laptop',
        'tablets': 'fa-tablet-alt',
        'wearables': 'fa-clock',
        'televisions': 'fa-tv',
        'audio': 'fa-headphones',
        'gaming': 'fa-gamepad',
        'appliances': 'fa-blender'
    };

    html += Object.entries(categoryMap).map(([category, data]) => {
        const prices = data.prices;
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

        // Activity status text
        let activityText = 'Moderate';
        if (data.updates > 50) activityText = 'High Activity';
        else if (data.updates < 10) activityText = 'Low Activity';

        // Icon logic
        let iconClass = 'fa-tag'; // default
        // Simple partial match check
        for (const key in iconMap) {
            if (category.toLowerCase().includes(key)) {
                iconClass = iconMap[key];
                break;
            }
        }

        // Format Category Name
        const catName = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');

        return `
        <div class="card-d2">
            <div class="d2-header">
                <div class="d2-icon"><i class="fas ${iconClass}"></i></div>
                <div>
                    <div class="fw-bold text-dark">${catName}</div>
                    <small class="text-muted">${activityText}</small>
                </div>
            </div>
            <div class="d2-stats">
                <div>
                    <div>Count</div>
                    <div class="d2-val">${data.count}</div>
                </div>
                <div>
                    <div>Updates</div>
                    <div class="d2-val">${data.updates}</div>
                </div>
                <div>
                    <div>Avg</div>
                    <div class="d2-val">R${(avgPrice / 1000).toFixed(1)}k</div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    html += '</div>';

    // Remove old wrapper styles
    container.className = '';
    container.style.background = 'transparent';
    container.style.boxShadow = 'none';
    container.style.border = 'none';
    container.style.padding = '0';

    container.innerHTML = html;
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
// Check Login State
let currentUserRole = 'viewer';

async function checkLoginState() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.warn('Admin auth service not available');
            return;
        }

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

            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar) userAvatar.textContent = initials;
            const userName = document.getElementById('userName');
            if (userName) userName.textContent = displayName;

            // Update Role
            currentUserRole = user.role || 'viewer';
            const rawRole = (user.role || 'viewer').replace('_', ' ');
            const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
            const roleHeader = document.getElementById('userRoleHeader');
            if (roleHeader) roleHeader.textContent = roleDisplay;

            const ddName = document.getElementById('dropdownUserName');
            if (ddName) ddName.textContent = displayName;
            const ddEmail = document.getElementById('dropdownUserEmail');
            if (ddEmail) ddEmail.textContent = user.email || '';

        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}



// Initialize
// Initialize custom category dropdown
function initializeCategoryDropdown() {
    const categoryDropdown = document.getElementById('categoryDropdown');
    const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
    const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
    const categoryDropdownItems = document.getElementById('categoryDropdownItems');
    const categorySelect = document.getElementById('categorySelect');

    if (!categoryDropdown || !categoryDropdownBtn || !categoryDropdownMenu || !categoryDropdownItems) return;

    const categoryOptions = [
        { value: '', text: 'All Categories' },
        { value: 'smartphones', text: 'Smartphones' },
        { value: 'windows-laptops', text: 'Windows Laptops' },
        { value: 'macbooks-laptops', text: 'MacBooks Laptops' },
        { value: 'chromebooks-laptops', text: 'Chromebooks Laptops' },
        { value: 'tablets', text: 'Tablets' },
        { value: 'wearables', text: 'Wearables' },
        { value: 'televisions', text: 'Televisions' },
        { value: 'audio', text: 'Audio' },
        { value: 'gaming', text: 'Gaming' },
        { value: 'appliances', text: 'Appliances' }
    ];

    categoryOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === '') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            categoryDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('categoryDropdownText').textContent = option.text;
            categorySelect.value = option.value;

            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
        });
        categoryDropdownItems.appendChild(itemDiv);
    });

    categoryDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = categoryDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'categoryDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
        } else {
            categoryDropdown.classList.add('active');
            categoryDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom time range dropdown
function initializeTimeRangeDropdown() {
    const timeRangeDropdown = document.getElementById('timeRangeDropdown');
    const timeRangeDropdownBtn = document.getElementById('timeRangeDropdownBtn');
    const timeRangeDropdownMenu = document.getElementById('timeRangeDropdownMenu');
    const timeRangeDropdownItems = document.getElementById('timeRangeDropdownItems');
    const timeRangeSelect = document.getElementById('timeRangeSelect');

    if (!timeRangeDropdown || !timeRangeDropdownBtn || !timeRangeDropdownMenu || !timeRangeDropdownItems) return;

    const timeRangeOptions = [
        { value: 'today', text: 'Today' },
        { value: 'week', text: 'Last 7 Days' },
        { value: 'month', text: 'Last 30 Days' },
        { value: 'year', text: 'Last Year' },
        { value: 'all', text: 'All Time' }
    ];

    timeRangeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'month') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            timeRangeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('timeRangeDropdownText').textContent = option.text;
            timeRangeSelect.value = option.value;

            timeRangeDropdown.classList.remove('active');
            timeRangeDropdownMenu.style.display = 'none';
        });
        timeRangeDropdownItems.appendChild(itemDiv);
    });

    timeRangeDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = timeRangeDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'timeRangeDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            timeRangeDropdown.classList.remove('active');
            timeRangeDropdownMenu.style.display = 'none';
        } else {
            timeRangeDropdown.classList.add('active');
            timeRangeDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            timeRangeDropdown.classList.remove('active');
            timeRangeDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom brand dropdown
function initializeBrandDropdown() {
    const brandDropdown = document.getElementById('brandDropdown');
    const brandDropdownBtn = document.getElementById('brandDropdownBtn');
    const brandDropdownMenu = document.getElementById('brandDropdownMenu');
    const brandDropdownItems = document.getElementById('brandDropdownItems');
    const brandSelect = document.getElementById('brandSelect');

    if (!brandDropdown || !brandDropdownBtn || !brandDropdownMenu || !brandDropdownItems) return;

    const brandOptions = [
        { value: '', text: 'All Brands' },
        { value: 'Samsung', text: 'Samsung' },
        { value: 'Apple', text: 'Apple' },
        { value: 'Google', text: 'Google' },
        { value: 'OnePlus', text: 'OnePlus' },
        { value: 'Xiaomi', text: 'Xiaomi' }
    ];

    brandOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === '') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            brandDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('brandDropdownText').textContent = option.text;
            brandSelect.value = option.value;

            brandDropdown.classList.remove('active');
            brandDropdownMenu.style.display = 'none';
        });
        brandDropdownItems.appendChild(itemDiv);
    });

    brandDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = brandDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'brandDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            brandDropdown.classList.remove('active');
            brandDropdownMenu.style.display = 'none';
        } else {
            brandDropdown.classList.add('active');
            brandDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            brandDropdown.classList.remove('active');
            brandDropdownMenu.style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (window.adminAWSAuthService) {
        const auth = await window.adminAWSAuthService.getUserInfo();
        if (!auth.success || !window.adminAWSAuthService.hasPermission('canViewBusinessAnalytics')) {
            window.location.href = 'index.html';
            return;
        }
    }

    initializeCategoryDropdown();
    initializeTimeRangeDropdown();
    initializeBrandDropdown();
    loadAnalytics();
});

