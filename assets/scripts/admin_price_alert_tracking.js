// Configuration
const API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://hub.comparehubprices.co.za';
const PRICE_ALERT_TRACKING_API = `${API_BASE_URL}/admin/admin/price-alert-tracking`;

// State
let allUserStats = [];
let filteredUserStats = [];
let expandedUsers = new Set();

// Chart instances
let alertsOverTimeChart = null;
let alertStatusChart = null;
let topUsersChart = null;
let notificationMethodsChart = null;


// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {

    setupEventListeners();
    loadPriceAlertStats();
    checkLoginState();
    initializeCharts();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Initialize custom status dropdown
    initializeStatusDropdown();


}

// Load price alert statistics from API
async function loadPriceAlertStats() {
    try {
        showLoading();

        const response = await fetch(`${PRICE_ALERT_TRACKING_API}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const responseData = await response.json();
            if (responseData.success && responseData.data) {
                const stats = responseData.data;
                allUserStats = stats.userStats || [];
                updateStats(stats);
                applyFilters();
                updateCharts();
            } else {
                throw new Error(responseData.message || 'Invalid response format');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showAlert('Please log in to view price alert tracking', 'warning');
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                return;
            }

            throw new Error(errorData.message || `Failed to load price alert statistics: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error loading price alert statistics:', error);
        showAlert(`Failed to load price alert statistics: ${error.message}`, 'danger');
        allUserStats = [];
        updateStats({ totalUsers: 0, totalAlerts: 0, activeAlerts: 0, inactiveAlerts: 0 });
        applyFilters();
    }
}

// Apply filters
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusSelect = document.getElementById('statusSelect');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const status = statusSelect ? statusSelect.value : 'all';

    filteredUserStats = allUserStats.filter(userStat => {
        // Search filter
        const matchesSearch = !searchTerm ||
            (userStat.userEmail && userStat.userEmail.toLowerCase().includes(searchTerm)) ||
            (userStat.alerts && userStat.alerts.some(alert =>
                alert.productName && alert.productName.toLowerCase().includes(searchTerm)
            ));

        // Status filter
        let matchesStatus = true;
        if (status === 'active') {
            matchesStatus = userStat.activeAlerts > 0;
        } else if (status === 'inactive') {
            matchesStatus = userStat.inactiveAlerts > 0;
        }

        return matchesSearch && matchesStatus;
    });

    // Sort by total alerts (descending)
    filteredUserStats.sort((a, b) => b.totalAlerts - a.totalAlerts);

    renderUserStats();
}

