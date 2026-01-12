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
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-3">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light text-secondary text-uppercase small">
                        <tr>
                            <th class="ps-4">User</th>
                            <th>Account Type</th>
                            <th>Status</th>
                            <th>Dates</th>
                            <th>Reason/Notes</th>
                            <th class="text-end pe-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="border-top-0">
    `;

    pageUsers.forEach(user => {
        const statusBadge = getStatusBadge(user);
        const accountTypeBadge = getAccountTypeBadge(user);
        const createdDate = formatDate(user.createdAt);
        const lastLogin = user.lastLogin ? formatDate(user.lastLogin) : 'Never';
        const initials = getInitials(user.displayName || user.email);

        // Design 1: Avatar Colors
        const avatarClass = user.accountType === 'business' ? 'bg-info-subtle text-info-emphasis' : 'bg-primary-subtle text-primary-emphasis';

        // Design 1: Suspension Reason Style
        let suspensionReason = '<span class="text-muted small">-</span>';
        if (user.suspensionReason) {
            const reasonText = escapeHtml(user.suspensionReason);
            const displayText = reasonText.length > 25 ? reasonText.substring(0, 25) + '...' : reasonText;
            suspensionReason = `<span class="small text-danger" title="${reasonText}"><i class="fas fa-exclamation-circle me-1"></i> ${displayText}</span>`;
        }

        html += `
            <tr style="cursor: pointer;" onclick="showUserDetailsModal('${escapeHtml(user.email)}', '${escapeHtml(user.accountType)}')">
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="avatar-circle ${avatarClass} me-3">${initials}</div>
                        <div>
                            <div class="fw-bold text-dark">${escapeHtml(user.displayName || user.email)}</div>
                            <div class="text-muted small" style="font-size: 0.8rem;">${escapeHtml(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td>${accountTypeBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="small fw-bold">Last: ${lastLogin}</div>
                    <div class="text-muted small" style="font-size: 0.75rem;">Created: ${createdDate}</div>
                </td>
                <td>${suspensionReason}</td>
                <td class="text-end pe-4">
                    <div class="action-buttons d-flex justify-content-end gap-1">
                        <button class="btn btn-sm btn-light border text-secondary" onclick="event.stopPropagation(); showUserDetailsModal('${escapeHtml(user.email)}', '${escapeHtml(user.accountType)}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${user.accountType !== 'admin' && currentUserRole !== 'viewer' ? (
                user.status !== 'suspended' ?
                    `<button class="btn btn-sm btn-light border text-warning" onclick="event.stopPropagation(); showSuspendModal('${escapeHtml(user.email)}', '${escapeHtml(user.displayName || user.email)}')\" title="Suspend">
                                    <i class="fas fa-ban"></i>
                                </button>` :
                    `<button class="btn btn-sm btn-light border text-success" onclick="event.stopPropagation(); unsuspendUser('${escapeHtml(user.email)}')\" title="Unsuspend">
                                    <i class="fas fa-check"></i>
                                </button>`
            ) : ''}
                        ${user.accountType !== 'admin' && currentUserRole === 'super_admin' ?
                `<button class="btn btn-sm btn-light border text-danger" onclick="event.stopPropagation(); deleteUser('${escapeHtml(user.email)}')\" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>` :
                (user.accountType !== 'admin' ? '' : '<span class="text-muted small ms-2">Protected</span>')
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
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2563eb'
                }, {
                    label: 'New Users This Month',
                    data: monthlyCounts,
                    backgroundColor: 'transparent',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true, // Show legend for Design 1
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5] },
                        ticks: {
                            stepSize: Math.ceil(Math.max(...cumulativeData) / 10) || 1
                        }
                    },
                    x: {
                        grid: { display: false }
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
    const modalId = 'viewUserDetailsModal';
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;

    const modal = new bootstrap.Modal(modalEl);

    // We target the modal-body to inject our custom design. 
    // Ideally we'd replace the whole modal content but Bootstrap expects .modal-content.
    // We will clear existing styles/content via JS injection.
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
        content.innerHTML = `<div class="alert alert-danger m-4">
            <strong>User not found</strong><br>
            Email: ${escapeHtml(email)}<br>
            Looking for account type: ${targetAccountType || 'any'}<br>
            Current tab: ${currentTab}
        </div>`;
        modal.show();
        return;
    }

    // Prepare Data for Design 2
    const createdDate = formatDate(user.createdAt) || 'N/A';
    const lastLogin = user.lastLogin ? formatDate(user.lastLogin) : 'Never';
    const updatedDate = user.updatedAt ? formatDate(user.updatedAt) : 'N/A';
    const initials = getInitials(user.displayName || user.email);

    // Badges Generation
    let badgeHtml = '';
    // Admin/Role Badge
    if (user.accountType === 'admin') {
        badgeHtml += `<span class="ud-badge ud-badge-admin"><i class="fas fa-shield-alt"></i> ${escapeHtml(user.role || 'Admin')}</span> `;
    } else if (user.accountType === 'business') {
        badgeHtml += `<span class="ud-badge" style="background:#e0e7ff; color:#4338ca;"><i class="fas fa-briefcase"></i> Business</span> `;
    } else {
        badgeHtml += `<span class="ud-badge" style="background:#f1f5f9; color:#475569;"><i class="fas fa-user"></i> Regular</span> `;
    }

    // Status Badge
    let verificationStatusHtml = '';
    if (user.status === 'suspended') {
        badgeHtml += `<span class="ud-badge ud-badge-suspended"><i class="fas fa-ban"></i> Suspended</span>`;
        verificationStatusHtml = `<span style="color: #ef4444; font-weight:600;"><i class="fas fa-ban"></i> Account Suspended</span>`;
    } else if (user.verified) {
        badgeHtml += `<span class="ud-badge ud-badge-verified"><i class="fas fa-check-circle"></i> Verified</span>`;
        verificationStatusHtml = `<span style="color: #10b981; font-weight:600;"><i class="fas fa-check-circle"></i> Verified Account</span>`;
    } else {
        badgeHtml += `<span class="ud-badge ud-badge-pending"><i class="fas fa-clock"></i> Pending</span>`;
        verificationStatusHtml = `<span style="color: #d97706; font-weight:600;"><i class="fas fa-clock"></i> Pending Verification</span>`;
    }

    // Build HTML (Design 2 Structure)
    // Note: We are injecting into .modal-body. The Bootstrap modal wrapper surrounds this.
    // To make it look like the full separate card design, we might need a wrapper.
    let detailsHTML = `
        <div style="background: #f8fafc; padding: 20px;">
            <!-- Profile Card -->
            <div class="ud-profile-card">
                <div class="ud-avatar-circle">${initials}</div>
                <div class="ud-profile-info">
                    <h2>${escapeHtml(user.displayName || 'User')}</h2>
                    <div class="ud-profile-email">${escapeHtml(user.email)}</div>
                    <div class="ud-badges">
                        ${badgeHtml}
                    </div>
                </div>
            </div>

            <!-- Verification Status Card -->
            <div class="ud-info-card acc-success">
                <div class="ud-section-header">
                    <i class="fas fa-shield-check"></i> Verification Status
                </div>
                <div class="ud-data-item">
                    <label>Current Status</label>
                    <div style="font-size: 0.95rem;">
                        ${verificationStatusHtml}
                    </div>
                </div>
            </div>

            <!-- Account Information Card -->
            <div class="ud-info-card acc-info">
                <div class="ud-section-header">
                    <i class="fas fa-info-circle"></i> Account Information
                </div>
                <div class="ud-data-grid">
                    <div class="ud-data-item">
                        <label>Date Created</label>
                        <span>${createdDate}</span>
                    </div>
                    <div class="ud-data-item">
                        <label>Last Login</label>
                        <span>${lastLogin}</span>
                    </div>
                    <div class="ud-data-item">
                        <label>Last Updated</label>
                         <span>${updatedDate}</span>
                    </div>
                </div>
            </div>

            ${user.accountType === 'business' ? `
            <!-- Business Info Card -->
            <div class="ud-info-card" style="border-left: 4px solid #8b5cf6;">
                 <div class="ud-section-header" style="color: #8b5cf6;">
                    <i class="fas fa-building"></i> Business Profile
                </div>
                <div class="ud-data-grid">
                    <div class="ud-data-item"><label>Company</label><span>${escapeHtml(user.businessName || '-')}</span></div>
                    <div class="ud-data-item"><label>Contact</label><span>${escapeHtml(user.contactPerson || '-')}</span></div>
                    <div class="ud-data-item"><label>Phone</label><span>${escapeHtml(user.phone || '-')}</span></div>
                </div>
            </div>
            ` : ''}

            <!-- Footer / Raw Data -->
            <div class="text-end mt-3">
                 <button class="btn-ud btn-ud-ghost" type="button" data-bs-toggle="collapse" data-bs-target="#rawJsonCollapse">
                    <i class="fas fa-code me-2"></i> View Raw Data
                 </button>
            </div>
            <div class="collapse mt-3" id="rawJsonCollapse">
                <div class="card card-body bg-white border small">
                    <pre class="mb-0" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(user, null, 2)}</pre>
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
    const confirmed = await showConfirmModal({
        title: 'Unsuspend User?',
        message: `Are you sure you want to restore access for <strong>${escapeHtml(email)}</strong>?`,
        iconClass: 'fa-check-circle',
        iconColorClass: 'text-success',
        confirmText: 'Yes, Unsuspend',
        confirmColorClass: 'bg-success'
    });

    if (!confirmed) return;

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

    if (type === 'admin') {
        const role = user.role || 'admin';
        const roleName = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const r = role.toLowerCase();

        let badgeClass = 'bg-danger'; // Default for admin/super admin

        if (r.includes('manager')) badgeClass = 'bg-warning text-dark';
        else if (r.includes('editor')) badgeClass = 'bg-primary';
        else if (r.includes('moderator')) badgeClass = 'bg-purple';
        else if (r.includes('analyst')) badgeClass = 'bg-info text-dark';
        else if (r.includes('support')) badgeClass = 'bg-success';
        else if (r.includes('viewer')) badgeClass = 'bg-secondary';

        return `<span class="badge ${badgeClass}"><i class="fas fa-shield-alt me-1"></i> ${roleName}</span>`;
    } else if (type === 'business') {
        // Business: Indigo
        return '<span class="badge bg-indigo"><i class="fas fa-briefcase me-1"></i> Business</span>';
    } else {
        // Regular: Dark Green
        return '<span class="badge bg-dark-green"><i class="fas fa-user me-1"></i> Regular</span>';
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
    const container = document.getElementById('toast-container');
    if (!container) {
        // Fallback for pages without toast container
        const alertPlaceholder = document.getElementById('alertPlaceholder');
        if (alertPlaceholder) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert"><div>${escapeHtml(message)}</div><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
            alertPlaceholder.append(wrapper);
            setTimeout(() => wrapper.remove(), 5000);
        } else {
            alert(message);
        }
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    // Icon mapping
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check';
    if (type === 'danger' || type === 'error') iconClass = 'fa-exclamation-triangle';
    if (type === 'warning') iconClass = 'fa-exclamation';

    // Type normalization for CSS classes
    let typeClass = 'info'; // Default blue
    if (type === 'success') typeClass = 'success';
    if (type === 'danger' || type === 'error') typeClass = 'error';

    toast.innerHTML = `
        <div class="toast-d6 ${typeClass}">
            <div class="toast-d6-icon-circle"><i class="fas ${iconClass}"></i></div>
            <div class="toast-d6-text">${escapeHtml(message)}</div>
        </div>
    `;

    // Remove on click
    toast.onclick = () => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    };

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => toast.remove());
        }
    }, 4000);
}

// Global scope exposure
window.showSuspendModal = showSuspendModal;
window.confirmSuspendUser = confirmSuspendUser;
window.unsuspendUser = unsuspendUser;
window.deleteUser = deleteUser;
window.showUserDetailsModal = showUserDetailsModal;
window.changePage = changePage;
window.loadUsers = loadUsers;

// Helper for Custom Confirmation Modal (Design 1)
// Helper for Custom Confirmation Modal (Uses new UD classes)
function showConfirmModal({ title, message, iconClass, iconColorClass, confirmText, confirmColorClass }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('customConfirmTitle');
        const msgEl = document.getElementById('customConfirmMessage');
        const iconEl = document.getElementById('customConfirmIcon');
        const cancelBtn = document.getElementById('customConfirmCancel');
        const confirmBtn = document.getElementById('customConfirmOk');

        if (!modal) {
            return resolve(window.confirm(message || 'Are you sure?'));
        }

        titleEl.textContent = title || 'Confirm Action';
        msgEl.innerHTML = message || 'Are you sure you want to proceed?';

        // Icon
        iconEl.className = `fas fa-3x ${iconClass || 'fa-info-circle'} ${iconColorClass || 'text-primary'}`;

        // Reset and set button style
        // Using new .btn-ud-primary instead of .btn-d1-confirm
        confirmBtn.className = 'btn-ud btn-ud-primary';
        if (confirmColorClass === 'bg-danger') confirmBtn.style.backgroundColor = '#ef4444';
        else if (confirmColorClass === 'bg-success') confirmBtn.style.backgroundColor = '#10b981';
        else confirmBtn.style.backgroundColor = '';

        confirmBtn.textContent = confirmText || 'Confirm';

        // Cancel button
        cancelBtn.className = 'btn-ud btn-ud-ghost';

        const close = (result) => {
            modal.classList.remove('active');
            resolve(result);
        };

        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);
        modal.onclick = (e) => {
            if (e.target === modal) close(false);
        };

        modal.classList.add('active');
    });
}
window.showConfirmModal = showConfirmModal;
