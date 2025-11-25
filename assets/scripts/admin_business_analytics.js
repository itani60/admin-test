const API_BASE_URL = 'https://acc.comparehubprices.site/admin/admin/business-analytics';

let charts = {};
let analyticsData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();
    checkLoginState();
    loadAnalytics();
});

// Setup sidebar toggle
function setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// Check login state and update header
async function checkLoginState() {
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

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
            if (charts.topFollowers) charts.topFollowers.destroy();
            charts.topFollowers = new Chart(topFollowersCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: chartsData.topFollowersByBusiness.labels || [],
                    datasets: [{
                        label: 'Total Followers',
                        data: chartsData.topFollowersByBusiness.data || [],
                        backgroundColor: [
                            'rgba(37, 99, 235, 0.8)',
                            'rgba(40, 167, 69, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(6, 182, 212, 0.8)',
                            'rgba(244, 63, 94, 0.8)'
                        ],
                        borderColor: [
                            '#2563eb',
                            '#28a745',
                            '#f59e0b',
                            '#06b6d4',
                            '#f43f5e'
                        ],
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#eff6ff'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
    }

    // Ratings Distribution Chart
    if (chartsData.ratingsDistribution) {
        const ratingsDistCtx = document.getElementById('ratingsDistributionChart');
        if (ratingsDistCtx) {
            if (charts.ratingsDistribution) charts.ratingsDistribution.destroy();
            charts.ratingsDistribution = new Chart(ratingsDistCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: chartsData.ratingsDistribution.labels || [],
                    datasets: [{
                        data: chartsData.ratingsDistribution.data || [],
                        backgroundColor: [
                            '#28a745',
                            '#06b6d4',
                            '#f59e0b',
                            '#fd7e14',
                            '#f43f5e'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }
    }

    // Monthly Good Reviews Chart
    if (chartsData.goodReviewsByMonth) {
        const goodReviewsCtx = document.getElementById('goodReviewsChart');
        if (goodReviewsCtx) {
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
                    }
                }
            });
        }
    }

    // Product Likes Chart
    if (chartsData.productLikesByMonth) {
        const productLikesCtx = document.getElementById('productLikesChart');
        if (productLikesCtx) {
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
                    }
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
                    <td><span class="badge badge-custom ${getRankBadgeClass(business.rank)}">#${business.rank}</span></td>
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
                    <td><strong class="text-success">+${business.newFollowersThisMonth || 0}</strong></td>
                    <td><strong>${formatNumber(business.totalFollowers || 0)}</strong></td>
                    <td>
                        <div class="rating-stars">${renderStars(business.averageRating || 0)}</div>
                        <small class="text-muted">${business.averageRating || '0.0'}</small>
                    </td>
                    <td><i class="fas fa-arrow-${business.followersChange >= 0 ? 'up' : 'down'} trend-${business.followersChange >= 0 ? 'up' : 'down'}"></i> <span class="${business.followersChange >= 0 ? 'text-success' : 'text-danger'}">${business.followersChange >= 0 ? '+' : ''}${business.followersChange}%</span></td>
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
                    <td><strong class="text-success">${formatNumber(business.goodReviews || 0)}</strong></td>
                    <td>${formatNumber(business.totalReviews || 0)}</td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${business.goodReviewsRate || 0}%" aria-valuenow="${business.goodReviewsRate || 0}" aria-valuemin="0" aria-valuemax="100">${business.goodReviewsRate || 0}%</div>
                        </div>
                    </td>
                    <td>
                        <div class="rating-stars">${renderStars(business.averageRating || 0)}</div>
                        <small class="text-muted">${business.averageRating || '0.0'}</small>
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
                    <td><span class="badge badge-custom ${getRankBadgeClass(product.rank)}">#${product.rank}</span></td>
                    <td>
                        <div class="fw-semibold">${escapeHtml(product.productName)}</div>
                        <small class="text-muted">${escapeHtml(product.businessCategory)} Services</small>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            ${product.businessLogo ? `<img src="${product.businessLogo}" alt="${product.businessName}" class="business-logo me-2" style="width: 40px; height: 40px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                            <div class="business-logo me-2 d-flex align-items-center justify-content-center bg-primary text-white rounded" style="width: 40px; height: 40px; display: ${product.businessLogo ? 'none' : 'flex'}; font-weight: bold; font-size: 14px;">${(product.businessName || 'B').substring(0, 2).toUpperCase()}</div>
                            <div>
                                <div class="fw-semibold">${escapeHtml(product.businessName)}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-custom ${getCategoryBadgeClass(product.businessCategory)}">${escapeHtml(product.businessCategory)}</span></td>
                    <td><strong class="text-danger">${formatNumber(product.totalLikes || 0)}</strong></td>
                    <td><strong class="text-success">+${product.likesThisMonth || 0}</strong></td>
                    <td><i class="fas fa-arrow-up trend-up"></i> <span class="text-success">+${product.trend || 0}%</span></td>
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