// Render user statistics
function renderUserStats() {
    const container = document.getElementById('priceAlertsContainer');
    if (!container) return;

    if (filteredUserStats.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-bell-slash"></i>
                        <h4>No price alerts found</h4>
                        <p>No price alerts match your current filters.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';

    filteredUserStats.forEach(userStat => {
        const isExpanded = expandedUsers.has(userStat.userId);
        const activeBadge = userStat.activeAlerts > 0
            ? `<span class="badge badge-success">${userStat.activeAlerts}</span>`
            : '<span class="badge" style="background: #6c757d; color: white;">0</span>';
        const inactiveBadge = userStat.inactiveAlerts > 0
            ? `<span class="badge badge-danger">${userStat.inactiveAlerts}</span>`
            : '<span class="badge" style="background: #6c757d; color: white;">0</span>';

        html += `
            <tr>
                <td>
                    <strong>${escapeHtml(userStat.userEmail || 'N/A')}</strong>
                    <br>
                    <small class="text-muted">User ID: ${escapeHtml(userStat.userId || 'N/A')}</small>
                </td>
                <td>
                    <span class="badge badge-primary">${userStat.totalAlerts}</span>
                </td>
                <td>${activeBadge}</td>
                <td>${inactiveBadge}</td>
                <td>
                    <button class="expand-btn" onclick="toggleUserAlerts('${userStat.userId}')">
                        <i class="fas fa-${isExpanded ? 'chevron-up' : 'chevron-down'}"></i>
                        ${isExpanded ? 'Hide' : 'Show'} Alerts (${userStat.alerts.length})
                    </button>
                </td>
            </tr>
        `;

        // Add expanded alerts detail row
        if (isExpanded && userStat.alerts.length > 0) {
            html += `
                <tr>
                    <td colspan="5">
                        <div class="alerts-detail show">
                            <h5>Price Alerts for ${escapeHtml(userStat.userEmail || 'N/A')}</h5>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Brand</th>
                                            <th>Current Price</th>
                                            <th>Target Price</th>
                                            <th>Status</th>
                                            <th>Notification</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            userStat.alerts.forEach(alert => {
                const statusBadge = alert.status === 'active'
                    ? '<span class="badge badge-success">Active</span>'
                    : '<span class="badge badge-danger">Inactive</span>';
                const notificationBadge = alert.notificationMethod === 'email'
                    ? '<span class="badge badge-info">Email</span>'
                    : alert.notificationMethod === 'website'
                        ? '<span class="badge badge-primary">Website</span>'
                        : '<span class="badge badge-warning">Both</span>';

                const formattedDate = alert.dateCreated
                    ? new Date(alert.dateCreated).toLocaleString('en-ZA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'N/A';

                html += `
                                        <tr>
                                            <td>
                                                ${alert.productImage
                        ? `<img src="${escapeHtml(alert.productImage)}" alt="${escapeHtml(alert.productName)}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 0.5rem;">`
                        : ''
                    }
                                                <strong>${escapeHtml(alert.productName || 'Unknown Product')}</strong>
                                                ${alert.alertName ? `<br><small class="text-muted">${escapeHtml(alert.alertName)}</small>` : ''}
                                            </td>
                                            <td>${escapeHtml(alert.productBrand || 'Unknown')}</td>
                                            <td>R ${(alert.currentPrice || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td>R ${(alert.targetPrice || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td>${statusBadge}</td>
                                            <td>${notificationBadge}</td>
                                            <td><small>${formattedDate}</small></td>
                                        </tr>
                `;
            });

            html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    container.innerHTML = html;
}

// Toggle user alerts expansion
function toggleUserAlerts(userId) {
    if (expandedUsers.has(userId)) {
        expandedUsers.delete(userId);
    } else {
        expandedUsers.add(userId);
    }
    renderUserStats();
}

// Update statistics
function updateStats(stats) {
    const totalUsersCount = document.getElementById('totalUsersCount');
    const totalAlertsCount = document.getElementById('totalAlertsCount');
    const activeAlertsCount = document.getElementById('activeAlertsCount');
    const inactiveAlertsCount = document.getElementById('inactiveAlertsCount');

    if (totalUsersCount) totalUsersCount.textContent = stats.totalUsers || stats.totalUsersWithAlerts || 0;
    if (totalAlertsCount) totalAlertsCount.textContent = stats.totalAlerts || 0;
    if (activeAlertsCount) activeAlertsCount.textContent = stats.activeAlerts || stats.totalActiveAlerts || 0;
    if (inactiveAlertsCount) inactiveAlertsCount.textContent = stats.inactiveAlerts || stats.totalInactiveAlerts || 0;
}

// Refresh price alerts
function refreshAlerts() {
    loadPriceAlertStats();
    showAlert('Refreshing price alert statistics...', 'info');
}

// Export price alerts
function exportAlerts() {
    const csv = convertToCSV(filteredUserStats);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-alert-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Convert data to CSV
function convertToCSV(userStats) {
    const headers = ['User Email', 'User ID', 'Total Alerts', 'Active Alerts', 'Inactive Alerts'];
    const rows = userStats.map(stat => [
        stat.userEmail || 'N/A',
        stat.userId || 'N/A',
        stat.totalAlerts,
        stat.activeAlerts,
        stat.inactiveAlerts
    ]);

    return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    const container = document.getElementById('priceAlertsContainer');
    if (!container) return;

    container.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'mb-3';
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) {
            const pageHeader = contentWrapper.querySelector('.page-header');
            if (pageHeader && pageHeader.nextSibling) {
                contentWrapper.insertBefore(alertContainer, pageHeader.nextSibling);
            } else {
                contentWrapper.insertBefore(alertContainer, contentWrapper.firstChild);
            }
        }
    }

    const alertId = 'alert-' + Date.now();
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    alertContainer.innerHTML = alertHtml;

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check login state
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
            const userName = document.getElementById('userName');
            const userRoleHeader = document.getElementById('userRoleHeader');
            const dropdownUserName = document.getElementById('dropdownUserName');
            const dropdownUserEmail = document.getElementById('dropdownUserEmail');

            if (userAvatar) userAvatar.textContent = initials;
            if (userName) userName.textContent = displayName;
            if (userRoleHeader) userRoleHeader.textContent = (user.role || 'Super Admin').replace('_', ' ');
            if (dropdownUserName) dropdownUserName.textContent = displayName;
            if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || '';
        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Initialize Analytics Charts
function initializeCharts() {
    // Chart 1: Alerts Over Time (Line Chart)
    const alertsOverTimeCtx = document.getElementById('alertsOverTimeChart');
    if (alertsOverTimeCtx) {
        alertsOverTimeCtx.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - (alertsOverTimeCtx._lastTouchX || touch.clientX);
                const deltaY = touch.clientY - (alertsOverTimeCtx._lastTouchY || touch.clientY);
                alertsOverTimeCtx._lastTouchX = touch.clientX;
                alertsOverTimeCtx._lastTouchY = touch.clientY;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        const timeData = calculateAlertsOverTime();
        alertsOverTimeChart = new Chart(alertsOverTimeCtx, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Alerts Created',
                    data: timeData.data,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
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
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 2: Active vs Inactive Alerts (Design 2: Doughnut Chart)
    const alertStatusCtx = document.getElementById('alertStatusChart');
    if (alertStatusCtx) {
        alertStatusCtx.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - (alertStatusCtx._lastTouchX || touch.clientX);
                const deltaY = touch.clientY - (alertStatusCtx._lastTouchY || touch.clientY);
                alertStatusCtx._lastTouchX = touch.clientX;
                alertStatusCtx._lastTouchY = touch.clientY;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        const statusData = calculateAlertStatus();
        alertStatusChart = new Chart(alertStatusCtx, {
            type: 'doughnut',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.data,
                    backgroundColor: [
                        '#10b981', // Active (Emerald)
                        '#ef4444'  // Inactive (Red)
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // Design 2: Thin ring
                plugins: {
                    legend: {
                        position: 'right', // Design 2: Legend Right
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 3: Top Users by Alert Count (Design 3: Vertical Bar with Gradient)
    const topUsersCtx = document.getElementById('topUsersChart');
    if (topUsersCtx) {
        topUsersCtx.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - (topUsersCtx._lastTouchX || touch.clientX);
                const deltaY = touch.clientY - (topUsersCtx._lastTouchY || touch.clientY);
                topUsersCtx._lastTouchX = touch.clientX;
                topUsersCtx._lastTouchY = touch.clientY;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        const ctx3 = topUsersCtx.getContext('2d');
        const gradient3 = ctx3.createLinearGradient(0, 0, 0, 300);
        gradient3.addColorStop(0, '#8b5cf6');
        gradient3.addColorStop(1, '#6366f1');

        const usersData = calculateTopUsers();
        topUsersChart = new Chart(topUsersCtx, {
            type: 'bar',
            data: {
                labels: usersData.labels,
                datasets: [{
                    label: 'Total Alerts',
                    data: usersData.data,
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
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Chart 4: Notification Methods Distribution (Design 2: Doughnut Chart)
    const notificationMethodsCtx = document.getElementById('notificationMethodsChart');
    if (notificationMethodsCtx) {
        notificationMethodsCtx.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - (notificationMethodsCtx._lastTouchX || touch.clientX);
                const deltaY = touch.clientY - (notificationMethodsCtx._lastTouchY || touch.clientY);
                notificationMethodsCtx._lastTouchX = touch.clientX;
                notificationMethodsCtx._lastTouchY = touch.clientY;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        const methodsData = calculateNotificationMethods();
        notificationMethodsChart = new Chart(notificationMethodsCtx, {
            type: 'doughnut',
            data: {
                labels: methodsData.labels,
                datasets: [{
                    data: methodsData.data,
                    backgroundColor: [
                        '#3b82f6', // Blue
                        '#06b6d4', // Cyan
                        '#ec4899', // Pink
                        '#f59e0b', // Amber
                        '#10b981'  // Emerald
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // Design 2: Thin ring
                plugins: {
                    legend: {
                        position: 'right', // Design 2: Legend Right
                        labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }
}

// Calculate alerts over time data
function calculateAlertsOverTime() {
    const alerts = getAllAlerts();
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
    }

    const labels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });

    const data = last7Days.map(date => {
        return alerts.filter(alert => {
            if (!alert.dateCreated) return false;
            const alertDate = new Date(alert.dateCreated).toISOString().split('T')[0];
            return alertDate === date;
        }).length;
    });

    return { labels, data };
}

// Calculate alert status distribution
function calculateAlertStatus() {
    const alerts = getAllAlerts();
    const active = alerts.filter(a => a.status === 'active').length;
    const inactive = alerts.filter(a => a.status !== 'active').length;

    return {
        labels: ['Active', 'Inactive'],
        data: [active, inactive]
    };
}

// Calculate top users by alert count
function calculateTopUsers() {
    const sortedUsers = [...allUserStats].sort((a, b) => b.totalAlerts - a.totalAlerts).slice(0, 10);
    const labels = sortedUsers.map(user => {
        const email = user.userEmail || 'Unknown';
        return email.length > 20 ? email.substring(0, 20) + '...' : email;
    });
    const data = sortedUsers.map(user => user.totalAlerts);

    return { labels, data };
}

// Calculate notification methods distribution
function calculateNotificationMethods() {
    const alerts = getAllAlerts();
    const methods = {};

    alerts.forEach(alert => {
        const method = alert.notificationMethod || 'Unknown';
        methods[method] = (methods[method] || 0) + 1;
    });

    const labels = Object.keys(methods);
    const data = Object.values(methods);

    return { labels, data };
}

// Get all alerts from user stats
function getAllAlerts() {
    const allAlerts = [];
    allUserStats.forEach(user => {
        if (user.alerts && Array.isArray(user.alerts)) {
            allAlerts.push(...user.alerts);
        }
    });
    return allAlerts;
}

// Update charts with real data
function updateCharts() {
    if (!allUserStats || allUserStats.length === 0) {
        return;
    }

    // Update Chart 1: Alerts Over Time
    if (alertsOverTimeChart) {
        const timeData = calculateAlertsOverTime();
        alertsOverTimeChart.data.labels = timeData.labels;
        alertsOverTimeChart.data.datasets[0].data = timeData.data;
        alertsOverTimeChart.update();
    }

    // Update Chart 2: Alert Status
    if (alertStatusChart) {
        const statusData = calculateAlertStatus();
        alertStatusChart.data.labels = statusData.labels;
        alertStatusChart.data.datasets[0].data = statusData.data;
        alertStatusChart.update();
    }

    // Update Chart 3: Top Users
    if (topUsersChart) {
        const usersData = calculateTopUsers();
        topUsersChart.data.labels = usersData.labels;
        topUsersChart.data.datasets[0].data = usersData.data;
        topUsersChart.update();
    }

    // Update Chart 4: Notification Methods
    if (notificationMethodsChart) {
        const methodsData = calculateNotificationMethods();
        notificationMethodsChart.data.labels = methodsData.labels;
        notificationMethodsChart.data.datasets[0].data = methodsData.data;
        notificationMethodsChart.update();
    }
}

// Handle logout
async function handleLogout() {
    try {
        if (typeof window.adminAWSAuthService !== 'undefined') {
            await window.adminAWSAuthService.logout();
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = 'admin-login.html';
    }
}

// Initialize custom status dropdown
function initializeStatusDropdown() {
    const statusDropdown = document.getElementById('statusDropdown');
    const statusDropdownBtn = document.getElementById('statusDropdownBtn');
    const statusDropdownMenu = document.getElementById('statusDropdownMenu');
    const statusDropdownItems = document.getElementById('statusDropdownItems');
    const statusSelect = document.getElementById('statusSelect');

    if (!statusDropdown || !statusDropdownBtn || !statusDropdownMenu || !statusDropdownItems) return;

    // Status options
    const statusOptions = [
        { value: 'all', text: 'All Status' },
        { value: 'active', text: 'Active' },
        { value: 'inactive', text: 'Inactive' }
    ];

    // Render dropdown items
    statusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            // Update selected state
            statusDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            // Update button text and hidden input
            document.getElementById('statusDropdownText').textContent = option.text;
            statusSelect.value = option.value;

            // Close dropdown
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';

            // Apply filters
            applyFilters();
        });
        statusDropdownItems.appendChild(itemDiv);
    });

    // Toggle dropdown
    statusDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = statusDropdown.classList.contains('active');

        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'statusDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';
        } else {
            statusDropdown.classList.add('active');
            statusDropdownMenu.style.display = 'block';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';
        }
    });
}

