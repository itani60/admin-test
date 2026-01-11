// Configuration
let API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://hub.comparehubprices.co.za';
// Remove /data suffix if present
if (API_BASE_URL.endsWith('/data')) {
    API_BASE_URL = API_BASE_URL.replace(/\/data$/, '');
}
// Unified endpoint for listing (GET) and management (PUT/DELETE)
const USERS_API = `${API_BASE_URL}/admin/admin/users/manage`;
const MANAGE_USER_API = `${API_BASE_URL}/admin/admin/users/manage`;

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

    // loadUsers(); // Moved to checkLoginState
    checkLoginState();
    initializeSuspendDropdown();
});

// Check login state
// Check login state
async function checkLoginState() {
    if (typeof window.adminAWSAuthService !== 'undefined') {
        try {
            const result = await window.adminAWSAuthService.getUserInfo();
            if (result.success && result.user) {
                // Check Permission
                const perms = window.adminAWSAuthService.getGlobalPermissions();
                const teamPerm = perms?.canManageTeam || 'none';

                if (teamPerm === 'none') {
                    window.location.href = 'index.html';
                    return;
                }

                // Populate user info using the shared service to ensure consistency
                await window.adminAWSAuthService.checkLoginAndPopulateUI();
                const user = result.user;

                // Store current user role for RBAC
                currentUserRole = user.role || 'viewer';

                // Load Data Now
                loadUsers();

                // Handle Limited Access (Manager)
                if (teamPerm === 'limited') {
                    document.body.classList.add('access-limited');
                    // Hide Create Buttons if any
                    const createBtns = document.querySelectorAll('.btn-create, .btn-primary');
                    createBtns.forEach(btn => {
                        if (btn.textContent.includes('Add') || btn.textContent.includes('Invite')) btn.style.display = 'none';
                    });
                }

            } else {
                window.location.href = 'admin-login.html';
            }
        } catch (error) {
            console.error('Error checking login state:', error);
            window.location.href = 'admin-login.html';
        }
    } else {
        // Retry if auth service is not ready yet
        setTimeout(checkLoginState, 500);
    }
}



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

        // Support for server-side search/pagination can be added here
        // For now, we fetch all (defaulting to Lambda's limit or full list if supported)
        // If we want to use the new ?limit=50 or ?search=... we would append query params.
        // Keeping it simple as per original request, just updating endpoint.
        const response = await fetch(`${USERS_API}?limit=100`, {
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
        const accountTypeBadge = getAccountTypeBadge(user);
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
            .detail-badge {
                padding: 0.35rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 600;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .detail-badge-account { background: #e0f2fe; color: #0284c7; }
            .detail-badge-status { background: #dcfce7; color: #16a34a; }
        </style>

        <div class="user-profile-header">
            <div class="user-profile-avatar">${user.displayName ? (user.displayName.charAt(0) || user.email.charAt(0)).toUpperCase() : 'U'}</div>
            <h3 class="user-profile-name">${escapeHtml(user.displayName || user.email)}</h3>
            <div class="user-profile-email">${escapeHtml(user.email)}</div>
            <div class="user-profile-badges">
                <span class="detail-badge detail-badge-account">
                    <i class="fas fa-user-tag me-1"></i> ${escapeHtml(user.accountType)}
                </span>
                <span class="detail-badge ${user.status === 'suspended' ? 'bg-danger text-white' : 'detail-badge-status'}">
                     <i class="fas ${user.status === 'suspended' ? 'fa-ban' : 'fa-check-circle'} me-1"></i>
                     ${user.status === 'suspended' ? 'Suspended' : (user.verified ? 'Verified' : 'Pending')}
                </span>
            </div>
        </div>

        <div style="padding: 2rem;">
            <!-- Verification Card -->
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-shield-alt"></i>
                    <h4 class="user-detail-card-title">Verification Status</h4>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <span class="user-detail-label">Status</span>
                        <span class="user-detail-value">
                            ${user.verified ?
            '<span class="text-success"><i class="fas fa-check-circle"></i> Verified</span>' :
            '<span class="text-warning"><i class="fas fa-clock"></i> Pending Verification</span>'
        }
                        </span>
                    </div>
                </div>
            </div>

            <!-- Account Details Card -->
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-info-circle"></i>
                    <h4 class="user-detail-card-title">Account Information</h4>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <span class="user-detail-label">Date Created</span>
                        <span class="user-detail-value">${createdDate}</span>
                    </div>
                    <div class="user-detail-item">
                        <span class="user-detail-label">Last Login</span>
                        <span class="user-detail-value">${lastLogin}</span>
                    </div>
                    <div class="user-detail-item">
                        <span class="user-detail-label">Last Updated</span>
                        <span class="user-detail-value">${updatedDate}</span>
                    </div>
                </div>
            </div>

            <!-- Suspension Details (Only if applicable) -->
            ${user.status === 'suspended' || user.suspensionReason ? `
            <div class="user-detail-card" style="border-color: #fca5a5;">
                <div class="user-detail-card-header" style="border-color: #fca5a5;">
                    <i class="fas fa-exclamation-triangle text-danger"></i>
                    <h4 class="user-detail-card-title text-danger">Suspension History</h4>
                </div>
                <div class="user-detail-grid">
                    ${user.status === 'suspended' && suspendedDate ? `
                    <div class="user-detail-item">
                        <span class="user-detail-label">Suspended On</span>
                        <span class="user-detail-value text-danger">${suspendedDate}</span>
                    </div>` : ''}
                    
                    ${unsuspendedDate ? `
                    <div class="user-detail-item">
                        <span class="user-detail-label">Unsuspended On</span>
                        <span class="user-detail-value text-success">${unsuspendedDate}</span>
                    </div>` : ''}

                    <div class="user-detail-item" style="grid-column: 1 / -1;">
                        <span class="user-detail-label">Reason</span>
                        <div class="p-3 bg-light rounded mt-1 border">
                            ${escapeHtml(user.suspensionReason || 'No reason provided')}
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Business Details (Only for Business Users) -->
            ${user.accountType === 'business' ? `
            <div class="user-detail-card">
                <div class="user-detail-card-header">
                    <i class="fas fa-briefcase"></i>
                    <h4 class="user-detail-card-title">Business Profile</h4>
                </div>
                <div class="user-detail-grid">
                    <div class="user-detail-item">
                        <span class="user-detail-label">Business Name</span>
                        <span class="user-detail-value">${escapeHtml(user.businessName || 'N/A')}</span>
                    </div>
                    <div class="user-detail-item">
                        <span class="user-detail-label">Contact Person</span>
                        <span class="user-detail-value">${escapeHtml(user.contactPerson || 'N/A')}</span>
                    </div>
                     <div class="user-detail-item">
                        <span class="user-detail-label">Phone</span>
                        <span class="user-detail-value">${escapeHtml(user.phone || 'N/A')}</span>
                    </div>
                     <div class="user-detail-item">
                        <span class="user-detail-label">Website</span>
                        <span class="user-detail-value">
                            ${user.website ? `<a href="${escapeHtml(user.website)}" target="_blank" class="text-primary text-decoration-none hover:underline">${escapeHtml(user.website)} <i class="fas fa-external-link-alt small ms-1"></i></a>` : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Raw JSON Data (Collapsible) -->
            <div class="mt-4">
                 <button class="btn btn-sm btn-outline-secondary w-100" type="button" data-bs-toggle="collapse" data-bs-target="#rawJsonCollapse">
                    <i class="fas fa-code me-2"></i> View Raw Data
                 </button>
                 <div class="collapse mt-2" id="rawJsonCollapse">
                    <div class="card card-body bg-light">
                        <pre class="mb-0" style="font-size: 0.75rem; max-height: 200px; overflow-y: auto;">${JSON.stringify(user, null, 2)}</pre>
                    </div>
                 </div>
            </div>

        </div>
    `;

    content.innerHTML = detailsHTML;
    modal.show();
}

// Initialize Custom Dropdown for Suspend Modal
function initializeSuspendDropdown() {
    const wrapper = document.getElementById('suspendReasonDropdown');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const hiddenInput = wrapper.querySelector('input[type="hidden"]');
    const triggerSpan = trigger.querySelector('span');
    const optionElements = wrapper.querySelectorAll('.custom-option');

    // Toggle
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        wrapper.classList.toggle('open');
    });

    // Select Option
    optionElements.forEach(option => {
        option.addEventListener('click', function (e) {
            e.stopPropagation();
            const value = this.getAttribute('data-value');
            const text = this.textContent.trim();
            const icon = this.querySelector('i').cloneNode(true);

            hiddenInput.value = value;

            triggerSpan.innerHTML = '';
            triggerSpan.appendChild(icon);
            triggerSpan.appendChild(document.createTextNode(' ' + text));
            triggerSpan.classList.remove('text-muted');
            triggerSpan.classList.add('text-dark', 'fw-medium');

            optionElements.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');

            wrapper.classList.remove('open');
        });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });
}

// Suspend User Modal
function showSuspendModal(email) {
    const displayEl = document.getElementById('suspendUserEmail');
    if (displayEl) displayEl.textContent = email;

    const hiddenInput = document.getElementById('suspendUserEmailHidden');
    if (hiddenInput) hiddenInput.value = email;

    // Reset Form
    const reasonInput = document.getElementById('suspensionReason');
    const detailsInput = document.getElementById('suspensionDetails');
    const dropdownTriggerSpan = document.querySelector('#suspendReasonDropdown .custom-select-trigger span');
    const dropdownOptions = document.querySelectorAll('#suspendReasonDropdown .custom-option');

    if (reasonInput) reasonInput.value = '';
    if (detailsInput) detailsInput.value = '';

    // Reset visual dropdown
    if (dropdownTriggerSpan) {
        dropdownTriggerSpan.textContent = 'Select a reason...';
        dropdownTriggerSpan.classList.add('text-muted');
        dropdownTriggerSpan.classList.remove('text-dark', 'fw-medium');
    }
    dropdownOptions.forEach(opt => opt.classList.remove('selected'));

    const modal = new bootstrap.Modal(document.getElementById('suspendUserModal'));
    modal.show();
}

// Suspend user
async function confirmSuspendUser() {
    const email = document.getElementById('suspendUserEmailHidden').value;
    const reason = document.getElementById('suspensionReason').value;
    const details = document.getElementById('suspensionDetails').value;

    if (!reason.trim()) {
        alert('Please select a reason for suspension');
        return;
    }

    const fullReason = details ? `${reason} - ${details}` : reason;

    try {
        const btn = document.getElementById('confirmSuspendBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suspending...';
            btn.disabled = true;
        }

        const response = await fetch(`${MANAGE_USER_API}/${encodeURIComponent(email)}/suspend`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: fullReason }),
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showAlert('User suspended successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('suspendUserModal')).hide();
            loadUsers(); // Reload list
        } else {
            throw new Error(data.message || 'Failed to suspend user');
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        showAlert(error.message || 'Failed to suspend user', 'danger');
    } finally {
        const btn = document.getElementById('confirmSuspendBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-ban me-2"></i> Suspend Account';
            btn.disabled = false;
        }
    }
}

// Unsuspend user
async function unsuspendUser(email) {
    if (!confirm('Are you sure you want to unsuspend this user?')) return;

    try {
        showLoading();
        const response = await fetch(`${MANAGE_USER_API}/${encodeURIComponent(email)}/unsuspend`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showAlert('User unsuspended successfully', 'success');
            loadUsers(); // Reload list
        } else {
            throw new Error(data.message || 'Failed to unsuspend user');
        }
    } catch (error) {
        console.error('Error unsuspending user:', error);
        showAlert(error.message || 'Failed to unsuspend user', 'danger');
        hideLoading();
    }
}

// Show Delete Modal
function deleteUser(email) {
    const displayEl = document.getElementById('deleteUserEmailDisplay');
    if (displayEl) displayEl.textContent = email;

    const hiddenInput = document.getElementById('deleteUserEmailHidden');
    if (hiddenInput) hiddenInput.value = email;

    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

// Confirm Delete User
async function confirmDeleteUser() {
    const email = document.getElementById('deleteUserEmailHidden').value;

    try {
        // Show loading on button
        const modalEl = document.getElementById('deleteUserModal');
        const btn = modalEl.querySelector('.btn-danger');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        btn.disabled = true;

        showLoading();

        const response = await fetch(`${MANAGE_USER_API}/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();

        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (data.success) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            throw new Error(data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert(error.message || 'Failed to delete user', 'danger');
        hideLoading();

        const modalEl = document.getElementById('deleteUserModal');
        if (modalEl) {
            const btn = modalEl.querySelector('.btn-danger');
            if (btn) {
                btn.innerHTML = 'Delete';
                btn.disabled = false;
            }
        }
    }
}

// Helper functions (Utilities)
function escapeHtml(text) {
    if (!text) return '';
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function getStatusBadge(user) {
    if (user.status === 'suspended') {
        return '<span class="badge bg-danger"><i class="fas fa-ban me-1"></i> Suspended</span>';
    } else if (user.verified) {
        return '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i> Verified</span>';
    } else {
        return '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i> Pending</span>';
    }
}

function getAccountTypeBadge(user) {
    const type = user.accountType;
    switch (type) {
        case 'admin':
            const roleName = user.role
                ? user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : 'Admin';
            return `<span class="badge bg-danger"><i class="fas fa-shield-alt me-1"></i> ${roleName}</span>`;
        case 'business':
            return '<span class="badge bg-info text-dark"><i class="fas fa-briefcase me-1"></i> Business</span>';
        default:
            return '<span class="badge bg-primary"><i class="fas fa-user me-1"></i> Regular</span>';
    }
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

// Initialization Wrappers
// Helper to setup custom dropdowns
function setupCustomDropdown(dropdownId, options, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const btn = dropdown.querySelector('.custom-dropdown-btn');
    const menu = dropdown.querySelector('.custom-dropdown-menu');
    const itemsContainer = dropdown.querySelector('.custom-dropdown-items');
    const hiddenInput = dropdown.querySelector('input[type="hidden"]');
    const btnText = dropdown.querySelector('span');

    // Populate items
    if (itemsContainer && options.length > 0) {
        itemsContainer.innerHTML = options.map(opt => `
            <div class="dropdown-item" data-value="${opt.value}">
                ${opt.icon ? `<i class="fas ${opt.icon}"></i>` : ''} ${opt.label}
            </div>
        `).join('');
    }

    // Toggle menu
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = menu.style.display === 'block';
        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.style.display = 'none');
        menu.style.display = isVisible ? 'none' : 'block';
    });

    // Handle selection
    if (itemsContainer) {
        itemsContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                const value = item.dataset.value;

                hiddenInput.value = value;
                btnText.innerHTML = item.innerHTML; // Keep icon

                menu.style.display = 'none';
                if (onSelect) onSelect(value);
            }
        });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
}

function initializeAccountTypeSelector() {
    setupCustomDropdown('accountTypeSelectorDropdown', [
        { value: 'users', label: 'All Users', icon: 'fa-users' },
        { value: 'admins', label: 'Admin Accounts', icon: 'fa-user-shield' },
        { value: 'regular', label: 'Regular Accounts', icon: 'fa-user' },
        { value: 'business', label: 'Business Accounts', icon: 'fa-briefcase' }
    ], (value) => {
        currentTab = value;

        // Hide all tab panes
        document.querySelectorAll('.tab-pane').forEach(el => {
            el.classList.remove('show', 'active');
            el.style.display = 'none';
        });

        // Show selected tab pane
        const selectedTab = document.getElementById(value);
        if (selectedTab) {
            selectedTab.classList.add('show', 'active');
            selectedTab.style.display = 'block';
        }

        applyFilters();
    });
}

function initializeAccountTypeDropdown() {
    setupCustomDropdown('accountTypeDropdown', [
        { value: 'all', label: 'All Account Types' },
        { value: 'admin', label: 'Admin' },
        { value: 'business', label: 'Business' },
        { value: 'regular', label: 'Regular' }
    ], (value) => {
        document.getElementById('accountTypeSelect').value = value;
        currentPage = 1;
        applyFilters();
    });
}

function initializeStatusDropdown() {
    setupCustomDropdown('statusDropdown', [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'pending', label: 'Pending' }
    ], (value) => {
        document.getElementById('statusSelect').value = value;
        currentPage = 1;
        applyFilters();
    });
}

function initializeAdminStatusDropdown() {
    const adminStatusSelect = document.getElementById('adminStatusSelect');
    if (adminStatusSelect) {
        adminStatusSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }
}

function initializeRegularStatusDropdown() {
    const regularStatusSelect = document.getElementById('regularStatusSelect');
    if (regularStatusSelect) {
        regularStatusSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }
}

function initializeBusinessStatusDropdown() {
    const businessStatusSelect = document.getElementById('businessStatusSelect');
    if (businessStatusSelect) {
        businessStatusSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }
}

function showLoading() {
    // Implement loading spinner show logic here if needed (e.g. overtable)
    // Often handled by UI but good to have hook
}

function hideLoading() {
    // Implement loading spinner hide logic
}

function showAlert(message, type = 'info') {
    // Simple alert implementation or toast
    // Falling back to standard alert if no UI container
    const alertPlaceholder = document.getElementById('alertPlaceholder');
    if (alertPlaceholder) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible" role="alert">`,
            `   <div>${escapeHtml(message)}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join('');
        alertPlaceholder.append(wrapper);

        // Auto dismiss after 5s
        setTimeout(() => {
            wrapper.remove();
        }, 5000);
    } else {
        alert(message);
    }
}

// Global scope exposure
window.showSuspendModal = showSuspendModal;
window.confirmSuspendUser = confirmSuspendUser;
window.unsuspendUser = unsuspendUser;
window.deleteUser = deleteUser;
window.showUserDetailsModal = showUserDetailsModal;
window.changePage = changePage;
window.loadUsers = loadUsers;
