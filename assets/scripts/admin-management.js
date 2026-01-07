// Configuration
let API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://hub.comparehubprices.co.za';
// Remove /data suffix if present
if (API_BASE_URL.endsWith('/data')) {
    API_BASE_URL = API_BASE_URL.replace(/\/data$/, '');
}
const USERS_API = `${API_BASE_URL}/admin/admin/users/list`;
const MANAGE_USER_API = `${API_BASE_URL}/admin/admin/users`;

// State
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 25;

let currentTab = 'users';
let currentUserRole = 'viewer'; // Default to viewer permissions

// Chart instances
let accountTypeChart = null;
let userGrowthChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    loadUsers();
    checkLoginState();

    // Initialize account type selector dropdown
    initializeAccountTypeSelector();
});



// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));

    // Initialize custom dropdowns
    initializeAccountTypeDropdown();
    initializeStatusDropdown();

    document.getElementById('adminSearchInput').addEventListener('input', debounce(applyFilters, 300));

    // Initialize admin status dropdown
    initializeAdminStatusDropdown();

    document.getElementById('regularSearchInput').addEventListener('input', debounce(applyFilters, 300));

    // Initialize regular status dropdown
    initializeRegularStatusDropdown();

    document.getElementById('businessSearchInput').addEventListener('input', debounce(applyFilters, 300));

    // Initialize business status dropdown
    initializeBusinessStatusDropdown();
}

