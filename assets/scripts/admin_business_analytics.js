const API_BASE_URL = 'https://hub.comparehubprices.co.za/admin/admin/business-analytics';

let charts = {};
let analyticsData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {

    initRBAC();
    loadAnalytics();
});



// Check login state and update header
// Check Login State
let currentUserRole = 'viewer';

async function initRBAC() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.warn('Admin auth service not available');
            return;
        }

        const result = await window.adminAWSAuthService.getUserInfo();

        if (result.success && result.user) {
            currentUserRole = result.user.role || 'viewer';
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Render stars for rating
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && hasHalfStar) {
            html += '<i class="fas fa-star-half-alt"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    return html;
}

// Get badge class for category
function getCategoryBadgeClass(category) {
    const categoryMap = {
        'Technology': 'badge-info',
        'Food': 'badge-warning',
        'Fitness': 'badge-danger',
        'Beauty': 'badge-info',
        'Automotive': 'badge-info',
        'Retail': 'badge-info',
        'Services': 'badge-info',
        'General': 'badge-info'
    };
    return categoryMap[category] || 'badge-info';
}

// Get badge class for rank
function getRankBadgeClass(rank) {
    if (rank <= 3) return 'badge-success';
    return 'badge-warning';
}

// Load analytics data
async function loadAnalytics() {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.analytics) {
            analyticsData = data.analytics;
            updateStats();
            updateCharts();
            updateTables();
        } else {
            throw new Error(data.message || 'Failed to load analytics');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics data. Please try again later.');
    }
}

// Update statistics cards
function updateStats() {
    if (!analyticsData || !analyticsData.overall) return;

    const overall = analyticsData.overall;

    const totalBusinessesEl = document.getElementById('totalBusinesses');
    const totalFollowersEl = document.getElementById('totalFollowers');
    const totalReviewsEl = document.getElementById('totalReviews');
    const averageRatingEl = document.getElementById('averageRating');
    const totalLikesEl = document.getElementById('totalLikes');

    if (totalBusinessesEl) totalBusinessesEl.textContent = formatNumber(overall.totalBusinesses || 0);
    if (totalFollowersEl) totalFollowersEl.textContent = formatNumber(overall.totalFollowers || 0);
    if (totalReviewsEl) totalReviewsEl.textContent = formatNumber(overall.totalReviews || 0);
    if (averageRatingEl) averageRatingEl.textContent = overall.averageRating || '0.0';
    if (totalLikesEl) totalLikesEl.textContent = formatNumber(overall.totalLikes || 0);

    // Update change indicators
    const followersChange = parseFloat(overall.followersChange || 0);
    const followersChangeEl = document.getElementById('followersChange');
    if (followersChangeEl) {
        followersChangeEl.innerHTML = `<i class="fas fa-arrow-${followersChange >= 0 ? 'up' : 'down'}"></i> ${followersChange >= 0 ? '+' : ''}${followersChange}%`;
        followersChangeEl.className = `stat-change ${followersChange >= 0 ? 'positive' : 'negative'}`;
    }

    const reviewsChange = parseFloat(overall.reviewsChange || 0);
    const reviewsChangeEl = document.getElementById('reviewsChange');
    if (reviewsChangeEl) {
        reviewsChangeEl.innerHTML = `<i class="fas fa-arrow-${reviewsChange >= 0 ? 'up' : 'down'}"></i> ${reviewsChange >= 0 ? '+' : ''}${reviewsChange}%`;
        reviewsChangeEl.className = `stat-change ${reviewsChange >= 0 ? 'positive' : 'negative'}`;
    }

    const likesChange = parseFloat(overall.likesChange || 0);
    const likesChangeEl = document.getElementById('likesChange');
    if (likesChangeEl) {
        likesChangeEl.innerHTML = `<i class="fas fa-arrow-${likesChange >= 0 ? 'up' : 'down'}"></i> ${likesChange >= 0 ? '+' : ''}${likesChange}%`;
        likesChangeEl.className = `stat-change ${likesChange >= 0 ? 'positive' : 'negative'}`;
    }
}

