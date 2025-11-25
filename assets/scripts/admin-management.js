// Configuration
let API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://acc.comparehubprices.site';
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

// Chart instances
let accountTypeChart = null;
let userGrowthChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupSidebar();
    loadUsers();
    checkLoginState();
    
    // Handle tab changes
    const tabButtons = document.querySelectorAll('#managementTabs button[data-bs-toggle="tab"]');
    tabButtons.forEach(btn => {
        btn.addEventListener('shown.bs.tab', (e) => {
            const tabId = e.target.getAttribute('data-bs-target');
            if (tabId === '#users-tab') currentTab = 'users';
            else if (tabId === '#admins-tab') currentTab = 'admins';
            else if (tabId === '#regular-tab') currentTab = 'regular';
            else if (tabId === '#business-tab') currentTab = 'business';
            applyFilters();
        });
    });
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

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('accountTypeFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    
    document.getElementById('adminSearchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('adminStatusFilter').addEventListener('change', applyFilters);
    
    document.getElementById('regularSearchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('regularStatusFilter').addEventListener('change', applyFilters);
    
    document.getElementById('businessSearchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('businessStatusFilter').addEventListener('change', applyFilters);
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
        accountTypeFilter = document.getElementById('accountTypeFilter').value;
        statusFilter = document.getElementById('statusFilter').value;
    } else if (currentTab === 'admins') {
        searchTerm = document.getElementById('adminSearchInput').value.toLowerCase();
        accountTypeFilter = 'admin';
        statusFilter = document.getElementById('adminStatusFilter').value;
    } else if (currentTab === 'regular') {
        searchTerm = document.getElementById('regularSearchInput').value.toLowerCase();
        accountTypeFilter = 'regular';
        statusFilter = document.getElementById('regularStatusFilter').value;
    } else if (currentTab === 'business') {
        searchTerm = document.getElementById('businessSearchInput').value.toLowerCase();
        accountTypeFilter = 'business';
        statusFilter = document.getElementById('businessStatusFilter').value;
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
                        ${user.accountType !== 'admin' ? (
                            user.status !== 'suspended' ? 
                                `<button class="btn btn-warning btn-sm" onclick="event.stopPropagation(); showSuspendModal('${escapeHtml(user.email)}', '${escapeHtml(user.displayName || user.email)}')" title="Suspend">
                                    <i class="fas fa-ban"></i>
                                </button>` :
                                `<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); unsuspendUser('${escapeHtml(user.email)}')" title="Unsuspend">
                                    <i class="fas fa-check"></i>
                                </button>`
                        ) : ''}
                        ${user.accountType !== 'admin' ? 
                            `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteUser('${escapeHtml(user.email)}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>` : 
                            '<span class="text-muted small">Protected</span>'
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
                        '#2563eb',
                        '#0ea5e9',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
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
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem;">
                    <span style="font-weight: 500; color: var(--dark);">Verified</span>
                    <span style="color: var(--text);">${verifiedCount} (${verifiedPercent}%)</span>
                </div>
                <div class="progress" style="height: 25px; border-radius: 10px;">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${verifiedPercent}%; border-radius: 10px;" aria-valuenow="${verifiedPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem;">
                    <span style="font-weight: 500; color: var(--dark);">Pending</span>
                    <span style="color: var(--text);">${pendingCount} (${pendingPercent}%)</span>
                </div>
                <div class="progress" style="height: 25px; border-radius: 10px;">
                    <div class="progress-bar bg-warning" role="progressbar" style="width: ${pendingPercent}%; border-radius: 10px;" aria-valuenow="${pendingPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem;">
                    <span style="font-weight: 500; color: var(--dark);">Suspended</span>
                    <span style="color: var(--text);">${suspendedCount} (${suspendedPercent}%)</span>
                </div>
                <div class="progress" style="height: 25px; border-radius: 10px;">
                    <div class="progress-bar bg-danger" role="progressbar" style="width: ${suspendedPercent}%; border-radius: 10px;" aria-valuenow="${suspendedPercent}" aria-valuemin="0" aria-valuemax="100"></div>
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
                maintainAspectRatio: true,
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
    
    // Build user details HTML
    let detailsHTML = `
        <div class="row mb-4">
            <div class="col-12 text-center">
                <div class="user-avatar mx-auto mb-3" style="width: 80px; height: 80px; font-size: 2rem;">
                    ${getInitials(user.displayName || user.email)}
                </div>
                <h4>${escapeHtml(user.displayName || user.email)}</h4>
                <p class="text-muted mb-0">${escapeHtml(user.email)}</p>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <strong><i class="fas fa-user-tag"></i> Account Type:</strong>
                <div class="mt-1">${getAccountTypeBadge(user.accountType)}</div>
            </div>
            <div class="col-md-6 mb-3">
                <strong><i class="fas fa-info-circle"></i> Status:</strong>
                <div class="mt-1">${getStatusBadge(user)}</div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <strong><i class="fas fa-check-circle"></i> Email Verified:</strong>
                <div class="mt-1">
                    ${user.verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Not Verified</span>'}
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <strong><i class="fas fa-calendar"></i> Account Created:</strong>
                <div class="mt-1">${createdDate}</div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <strong><i class="fas fa-sign-in-alt"></i> Last Login:</strong>
                <div class="mt-1">${lastLogin}</div>
            </div>
            <div class="col-md-6 mb-3">
                <strong><i class="fas fa-edit"></i> Last Updated:</strong>
                <div class="mt-1">${updatedDate}</div>
            </div>
        </div>
    `;
    
    // Add user ID if available
    if (user.userId) {
        detailsHTML += `
            <div class="row">
                <div class="col-12 mb-3">
                    <strong><i class="fas fa-id-card"></i> User ID:</strong>
                    <div class="mt-1"><code>${escapeHtml(user.userId)}</code></div>
                </div>
            </div>
        `;
    }
    
    // Add name fields if available
    if (user.givenName || user.familyName) {
        detailsHTML += `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-user"></i> First Name:</strong>
                    <div class="mt-1">${escapeHtml(user.givenName || 'N/A')}</div>
                </div>
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-user"></i> Last Name:</strong>
                    <div class="mt-1">${escapeHtml(user.familyName || 'N/A')}</div>
                </div>
            </div>
        `;
    }
    
    // Add business-specific fields
    if (user.accountType === 'business' && user.businessName) {
        detailsHTML += `
            <hr>
            <h6 class="mb-3"><i class="fas fa-building"></i> Business Information</h6>
            <div class="row">
                <div class="col-md-6 mb-3">
                    <strong>Business Name:</strong>
                    <div class="mt-1">${escapeHtml(user.businessName || 'N/A')}</div>
                </div>
                ${user.businessNumber ? `
                <div class="col-md-6 mb-3">
                    <strong>Business Phone:</strong>
                    <div class="mt-1">${escapeHtml(user.businessNumber)}</div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    // Add suspension history
    if (user.suspensionReason || user.status === 'suspended' || suspendedDate) {
        detailsHTML += `
            <hr>
            <h6 class="mb-3"><i class="fas fa-ban"></i> Suspension History</h6>
            <div class="row">
                ${user.suspensionReason ? `
                <div class="col-12 mb-3">
                    <strong>Suspension Reason:</strong>
                    <div class="mt-1 alert alert-warning">${escapeHtml(user.suspensionReason)}</div>
                </div>
                ` : ''}
                ${suspendedDate ? `
                <div class="col-md-6 mb-3">
                    <strong>Suspended At:</strong>
                    <div class="mt-1">${suspendedDate}</div>
                </div>
                ` : ''}
                ${unsuspendedDate ? `
                <div class="col-md-6 mb-3">
                    <strong>Unsuspended At:</strong>
                    <div class="mt-1">${unsuspendedDate}</div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    // Add additional metadata if available
    const metadataFields = ['city', 'province', 'phoneNumber', 'address', 'postalCode'];
    const hasMetadata = metadataFields.some(field => user[field]);
    
    if (hasMetadata) {
        detailsHTML += `
            <hr>
            <h6 class="mb-3"><i class="fas fa-map-marker-alt"></i> Additional Information</h6>
            <div class="row">
        `;
        
        if (user.city || user.province) {
            detailsHTML += `
                <div class="col-md-6 mb-3">
                    <strong>Location:</strong>
                    <div class="mt-1">${escapeHtml([user.city, user.province].filter(Boolean).join(', ') || 'N/A')}</div>
                </div>
            `;
        }
        
        if (user.phoneNumber) {
            detailsHTML += `
                <div class="col-md-6 mb-3">
                    <strong>Phone Number:</strong>
                    <div class="mt-1">${escapeHtml(user.phoneNumber)}</div>
                </div>
            `;
        }
        
        detailsHTML += `</div>`;
    }
    
    // Add provider information
    if (user.provider) {
        detailsHTML += `
            <hr>
            <div class="row">
                <div class="col-12 mb-3">
                    <strong><i class="fas fa-key"></i> Authentication Provider:</strong>
                    <div class="mt-1">${escapeHtml(user.provider)}</div>
                </div>
            </div>
        `;
    }
    
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

// Attach logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