// Load users from API
async function loadUsers() {
    try {
        // Clear any existing data first
        allUsers = [];
        filteredUsers = [];
        updateStats();
        showLoading();

        const response = await fetch(`${USERS_API}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Check if it's a non-admin session error
            if (errorData.error === 'NOT_ADMIN_SESSION' || errorData.message?.includes('requires an admin session')) {
                showAlert('Your session was replaced by a regular user login. Please log in as admin again.', 'warning');
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                return;
            }

            throw new Error(errorData.message || `Failed to load users (HTTP ${response.status})`);
        }

        const data = await response.json();

        if (!data.success) {
            // Check if it's a non-admin session error
            if (data.error === 'NOT_ADMIN_SESSION' || data.message?.includes('requires an admin session')) {
                showAlert('Your session was replaced by a regular user login. Please log in as admin again.', 'warning');
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                return;
            }

            throw new Error(data.message || 'Failed to load users');
        }

        // Only use data from successful API response
        allUsers = Array.isArray(data.users) ? data.users : [];

        // Debug: Log users with suspension reasons
        const usersWithSuspension = allUsers.filter(u => u.suspensionReason);
        if (usersWithSuspension.length > 0) {
            console.log('Users with suspension reasons:', usersWithSuspension.map(u => ({ email: u.email, reason: u.suspensionReason })));
        } else {
            console.log('No users with suspension reasons found in API response');
        }

        updateStats();
        applyFilters();
    } catch (error) {
        console.error('Error loading users:', error);
        // Clear all data on error
        allUsers = [];
        filteredUsers = [];
        updateStats();
        applyFilters();
        showAlert('Failed to load users. Please check your connection and try again.', 'danger');
    }
}

// Apply filters
function applyFilters() {
    let searchTerm = '';
    let accountTypeFilter = 'all';
    let statusFilter = 'all';

    if (currentTab === 'users') {
        searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const accountTypeSelect = document.getElementById('accountTypeSelect');
        const statusSelect = document.getElementById('statusSelect');
        accountTypeFilter = accountTypeSelect ? accountTypeSelect.value : 'all';
        statusFilter = statusSelect ? statusSelect.value : 'all';
    } else if (currentTab === 'admins') {
        searchTerm = document.getElementById('adminSearchInput').value.toLowerCase();
        accountTypeFilter = 'admin';
        const adminStatusSelect = document.getElementById('adminStatusSelect');
        statusFilter = adminStatusSelect ? adminStatusSelect.value : 'all';
    } else if (currentTab === 'regular') {
        searchTerm = document.getElementById('regularSearchInput').value.toLowerCase();
        accountTypeFilter = 'regular';
        const regularStatusSelect = document.getElementById('regularStatusSelect');
        statusFilter = regularStatusSelect ? regularStatusSelect.value : 'all';
    } else if (currentTab === 'business') {
        searchTerm = document.getElementById('businessSearchInput').value.toLowerCase();
        accountTypeFilter = 'business';
        const businessStatusSelect = document.getElementById('businessStatusSelect');
        statusFilter = businessStatusSelect ? businessStatusSelect.value : 'all';
    }

    filteredUsers = allUsers.filter(user => {
        // Search filter
        const matchesSearch = !searchTerm ||
            user.email.toLowerCase().includes(searchTerm) ||
            (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
            (user.givenName && user.givenName.toLowerCase().includes(searchTerm)) ||
            (user.familyName && user.familyName.toLowerCase().includes(searchTerm));

        // Account type filter
        const matchesAccountType = accountTypeFilter === 'all' || user.accountType === accountTypeFilter;

        // Status filter
        let userStatus = user.verified ? 'verified' : 'pending';
        if (user.status === 'suspended') userStatus = 'suspended';
        const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;

        return matchesSearch && matchesAccountType && matchesStatus;
    });

    currentPage = 1;
    renderUsers();
}

// Render users table
function renderUsers() {
    let containerId;
    if (currentTab === 'users') {
        containerId = 'usersTableContainer';
    } else if (currentTab === 'admins') {
        containerId = 'adminsTableContainer';
    } else if (currentTab === 'regular') {
        containerId = 'regularTableContainer';
    } else if (currentTab === 'business') {
        containerId = 'businessTableContainer';
    }
    const container = document.getElementById(containerId);

    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h4>No users found</h4>
                <p>No users match your current filters.</p>
            </div>
        `;
        if (currentTab === 'users') {
            document.getElementById('paginationContainer').style.display = 'none';
        }
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);

    let html = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Account Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Last Login</th>
                        <th>Suspension Reason</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    pageUsers.forEach(user => {
        const statusBadge = getStatusBadge(user);
        const accountTypeBadge = getAccountTypeBadge(user.accountType);
        const createdDate = formatDate(user.createdAt);
        const lastLogin = user.lastLogin ? formatDate(user.lastLogin) : 'Never';
        const initials = getInitials(user.displayName || user.email);

        // Display suspension reason if it exists (regardless of current status - for historical record)
        let suspensionReason = '<span class="text-muted">-</span>';
        if (user.suspensionReason) {
            const reasonText = escapeHtml(user.suspensionReason);
            const displayText = reasonText.length > 30 ? reasonText.substring(0, 30) + '...' : reasonText;
            suspensionReason = `<span class="text-danger" title="${reasonText}"><i class="fas fa-info-circle"></i> ${displayText}</span>`;
        }

        html += `
            <tr>
                <td>
                    <div class="user-info" style="cursor: pointer;" onclick="showUserDetailsModal('${escapeHtml(user.email)}', '${escapeHtml(user.accountType)}')" title="Click to view details">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-details">
                            <div class="user-name">${escapeHtml(user.displayName || user.email)}</div>
                            <div class="user-email">${escapeHtml(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td>${accountTypeBadge}</td>
                <td>${statusBadge}</td>
                <td>${createdDate}</td>
                <td>${lastLogin}</td>
                <td>${suspensionReason}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-info btn-sm" onclick="event.stopPropagation(); showUserDetailsModal('${escapeHtml(user.email)}', '${escapeHtml(user.accountType)}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${user.accountType !== 'admin' && currentUserRole !== 'viewer' ? (
                user.status !== 'suspended' ?
                    `<button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); showSuspendModal('${escapeHtml(user.email)}', '${escapeHtml(user.displayName || user.email)}')" title="Suspend">
                                    <i class="fas fa-ban"></i>
                                </button>` :
                    `<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); unsuspendUser('${escapeHtml(user.email)}')" title="Unsuspend">
                                    <i class="fas fa-check"></i>
                                </button>`
            ) : ''}
                        ${user.accountType !== 'admin' && currentUserRole === 'super_admin' ?
                `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteUser('${escapeHtml(user.email)}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>` :
                (user.accountType !== 'admin' ? '' : '<span class="text-muted small">Protected</span>')
            }
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    if (currentTab === 'users') {
        renderPagination();
    }
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginationContainer = document.getElementById('paginationContainer');
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'block';
    pagination.innerHTML = '';

    // Previous button
    pagination.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pagination.innerHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            pagination.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Next button
    pagination.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
        </li>
    `;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderUsers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Update statistics
function updateStats() {
    document.getElementById('totalUsersCount').textContent = allUsers.length;
    document.getElementById('adminUsersCount').textContent = allUsers.filter(u => u.accountType === 'admin').length;
    document.getElementById('regularUsersCount').textContent = allUsers.filter(u => u.accountType === 'regular').length;
    document.getElementById('businessUsersCount').textContent = allUsers.filter(u => u.accountType === 'business').length;

    // Update charts
    updateCharts();
}

// Update visual charts
function updateCharts() {
    // Account Type Distribution Chart
    const adminCount = allUsers.filter(u => u.accountType === 'admin').length;
    const regularCount = allUsers.filter(u => u.accountType === 'regular').length;
    const businessCount = allUsers.filter(u => u.accountType === 'business').length;

    if (accountTypeChart) {
        accountTypeChart.destroy();
    }

    const accountTypeCtx = document.getElementById('accountTypeChart');
    if (accountTypeCtx) {
        // Prevent scroll on chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        accountTypeCtx.addEventListener('wheel', preventScroll, { passive: false });
        accountTypeCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

        accountTypeChart = new Chart(accountTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Regular Users', 'Business Users', 'Admin Users'],
                datasets: [{
                    data: [regularCount, businessCount, adminCount],
                    backgroundColor: [
                        '#3b82f6', // Blue (Regular)
                        '#06b6d4', // Cyan (Business)
                        '#ec4899'  // Pink (Admin)
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                if (total > 0) {
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    label += context.parsed + ' (' + percentage + '%)';
                                } else {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }

    // Status Distribution (Progress Bars)
    const verifiedCount = allUsers.filter(u => u.verified && u.status !== 'suspended').length;
    const pendingCount = allUsers.filter(u => !u.verified && u.status !== 'suspended').length;
    const suspendedCount = allUsers.filter(u => u.status === 'suspended').length;
    const total = allUsers.length;

    const statusChartContainer = document.getElementById('statusDistributionChart');
    if (statusChartContainer && total > 0) {
        const verifiedPercent = ((verifiedCount / total) * 100).toFixed(1);
        const pendingPercent = ((pendingCount / total) * 100).toFixed(1);
        const suspendedPercent = ((suspendedCount / total) * 100).toFixed(1);

        statusChartContainer.innerHTML = `
            <div class="race-item">
                <div class="race-header">
                    <span class="race-title">
                        Verified
                        <i class="fas fa-check-circle text-success" style="font-size: 0.8rem;"></i>
                    </span>
                    <span class="race-count" style="color: #10b981;">${verifiedCount} (${verifiedPercent}%)</span>
                </div>
                <div class="race-track">
                    <div class="race-bar" style="width: ${verifiedPercent}%; background: #10b981;"></div>
                </div>
            </div>

            <div class="race-item">
                <div class="race-header">
                    <span class="race-title">
                        Pending
                        <i class="fas fa-clock text-warning" style="font-size: 0.8rem;"></i>
                    </span>
                    <span class="race-count" style="color: #f59e0b;">${pendingCount} (${pendingPercent}%)</span>
                </div>
                <div class="race-track">
                    <div class="race-bar" style="width: ${pendingPercent}%; background: #f59e0b;"></div>
                </div>
            </div>

            <div class="race-item">
                <div class="race-header">
                    <span class="race-title">
                        Suspended
                        <i class="fas fa-ban text-danger" style="font-size: 0.8rem;"></i>
                    </span>
                    <span class="race-count" style="color: #ef4444;">${suspendedCount} (${suspendedPercent}%)</span>
                </div>
                <div class="race-track">
                    <div class="race-bar" style="width: ${suspendedPercent}%; background: #ef4444;"></div>
                </div>
            </div>
        `;
    }

    // User Growth Chart (based on creation dates)
    if (userGrowthChart) {
        userGrowthChart.destroy();
    }

    const userGrowthCtx = document.getElementById('userGrowthChart');
    if (userGrowthCtx && allUsers.length > 0) {
        // Prevent scroll on chart
        const preventScroll = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        userGrowthCtx.addEventListener('wheel', preventScroll, { passive: false });
        userGrowthCtx.addEventListener('DOMMouseScroll', preventScroll, { passive: false });

        // Group users by month based on createdAt
        const monthlyData = {};
        const currentDate = new Date();
        const months = [];

        // Get last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            months.push(monthKey);
            monthlyData[monthKey] = 0;
        }

        // Count users by month
        allUsers.forEach(user => {
            if (user.createdAt) {
                const userDate = new Date(user.createdAt);
                const monthKey = userDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                if (monthlyData.hasOwnProperty(monthKey)) {
                    monthlyData[monthKey]++;
                }
            }
        });

        // Calculate cumulative totals
        const cumulativeData = [];
        let runningTotal = 0;
        months.forEach(month => {
            runningTotal += monthlyData[month];
            cumulativeData.push(runningTotal);
        });

        const monthlyCounts = months.map(month => monthlyData[month]);

        userGrowthChart = new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Total Users',
                    data: cumulativeData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'New Users This Month',
                    data: monthlyCounts,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: Math.ceil(Math.max(...cumulativeData) / 10) || 1
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
    }
}

// User actions
function showUserDetailsModal(email, accountType) {
    const modal = new bootstrap.Modal(document.getElementById('viewUserDetailsModal'));
    const content = document.getElementById('userDetailsContent');

    // Determine account type from current tab (source of truth)
    let targetAccountType = accountType;

    // Override with current tab if we're in a specific account type tab
    if (currentTab === 'regular') {
        targetAccountType = 'regular';
    } else if (currentTab === 'business') {
        targetAccountType = 'business';
    } else if (currentTab === 'admins') {
        targetAccountType = 'admin';
    }

    // Find user in allUsers array by both email AND accountType
    let user = null;

    if (targetAccountType) {
        user = allUsers.find(u => u.email === email && u.accountType === targetAccountType);
    }

    // If not found and we're in 'users' tab, try to find any match
    if (!user && currentTab === 'users') {
        user = allUsers.find(u => u.email === email);
    }

    if (!user) {
        content.innerHTML = `<div class="alert alert-danger">
            <strong>User not found</strong><br>
            Email: ${escapeHtml(email)}<br>
            Looking for account type: ${targetAccountType || 'any'}<br>
            Current tab: ${currentTab}
        </div>`;
        modal.show();
        return;
    }

    // Format dates
    const createdDate = formatDate(user.createdAt) || 'N/A';
    const lastLogin = user.lastLogin ? formatDate(user.lastLogin) : 'Never';
    const updatedDate = user.updatedAt ? formatDate(user.updatedAt) : 'N/A';
    const suspendedDate = user.suspendedAt ? formatDate(user.suspendedAt) : null;
    const unsuspendedDate = user.unsuspendedAt ? formatDate(user.unsuspendedAt) : null;

    // Build user details HTML with modern card-based design
    let detailsHTML = `
        <style>
            .user-detail-card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 1.25rem;
                border: 2px solid #bfdbfe;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            .user-detail-card-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.25rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #bfdbfe;
            }
            .user-detail-card-header i {
                font-size: 1.25rem;
                color: #2563eb;
            }
            .user-detail-card-title {
                font-size: 1rem;
                font-weight: 700;
                color: #0f172a;
                margin: 0;
            }
            .user-detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.25rem;
            }
            .user-detail-item {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .user-detail-label {
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #64748b;
            }
            .user-detail-value {
                font-size: 0.95rem;
                font-weight: 600;
                color: #0f172a;
            }
            .user-profile-header {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                padding: 2.5rem 2rem;
                border-bottom: 2px solid #bfdbfe;
            }
            .user-profile-avatar {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 2.5rem;
                border: 4px solid white;
                box-shadow: 0 8px 24px rgba(37, 99, 235, 0.2);
                margin: 0 auto 1.25rem;
            }
            .user-profile-name {
                font-size: 1.75rem;
                font-weight: 900;
                color: #0f172a;
                margin-bottom: 0.5rem;
                text-align: center;
            }
            .user-profile-email {
                font-size: 1rem;
                color: #64748b;
                text-align: center;
                margin-bottom: 1.5rem;
            }
            .user-profile-badges {
                display: flex;
                justify-content: center;
                gap: 0.75rem;
                flex-wrap: wrap;
            }
        </style>
        
        <!-- User Profile Header -->
        <div class="user-profile-header">
            <div class="user-profile-avatar">
                ${getInitials(user.displayName || user.email)}
            </div>
            <h3 class="user-profile-name">${escapeHtml(user.displayName || user.email)}</h3>
            <p class="user-profile-email">${escapeHtml(user.email)}</p>
            <div class="user-profile-badges">
                ${getAccountTypeBadge(user.accountType)}
                ${getStatusBadge(user)}
                ${user.verified ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Verified</span>' : '<span class="badge badge-warning"><i class="fas fa-exclamation-circle"></i> Not Verified</span>'}
            </div>
        </div>
        
        <div style="padding: 2rem;">
            <!-- Account Information Card -->
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-user-circle"></i>
                    <h6 class="user-detail-card-title">Account Information</h6>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-user-tag"></i> Account Type</div>
                        <div class="user-detail-value">${getAccountTypeBadge(user.accountType)}</div>
                    </div>
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-info-circle"></i> Status</div>
                        <div class="user-detail-value">${getStatusBadge(user)}</div>
                    </div>
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-check-circle"></i> Email Verified</div>
                        <div class="user-detail-value">${user.verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Not Verified</span>'}</div>
                    </div>
                    ${user.userId ? `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-id-card"></i> User ID</div>
                        <div class="user-detail-value"><code style="font-size: 0.85rem; background: #eff6ff; padding: 0.25rem 0.5rem; border-radius: 6px;">${escapeHtml(user.userId)}</code></div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Timeline Information Card -->
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-clock"></i>
                    <h6 class="user-detail-card-title">Timeline</h6>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-calendar-plus"></i> Account Created</div>
                        <div class="user-detail-value">${createdDate}</div>
                    </div>
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-sign-in-alt"></i> Last Login</div>
                        <div class="user-detail-value">${lastLogin}</div>
                    </div>
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-edit"></i> Last Updated</div>
                        <div class="user-detail-value">${updatedDate}</div>
                    </div>
                </div>
            </div>
            
            <!-- Personal Information Card -->
            ${(user.givenName || user.familyName) ? `
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-user"></i>
                    <h6 class="user-detail-card-title">Personal Information</h6>
                </div>
                <div class="user-detail-grid">
                    ${user.givenName ? `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-user"></i> First Name</div>
                        <div class="user-detail-value">${escapeHtml(user.givenName)}</div>
                    </div>
                    ` : ''}
                    ${user.familyName ? `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-user"></i> Last Name</div>
                        <div class="user-detail-value">${escapeHtml(user.familyName)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Business Information Card -->
            ${(user.accountType === 'business' && user.businessName) ? `
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-building"></i>
                    <h6 class="user-detail-card-title">Business Information</h6>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-store"></i> Business Name</div>
                        <div class="user-detail-value">${escapeHtml(user.businessName || 'N/A')}</div>
                    </div>
                    ${user.businessNumber ? `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-phone"></i> Business Phone</div>
                        <div class="user-detail-value">${escapeHtml(user.businessNumber)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Suspension History Card -->
            ${(user.suspensionReason || user.status === 'suspended' || suspendedDate) ? `
            <div class="user-detail-card" style="border-left: 4px solid #f59e0b;">
                <div class="user-detail-card-header">
                    <i class="fas fa-ban" style="color: #f59e0b;"></i>
                    <h6 class="user-detail-card-title">Suspension History</h6>
                </div>
                <div class="user-detail-grid">
                    ${user.suspensionReason ? `
                    <div class="user-detail-item" style="grid-column: 1 / -1;">
                        <div class="user-detail-label"><i class="fas fa-exclamation-triangle"></i> Suspension Reason</div>
                        <div class="user-detail-value" style="background: #fff7ed; padding: 1rem; border-radius: 8px; border-left: 3px solid #f59e0b; color: #92400e; font-weight: 500;">${escapeHtml(user.suspensionReason)}</div>
                    </div>
                    ` : ''}
                    ${suspendedDate ? `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-calendar-times"></i> Suspended At</div>
                        <div class="user-detail-value">${suspendedDate}</div>
                    </div>
                    ` : ''}
                    ${unsuspendedDate ? `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-calendar-check"></i> Unsuspended At</div>
                        <div class="user-detail-value">${unsuspendedDate}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Additional Information Card -->
            ${(() => {
            const metadataFields = ['city', 'province', 'phoneNumber', 'address', 'postalCode'];
            const hasMetadata = metadataFields.some(field => user[field]);
            if (!hasMetadata) return '';

            let metadataHTML = `
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-map-marker-alt"></i>
                    <h6 class="user-detail-card-title">Additional Information</h6>
                </div>
                <div class="user-detail-grid">
                `;

            if (user.city || user.province) {
                metadataHTML += `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-location-dot"></i> Location</div>
                        <div class="user-detail-value">${escapeHtml([user.city, user.province].filter(Boolean).join(', ') || 'N/A')}</div>
                    </div>
                    `;
            }

            if (user.phoneNumber) {
                metadataHTML += `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-phone"></i> Phone Number</div>
                        <div class="user-detail-value">${escapeHtml(user.phoneNumber)}</div>
                    </div>
                    `;
            }

            if (user.address) {
                metadataHTML += `
                    <div class="user-detail-item" style="grid-column: 1 / -1;">
                        <div class="user-detail-label"><i class="fas fa-home"></i> Address</div>
                        <div class="user-detail-value">${escapeHtml(user.address)}</div>
                    </div>
                    `;
            }

            if (user.postalCode) {
                metadataHTML += `
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-mail-bulk"></i> Postal Code</div>
                        <div class="user-detail-value">${escapeHtml(user.postalCode)}</div>
                    </div>
                    `;
            }

            metadataHTML += `
                </div>
            </div>
                `;
            return metadataHTML;
        })()}
            
            <!-- Authentication Provider Card -->
            ${user.provider ? `
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-key"></i>
                    <h6 class="user-detail-card-title">Authentication</h6>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <div class="user-detail-label"><i class="fas fa-shield-alt"></i> Provider</div>
                        <div class="user-detail-value"><span class="badge badge-info">${escapeHtml(user.provider)}</span></div>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    content.innerHTML = detailsHTML;
    modal.show();
}

function showSuspendModal(email, displayName) {
    document.getElementById('suspendUserEmail').textContent = displayName || email;
    document.getElementById('suspendUserEmailHidden').value = email;
    document.getElementById('suspensionReason').value = '';
    document.getElementById('suspendUserForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('suspendUserModal'));
    modal.show();
}

async function confirmSuspendUser() {
    const form = document.getElementById('suspendUserForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const email = document.getElementById('suspendUserEmailHidden').value;
    const reason = document.getElementById('suspensionReason').value;

    try {
        const response = await fetch(`${MANAGE_USER_API}/${encodeURIComponent(email)}/suspend`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            bootstrap.Modal.getInstance(document.getElementById('suspendUserModal')).hide();
            loadUsers();
            showAlert(`User suspended successfully. Reason: ${reason}`, 'success');
        } else {
            showAlert(data.message || 'Failed to suspend user', 'danger');
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        showAlert('Failed to suspend user. Please try again.', 'danger');
    }
}

async function unsuspendUser(email) {
    try {
        const response = await fetch(`${MANAGE_USER_API}/${encodeURIComponent(email)}/unsuspend`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            loadUsers();
            showAlert('User unsuspended successfully', 'success');
        } else {
            showAlert(data.message || 'Failed to unsuspend user', 'danger');
        }
    } catch (error) {
        console.error('Error unsuspending user:', error);
        showAlert('Failed to unsuspend user. Please try again.', 'danger');
    }
}

async function deleteUser(email) {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) return;

    try {
        const response = await fetch(`${MANAGE_USER_API}/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
            loadUsers();
            showAlert('User deleted successfully', 'success');
        } else {
            showAlert(data.message || 'Failed to delete user', 'danger');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user. Please try again.', 'danger');
    }
}

function refreshUsers() {
    loadUsers();
    showAlert('Refreshing users...', 'info');
}

function exportUsers() {
    const csv = convertToCSV(filteredUsers);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('Users exported successfully', 'success');
}

// Utility functions
function getStatusBadge(user) {
    let status = user.verified ? 'verified' : 'pending';
    if (user.status === 'suspended') status = 'suspended';

    const badges = {
        'verified': '<span class="badge badge-success">Verified</span>',
        'pending': '<span class="badge badge-warning">Pending</span>',
        'suspended': '<span class="badge badge-danger">Suspended</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">Unknown</span>';
}

function getAccountTypeBadge(type) {
    const badges = {
        'admin': '<span class="badge badge-danger"><i class="fas fa-user-shield"></i> Admin</span>',
        'business': '<span class="badge badge-info"><i class="fas fa-building"></i> Business</span>',
        'regular': '<span class="badge badge-primary"><i class="fas fa-user"></i> Regular</span>'
    };
    return badges[type] || '<span class="badge badge-secondary">Unknown</span>';
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    let containerId;
    if (currentTab === 'users') {
        containerId = 'usersTableContainer';
    } else if (currentTab === 'admins') {
        containerId = 'adminsTableContainer';
    } else if (currentTab === 'regular') {
        containerId = 'regularTableContainer';
    } else if (currentTab === 'business') {
        containerId = 'businessTableContainer';
    }
    document.getElementById(containerId).innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
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

function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = ['Email', 'Name', 'Account Type', 'Status', 'Created Date', 'Last Login'];
    const rows = data.map(user => [
        user.email || '',
        user.displayName || '',
        user.accountType || '',
        user.verified ? 'verified' : 'pending',
        user.createdAt || '',
        user.lastLogin || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
}

// Check login state and update header
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

            if (userAvatar) userAvatar.textContent = initials;
            if (userName) userName.textContent = displayName;

            // Set current user role for RBAC
            currentUserRole = user.role || 'viewer';

            const rawRole = (user.role || 'viewer').replace('_', ' ');
            const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

            const roleHeader = document.getElementById('userRoleHeader');
            if (roleHeader) roleHeader.textContent = roleDisplay;

            const ddName = document.getElementById('dropdownUserName');
            if (ddName) ddName.textContent = displayName;
            const ddEmail = document.getElementById('dropdownUserEmail');
            if (ddEmail) ddEmail.textContent = user.email || '';

            console.log('Current Admin Role:', currentUserRole);

            // Re-render users if they were loaded before role was set
            if (allUsers.length > 0) {
                renderUsers();
            }
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

// Initialize custom account type dropdown
function initializeAccountTypeDropdown() {
    const accountTypeDropdown = document.getElementById('accountTypeDropdown');
    const accountTypeDropdownBtn = document.getElementById('accountTypeDropdownBtn');
    const accountTypeDropdownMenu = document.getElementById('accountTypeDropdownMenu');
    const accountTypeDropdownItems = document.getElementById('accountTypeDropdownItems');
    const accountTypeSelect = document.getElementById('accountTypeSelect');

    if (!accountTypeDropdown || !accountTypeDropdownBtn || !accountTypeDropdownMenu || !accountTypeDropdownItems) return;

    const accountTypeOptions = [
        { value: 'all', text: 'All Account Types' },
        { value: 'admin', text: 'Admin' },
        { value: 'regular', text: 'Regular' },
        { value: 'business', text: 'Business' }
    ];

    accountTypeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            accountTypeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('accountTypeDropdownText').textContent = option.text;
            accountTypeSelect.value = option.value;

            accountTypeDropdown.classList.remove('active');
            accountTypeDropdownMenu.style.display = 'none';

            applyFilters();
        });
        accountTypeDropdownItems.appendChild(itemDiv);
    });

    accountTypeDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = accountTypeDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'accountTypeDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            accountTypeDropdown.classList.remove('active');
            accountTypeDropdownMenu.style.display = 'none';
        } else {
            accountTypeDropdown.classList.add('active');
            accountTypeDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            accountTypeDropdown.classList.remove('active');
            accountTypeDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom status dropdown
function initializeStatusDropdown() {
    const statusDropdown = document.getElementById('statusDropdown');
    const statusDropdownBtn = document.getElementById('statusDropdownBtn');
    const statusDropdownMenu = document.getElementById('statusDropdownMenu');
    const statusDropdownItems = document.getElementById('statusDropdownItems');
    const statusSelect = document.getElementById('statusSelect');

    if (!statusDropdown || !statusDropdownBtn || !statusDropdownMenu || !statusDropdownItems) return;

    const statusOptions = [
        { value: 'all', text: 'All Status' },
        { value: 'verified', text: 'Verified' },
        { value: 'pending', text: 'Pending Verification' },
        { value: 'suspended', text: 'Suspended' }
    ];

    statusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            statusDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('statusDropdownText').textContent = option.text;
            statusSelect.value = option.value;

            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';

            applyFilters();
        });
        statusDropdownItems.appendChild(itemDiv);
    });

    statusDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = statusDropdown.classList.contains('active');

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

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            statusDropdown.classList.remove('active');
            statusDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize account type selector dropdown
function initializeAccountTypeSelector() {
    const accountTypeSelectorDropdown = document.getElementById('accountTypeSelectorDropdown');
    const accountTypeSelectorBtn = document.getElementById('accountTypeSelectorBtn');
    const accountTypeSelectorMenu = document.getElementById('accountTypeSelectorMenu');
    const accountTypeSelectorItems = document.getElementById('accountTypeSelectorItems');
    const accountTypeSelector = document.getElementById('accountTypeSelector');

    if (!accountTypeSelectorDropdown || !accountTypeSelectorBtn || !accountTypeSelectorMenu || !accountTypeSelectorItems) return;

    const accountTypeOptions = [
        { value: 'users', text: 'All Users', icon: 'fa-users' },
        { value: 'admins', text: 'Admin Accounts', icon: 'fa-user-shield' },
        { value: 'regular', text: 'Regular Accounts', icon: 'fa-user' },
        { value: 'business', text: 'Business Accounts', icon: 'fa-building' }
    ];

    accountTypeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.innerHTML = `<i class="fas ${option.icon}"></i> ${option.text}`;
        if (option.value === 'users') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            accountTypeSelectorItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('accountTypeSelectorText').innerHTML = `<i class="fas ${option.icon}"></i> ${option.text}`;
            accountTypeSelector.value = option.value;

            accountTypeSelectorDropdown.classList.remove('active');
            accountTypeSelectorMenu.style.display = 'none';

            // Switch tabs
            switchTab(option.value);
        });
        accountTypeSelectorItems.appendChild(itemDiv);
    });

    accountTypeSelectorBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = accountTypeSelectorDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'accountTypeSelectorDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            accountTypeSelectorDropdown.classList.remove('active');
            accountTypeSelectorMenu.style.display = 'none';
        } else {
            accountTypeSelectorDropdown.classList.add('active');
            accountTypeSelectorMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            accountTypeSelectorDropdown.classList.remove('active');
            accountTypeSelectorMenu.style.display = 'none';
        }
    });
}

// Initialize custom admin status dropdown
function initializeAdminStatusDropdown() {
    const adminStatusDropdown = document.getElementById('adminStatusDropdown');
    const adminStatusDropdownBtn = document.getElementById('adminStatusDropdownBtn');
    const adminStatusDropdownMenu = document.getElementById('adminStatusDropdownMenu');
    const adminStatusDropdownItems = document.getElementById('adminStatusDropdownItems');
    const adminStatusSelect = document.getElementById('adminStatusSelect');

    if (!adminStatusDropdown || !adminStatusDropdownBtn || !adminStatusDropdownMenu || !adminStatusDropdownItems) return;

    const adminStatusOptions = [
        { value: 'all', text: 'All Status' },
        { value: 'verified', text: 'Verified' },
        { value: 'pending', text: 'Pending' }
    ];

    adminStatusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            adminStatusDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('adminStatusDropdownText').textContent = option.text;
            adminStatusSelect.value = option.value;

            adminStatusDropdown.classList.remove('active');
            adminStatusDropdownMenu.style.display = 'none';

            applyFilters();
        });
        adminStatusDropdownItems.appendChild(itemDiv);
    });

    adminStatusDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = adminStatusDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'adminStatusDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            adminStatusDropdown.classList.remove('active');
            adminStatusDropdownMenu.style.display = 'none';
        } else {
            adminStatusDropdown.classList.add('active');
            adminStatusDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            adminStatusDropdown.classList.remove('active');
            adminStatusDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom business status dropdown
function initializeBusinessStatusDropdown() {
    const businessStatusDropdown = document.getElementById('businessStatusDropdown');
    const businessStatusDropdownBtn = document.getElementById('businessStatusDropdownBtn');
    const businessStatusDropdownMenu = document.getElementById('businessStatusDropdownMenu');
    const businessStatusDropdownItems = document.getElementById('businessStatusDropdownItems');
    const businessStatusSelect = document.getElementById('businessStatusSelect');

    if (!businessStatusDropdown || !businessStatusDropdownBtn || !businessStatusDropdownMenu || !businessStatusDropdownItems) return;

    const businessStatusOptions = [
        { value: 'all', text: 'All Status' },
        { value: 'verified', text: 'Verified' },
        { value: 'pending', text: 'Pending' }
    ];

    businessStatusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            businessStatusDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('businessStatusDropdownText').textContent = option.text;
            businessStatusSelect.value = option.value;

            businessStatusDropdown.classList.remove('active');
            businessStatusDropdownMenu.style.display = 'none';

            applyFilters();
        });
        businessStatusDropdownItems.appendChild(itemDiv);
    });

    businessStatusDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = businessStatusDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'businessStatusDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            businessStatusDropdown.classList.remove('active');
            businessStatusDropdownMenu.style.display = 'none';
        } else {
            businessStatusDropdown.classList.add('active');
            businessStatusDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            businessStatusDropdown.classList.remove('active');
            businessStatusDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom regular status dropdown
function initializeRegularStatusDropdown() {
    const regularStatusDropdown = document.getElementById('regularStatusDropdown');
    const regularStatusDropdownBtn = document.getElementById('regularStatusDropdownBtn');
    const regularStatusDropdownMenu = document.getElementById('regularStatusDropdownMenu');
    const regularStatusDropdownItems = document.getElementById('regularStatusDropdownItems');
    const regularStatusSelect = document.getElementById('regularStatusSelect');

    if (!regularStatusDropdown || !regularStatusDropdownBtn || !regularStatusDropdownMenu || !regularStatusDropdownItems) return;

    const regularStatusOptions = [
        { value: 'all', text: 'All Status' },
        { value: 'verified', text: 'Verified' },
        { value: 'pending', text: 'Pending' },
        { value: 'suspended', text: 'Suspended' }
    ];

    regularStatusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            regularStatusDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('regularStatusDropdownText').textContent = option.text;
            regularStatusSelect.value = option.value;

            regularStatusDropdown.classList.remove('active');
            regularStatusDropdownMenu.style.display = 'none';

            applyFilters();
        });
        regularStatusDropdownItems.appendChild(itemDiv);
    });

    regularStatusDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = regularStatusDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'regularStatusDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            regularStatusDropdown.classList.remove('active');
            regularStatusDropdownMenu.style.display = 'none';
        } else {
            regularStatusDropdown.classList.add('active');
            regularStatusDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            regularStatusDropdown.classList.remove('active');
            regularStatusDropdownMenu.style.display = 'none';
        }
    });
}

// Switch between tabs
function switchTab(tabValue) {
    currentTab = tabValue;

    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('show', 'active');
    });

    // Show selected tab pane
    const targetPane = document.getElementById(tabValue);
    if (targetPane) {
        targetPane.style.display = 'block';
        targetPane.classList.add('show', 'active');
    }

    // Apply filters for the new tab
    applyFilters();
}

// Attach logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