// Update charts
function updateCharts() {
    if (!analyticsData || !analyticsData.charts) return;

    const chartsData = analyticsData.charts;

    // Top Businesses by Followers Chart
    if (chartsData.topFollowersByBusiness) {
        const topFollowersCtx = document.getElementById('topFollowersChart');
        if (topFollowersCtx) {
            // Prevent wheel/scroll events from affecting the chart
            // topFollowersCtx.addEventListener('wheel', preventScroll, { passive: false });
            // topFollowersCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

            if (charts.topFollowers) charts.topFollowers.destroy();

            const ctx3 = topFollowersCtx.getContext('2d');
            const gradient3 = ctx3.createLinearGradient(0, 0, 0, 300);
            gradient3.addColorStop(0, '#8b5cf6');
            gradient3.addColorStop(1, '#6366f1');

            charts.topFollowers = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: chartsData.topFollowersByBusiness.labels || [],
                    datasets: [{
                        label: 'Total Followers',
                        data: chartsData.topFollowersByBusiness.data || [],
                        backgroundColor: gradient3,
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function (context) {
                                    return 'Followers: ' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#eff6ff', drawBorder: false },
                            ticks: { color: '#64748b', font: { size: 12 } }
                        },
                        x: {
                            grid: { display: false, drawBorder: false },
                            ticks: { color: '#64748b', font: { size: 12 } }
                        }
                    },
                    interaction: { intersect: false, mode: 'index' },
                    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
                }
            });
        }
    }

    // Ratings Distribution Chart
    if (chartsData.ratingsDistribution) {
        const ratingsDistCtx = document.getElementById('ratingsDistributionChart');
        if (ratingsDistCtx) {
            // Prevent wheel/scroll events from affecting the chart
            // ratingsDistCtx.addEventListener('wheel', preventScroll, { passive: false });
            // ratingsDistCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

            if (charts.ratingsDistribution) charts.ratingsDistribution.destroy();
            charts.ratingsDistribution = new Chart(ratingsDistCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: chartsData.ratingsDistribution.labels || [],
                    datasets: [{
                        data: chartsData.ratingsDistribution.data || [],
                        backgroundColor: [
                            '#3b82f6', // Blue
                            '#06b6d4', // Cyan
                            '#ec4899', // Pink
                            '#f59e0b', // Amber
                            '#10b981'  // Green
                        ],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%', // Design 2
                    plugins: {
                        legend: {
                            position: 'right', // Design 2
                            labels: {
                                usePointStyle: true,
                                boxWidth: 6,
                                padding: 20,
                                font: { size: 12 },
                                color: '#64748b'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            padding: 12,
                            displayColors: true,
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return label + ': ' + value + ' (' + percentage + '%)';
                                }
                            }
                        }
                    },
                    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
                }
            });
        }
    }

    // Monthly Good Reviews Chart
    if (chartsData.goodReviewsByMonth) {
        const goodReviewsCtx = document.getElementById('goodReviewsChart');
        if (goodReviewsCtx) {
            // Prevent wheel/scroll events from affecting the chart
            // goodReviewsCtx.addEventListener('wheel', preventScroll, { passive: false });
            // goodReviewsCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

            if (charts.goodReviews) charts.goodReviews.destroy();
            charts.goodReviews = new Chart(goodReviewsCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: chartsData.goodReviewsByMonth.labels || [],
                    datasets: [
                        {
                            label: 'Good Reviews (4+ Stars)',
                            data: chartsData.goodReviewsByMonth.goodReviews || [],
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            label: 'Total Reviews',
                            data: chartsData.goodReviewsByMonth.totalReviews || [],
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: {
                                color: '#eff6ff'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
                }
            });
        }
    }

    // Product Likes Chart
    if (chartsData.productLikesByMonth) {
        const productLikesCtx = document.getElementById('productLikesChart');
        if (productLikesCtx) {
            // Prevent wheel/scroll events from affecting the chart
            // productLikesCtx.addEventListener('wheel', preventScroll, { passive: false });
            // productLikesCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

            if (charts.productLikes) charts.productLikes.destroy();
            charts.productLikes = new Chart(productLikesCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: chartsData.productLikesByMonth.labels || [],
                    datasets: [
                        {
                            label: 'Product Likes',
                            data: chartsData.productLikesByMonth.totalLikes || [],
                            borderColor: '#f43f5e',
                            backgroundColor: 'rgba(244, 63, 94, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            label: 'New Likes This Month',
                            data: chartsData.productLikesByMonth.newLikes || [],
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: {
                                color: '#eff6ff'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
                }
            });
        }
    }
}

// Update tables
function updateTables() {
    if (!analyticsData) return;

    // Top Businesses by Followers
    if (analyticsData.topBusinessesByFollowers) {
        const tbody = document.getElementById('topFollowersTableBody');
        if (tbody) {
            tbody.innerHTML = analyticsData.topBusinessesByFollowers.map(business => `
                <tr>
                    <td><span class="d1-rank">${business.rank}</span></td>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            ${business.businessLogo ? `<img src="${business.businessLogo}" alt="${business.businessName}" class="avatar-initials" style="object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                            <div class="avatar-initials" style="display: ${business.businessLogo ? 'none' : 'flex'}; font-size: 0.9rem;">${(business.businessName || 'B').substring(0, 2).toUpperCase()}</div>
                            <div>
                                <div class="fw-bold text-dark">${escapeHtml(business.businessName)}</div>
                                <small class="text-muted">${escapeHtml(business.businessCategory)}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${escapeHtml(business.businessCategory)}</span></td>
                    <td class="text-success fw-bold">+${business.newFollowersThisMonth || 0}</td>
                    <td class="fw-bold">${formatNumber(business.totalFollowers || 0)}</td>
                    <td>
                        <div class="text-warning small rating-stars">${renderStars(business.averageRating || 0)} <span class="text-muted ms-1">${business.averageRating || '0.0'}</span></div>
                    </td>
                    <td><span class="${business.followersChange >= 0 ? 'trend-up' : 'trend-down'}"><i class="fas fa-arrow-${business.followersChange >= 0 ? 'up' : 'down'} me-1"></i>${Math.abs(business.followersChange)}%</span></td>
                </tr>
            `).join('');
        }
    }

    // Top Businesses by Good Reviews
    if (analyticsData.topBusinessesByGoodReviews) {
        const tbody = document.getElementById('goodReviewsTableBody');
        if (tbody) {
            tbody.innerHTML = analyticsData.topBusinessesByGoodReviews.map(business => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            ${business.businessLogo ? `<img src="${business.businessLogo}" alt="${business.businessName}" class="avatar-initials" style="object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                            <div class="avatar-initials" style="display: ${business.businessLogo ? 'none' : 'flex'}; font-size: 0.9rem;">${(business.businessName || 'B').substring(0, 2).toUpperCase()}</div>
                            <div>
                                <div class="fw-bold text-dark">${escapeHtml(business.businessName)}</div>
                                <small class="text-muted">${escapeHtml(business.businessCategory)}</small>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${escapeHtml(business.businessCategory)}</span></td>
                    <td class="text-success fw-bold">${formatNumber(business.goodReviews || 0)}</td>
                    <td class="fw-bold">${formatNumber(business.totalReviews || 0)}</td>
                    <td>
                        <div class="d1-progress-container">
                            <div class="d1-progress-bar" style="width: ${business.goodReviewsRate || 0}%">${business.goodReviewsRate || 0}%</div>
                        </div>
                    </td>
                    <td>
                        <div class="text-warning small rating-stars">${renderStars(business.averageRating || 0)} <span class="text-muted ms-1">${business.averageRating || '0.0'}</span></div>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Most Liked Products
    if (analyticsData.mostLikedProducts) {
        const tbody = document.getElementById('mostLikedProductsTableBody');
        if (tbody) {
            tbody.innerHTML = analyticsData.mostLikedProducts.map(product => `
                <tr>
                    <td>
                        <div class="d1-rank-badge ${product.rank <= 3 ? `d1-rank-${product.rank}` : 'd1-rank-other'}">#${product.rank}</div>
                    </td>
                    <td>
                        <div class="fw-bold text-dark">${escapeHtml(product.productName)}</div>
                        <small class="text-muted">${escapeHtml(product.businessCategory)} Services</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            ${product.businessLogo ? `<img src="${product.businessLogo}" alt="${product.businessName}" class="avatar-initials" style="object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                            <div class="avatar-initials" style="display: ${product.businessLogo ? 'none' : 'flex'}; font-size: 0.9rem;">${(product.businessName || 'B').substring(0, 2).toUpperCase()}</div>
                            <div class="fw-semibold">${escapeHtml(product.businessName)}</div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${escapeHtml(product.businessCategory)}</span></td>
                    <td class="text-danger fw-bold">${formatNumber(product.totalLikes || 0)}</td>
                    <td class="text-success fw-bold">+${product.likesThisMonth || 0}</td>
                    <td><span class="text-success"><i class="fas fa-arrow-up"></i> +${product.trend || 0}%</span></td>
                </tr>
            `).join('');
        }
    }

    // Underperforming Businesses
    if (analyticsData.underperformingBusinesses) {
        const tbody = document.getElementById('underperformingBusinessesTableBody');
        if (tbody) {
            if (analyticsData.underperformingBusinesses.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No underperforming businesses found</td></tr>';
            } else {
                tbody.innerHTML = analyticsData.underperformingBusinesses.map(business => `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                ${business.businessLogo ? `<img src="${business.businessLogo}" alt="${business.businessName}" class="business-logo me-3" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                                <div class="business-logo me-3 d-flex align-items-center justify-content-center bg-primary text-white rounded" style="width: 50px; height: 50px; display: ${business.businessLogo ? 'none' : 'flex'}; font-weight: bold; font-size: 18px;">${(business.businessName || 'B').substring(0, 2).toUpperCase()}</div>
                                <div>
                                    <div class="fw-semibold">${escapeHtml(business.businessName)}</div>
                                    <small class="text-muted">${escapeHtml(business.businessCategory)}</small>
                                </div>
                            </div>
                        </td>
                        <td><span class="badge badge-custom ${getCategoryBadgeClass(business.businessCategory)}">${escapeHtml(business.businessCategory)}</span></td>
                        <td>
                            <div class="rating-stars">${renderStars(business.averageRating || 0)}</div>
                            <small class="${business.averageRating < 3.0 ? 'text-danger' : 'text-warning'}">${business.averageRating || '0.0'}</small>
                        </td>
                        <td>${formatNumber(business.totalReviews || 0)}</td>
                        <td>${formatNumber(business.totalFollowers || 0)}</td>
                        <td>
                            ${(business.issues || []).map(issue => `<span class="badge badge-custom ${issue.includes('Low') || issue.includes('Very') ? 'badge-danger' : 'badge-warning'}">${escapeHtml(issue)}</span>`).join(' ')}
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewBusinessDetails('${business.businessId}')">View Details</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }
}

// Show error message
function showError(message) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        <strong>Error:</strong> ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alertDiv);
}

// View business details (placeholder)
function viewBusinessDetails(businessId) {
    alert(`View details for business: ${businessId}\n\nThis feature will be implemented in a future update.`);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

