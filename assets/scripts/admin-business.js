
// Toggle navigation section collapse/expand
function toggleNavSection(element) {
    const navSection = element.closest('.nav-section');
    const navItems = navSection.querySelector('.nav-section-items');

    // Toggle collapsed class on title
    element.classList.toggle('collapsed');

    // Toggle collapsed class on items container
    navItems.classList.toggle('collapsed');
}



// Configuration
const API_BASE_URL = localStorage.getItem('comparehubprices_api_url') || 'https://hub.comparehubprices.co.za';
const GET_PENDING_POSTS_API = `${API_BASE_URL}/admin/admin/get-pending-business-posts`; // For GET posts (new Lambda)
const PUBLISH_BUSINESS_API = `${API_BASE_URL}/admin/admin/publish-business`; // For APPROVE (new Lambda)
const REJECT_BUSINESS_API = `${API_BASE_URL}/admin/admin/reject-business-post`; // For REJECT (new Lambda)
const TRACK_STATS_API = `${API_BASE_URL}/admin/admin/track-business-stats`; // For tracking approvals/declines

// State
let allPosts = [];
let filteredPosts = [];
let currentPostId = null;

// Chart instances
let postsOverTimeChart = null;
let postStatusChart = null;
let postTypeChart = null;
let permissionStatusChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (window.adminAWSAuthService) {
        const auth = await window.adminAWSAuthService.getUserInfo();
        if (!auth.success || !window.adminAWSAuthService.hasPermission('canManageBusiness')) {
            window.location.href = 'index.html';
            return;
        }
    }

    setupEventListeners();

    await loadPosts();
    await loadStats();
    initializeCharts();
});

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
        { value: 'pending', text: 'Pending' },
        { value: 'approved', text: 'Approved' },
        { value: 'rejected', text: 'Rejected' }
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

// Initialize custom permission dropdown
function initializePermissionDropdown() {
    const permissionDropdown = document.getElementById('permissionDropdown');
    const permissionDropdownBtn = document.getElementById('permissionDropdownBtn');
    const permissionDropdownMenu = document.getElementById('permissionDropdownMenu');
    const permissionDropdownItems = document.getElementById('permissionDropdownItems');
    const permissionSelect = document.getElementById('permissionSelect');

    if (!permissionDropdown || !permissionDropdownBtn || !permissionDropdownMenu || !permissionDropdownItems) return;

    const permissionOptions = [
        { value: 'all', text: 'All Permissions' },
        { value: 'granted', text: 'Granted' },
        { value: 'pending', text: 'Pending' },
        { value: 'revoked', text: 'Revoked' }
    ];

    permissionOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            permissionDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('permissionDropdownText').textContent = option.text;
            permissionSelect.value = option.value;

            permissionDropdown.classList.remove('active');
            permissionDropdownMenu.style.display = 'none';

            applyFilters();
        });
        permissionDropdownItems.appendChild(itemDiv);
    });

    permissionDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = permissionDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'permissionDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            permissionDropdown.classList.remove('active');
            permissionDropdownMenu.style.display = 'none';
        } else {
            permissionDropdown.classList.add('active');
            permissionDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            permissionDropdown.classList.remove('active');
            permissionDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize custom post type dropdown
function initializePostTypeDropdown() {
    const postTypeDropdown = document.getElementById('postTypeDropdown');
    const postTypeDropdownBtn = document.getElementById('postTypeDropdownBtn');
    const postTypeDropdownMenu = document.getElementById('postTypeDropdownMenu');
    const postTypeDropdownItems = document.getElementById('postTypeDropdownItems');
    const postTypeSelect = document.getElementById('postTypeSelect');

    if (!postTypeDropdown || !postTypeDropdownBtn || !postTypeDropdownMenu || !postTypeDropdownItems) return;

    const postTypeOptions = [
        { value: 'all', text: 'All Types' },
        { value: 'service', text: 'Service' },
        { value: 'product', text: 'Product' },
        { value: 'announcement', text: 'Announcement' }
    ];

    postTypeOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            postTypeDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('postTypeDropdownText').textContent = option.text;
            postTypeSelect.value = option.value;

            postTypeDropdown.classList.remove('active');
            postTypeDropdownMenu.style.display = 'none';

            applyFilters();
        });
        postTypeDropdownItems.appendChild(itemDiv);
    });

    postTypeDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = postTypeDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'postTypeDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            postTypeDropdown.classList.remove('active');
            postTypeDropdownMenu.style.display = 'none';
        } else {
            postTypeDropdown.classList.add('active');
            postTypeDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            postTypeDropdown.classList.remove('active');
            postTypeDropdownMenu.style.display = 'none';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));

    // Initialize custom dropdowns
    initializeStatusDropdown();
    initializePermissionDropdown();
    initializePostTypeDropdown();


}

// Load posts from API
async function loadPosts() {
    try {
        showLoading();

        const response = await fetch(`${GET_PENDING_POSTS_API}?status=pending&limit=1000`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.posts) {
                // Transform API data to match our format
                allPosts = data.posts.map(post => {
                    // Admin can always approve/reject immediately - no wait period checks
                    return {
                        postId: post.postId,
                        businessName: post.businessInfo?.businessName || post.businessName || 'Unknown Business',
                        businessEmail: post.businessEmail || post.businessInfo?.businessEmail || '',
                        title: post.title || post.businessName || 'Untitled Post',
                        type: post.type || 'Service',
                        status: post.status || 'pending',
                        permission: 'granted', // Permission is separate from approval status
                        image: post.images && post.images.length > 0 ? post.images[0].url :
                            (post.serviceGalleries && Object.keys(post.serviceGalleries).length > 0 ?
                                Object.values(post.serviceGalleries)[0]?.images?.[0]?.url :
                                'https://via.placeholder.com/200x150?text=No+Image'),
                        submitted: post.submittedAt ? new Date(post.submittedAt).toLocaleString() : 'Unknown',
                        submittedAt: post.submittedAt,
                        description: post.description || post.businessDescription || '',
                        content: post.description || post.businessDescription || '',
                        images: post.images || [],
                        serviceGalleries: post.serviceGalleries || {},
                        businessInfo: post.businessInfo || {},
                        validation: post.validation || { valid: true, issues: [] },
                        // Include all business fields for comprehensive preview
                        ourServices: post.ourServices || '',
                        businessAddress: post.businessAddress || post.businessInfo?.businessAddress || '',
                        businessNumber: post.businessNumber || post.businessInfo?.businessNumber || '',
                        businessCategory: post.businessCategory || post.businessInfo?.businessType || '',
                        businessHours: post.businessHours || post.businessInfo?.businessHours || '',
                        socialMedia: post.socialMedia || post.businessInfo?.socialMedia || {},
                        moreInformation: post.moreInformation || post.businessInfo?.moreInformation || '',
                        logo: post.logo || post.businessInfo?.logo || post.businessLogoUrl || ''
                    };
                });
                updateStats();
                applyFilters();
                updateCharts();
            } else {
                throw new Error(data.message || 'Invalid response format');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 401) {
                showAlert('Please log in to view business posts', 'warning');
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 2000);
                return;
            }

            throw new Error(errorData.message || `Failed to load posts: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showAlert(`Failed to load posts: ${error.message}`, 'danger');
        allPosts = [];
        updateStats();
        applyFilters();
    } finally {
        hideLoading();
    }
}

// Show loading state
function showLoading() {
    const container = document.getElementById('businessPostsContainer');
    if (container) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading posts...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Hide loading state
function hideLoading() {
    // Loading will be replaced by renderPosts()
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertId = 'alert-' + Date.now();
    // Check if alertContainer exists first, finding it dynamically if needed or using a known ID
    let alertContainer = document.getElementById('alertContainer');

    // Fallback if alertContainer is not found immediately (though it should be in HTML)
    if (!alertContainer) {
        // Create a fallback container or log error
        console.warn('Alert container not found');
        return;
    }

    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    alertContainer.insertAdjacentHTML('beforeend', alertHtml);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusSelect = document.getElementById('statusSelect');
    const permissionSelect = document.getElementById('permissionSelect');
    const postTypeSelect = document.getElementById('postTypeSelect');

    const statusFilter = statusSelect ? statusSelect.value : 'all';
    const permissionFilter = permissionSelect ? permissionSelect.value : 'all';
    const postTypeFilter = postTypeSelect ? postTypeSelect.value : 'all';

    filteredPosts = allPosts.filter(post => {
        const matchesSearch = !searchTerm ||
            post.businessName.toLowerCase().includes(searchTerm) ||
            post.businessEmail.toLowerCase().includes(searchTerm) ||
            post.title.toLowerCase().includes(searchTerm);

        const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
        const matchesPermission = permissionFilter === 'all' || post.permission === permissionFilter;
        const matchesType = postTypeFilter === 'all' || post.type.toLowerCase() === postTypeFilter.toLowerCase();

        return matchesSearch && matchesStatus && matchesPermission && matchesType;
    });

    renderPosts();
    updateStats();
    updateCharts();
}

// Render posts
function renderPosts() {
    const container = document.getElementById('businessPostsContainer');

    if (filteredPosts.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h4>No posts found</h4>
                        <p>No posts match your current filters.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filteredPosts.forEach(post => {
        const statusBadge = getStatusBadge(post.status);
        const permissionBadge = getPermissionBadge(post.permission);
        const typeBadge = getTypeBadge(post.type);
        const timeAgo = getTimeAgo(post.submitted);

        html += `
            <tr>
                <td>
                    <div class="business-name-cell">
                        ${post.logo ? `<img src="${escapeHtml(post.logo)}" alt="${escapeHtml(post.businessName)}" class="business-logo-small" onerror="this.style.display='none'">` : ''}
                        <div class="business-name-info">
                            <strong>${escapeHtml(post.businessName)}</strong><br>
                            <small class="text-muted">${escapeHtml(post.businessEmail)}</small>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(post.title)}</td>
                <td>${typeBadge}</td>
                <td>${statusBadge}</td>
                <td>${permissionBadge}</td>
                <td>
                    <small>${timeAgo}</small><br>
                    <small class="text-muted">${escapeHtml(post.submitted)}</small>
                </td>
                <td>
                    ${getActionButtons(post)}
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-warning">Pending</span>',
        'approved': '<span class="badge badge-success">Approved</span>',
        'rejected': '<span class="badge badge-danger">Rejected</span>'
    };
    return badges[status] || '<span class="badge">Unknown</span>';
}

// Get permission badge
function getPermissionBadge(permission) {
    const badges = {
        'granted': '<span class="badge badge-success permission-badge"><i class="fas fa-check-circle"></i> Granted</span>',
        'pending': '<span class="badge badge-warning permission-badge"><i class="fas fa-clock"></i> Pending</span>',
        'revoked': '<span class="badge badge-danger permission-badge"><i class="fas fa-ban"></i> Revoked</span>'
    };
    return badges[permission] || '<span class="badge">Unknown</span>';
}

// Get type badge
function getTypeBadge(type) {
    const badges = {
        'Service': '<span class="badge badge-info">Service</span>',
        'Product': '<span class="badge badge-primary">Product</span>',
        'Announcement': '<span class="badge badge-warning">Announcement</span>'
    };
    return badges[type] || '<span class="badge">Unknown</span>';
}

// Get action buttons
function getActionButtons(post) {
    let buttons = '';
    const postId = post.postId || post.id;

    // Admin can always approve/reject immediately - no wait period checks
    if (post.status === 'pending') {
        buttons += `
            <button class="btn btn-success btn-sm" onclick="approvePost('${postId}')" title="Approve this post">
                <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-danger btn-sm" onclick="rejectPost('${postId}')" title="Reject this post">
                <i class="fas fa-times"></i> Reject
            </button>
        `;
    } else if (post.status === 'approved') {
        buttons += `
            <span class="badge badge-success">Approved</span>
        `;
    } else if (post.status === 'rejected') {
        buttons += `
            <button class="btn btn-success btn-sm" onclick="approvePost('${postId}')" title="Approve this post">
                <i class="fas fa-check"></i> Approve
            </button>
        `;
    }

    buttons += `
        <button class="btn btn-info btn-sm" onclick="viewPost('${postId}')" title="View post details">
            <i class="fas fa-eye"></i> View
        </button>
    `;

    return `<div class="action-buttons">${buttons}</div>`;
}

// Get time ago
function getTimeAgo(dateString) {
    if (!dateString) return 'Unknown';

    let date;
    if (typeof dateString === 'string' && dateString.includes('T')) {
        date = new Date(dateString);
    } else {
        date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load statistics from tracking API
async function loadStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];

        const url = `${TRACK_STATS_API}?startDate=${startDate}&endDate=${today}`;
        console.log('Loading stats from:', url);

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
                window.statsData = {
                    approved: data.stats.approved || 0,
                    declined: data.stats.declined || 0,
                    byDate: data.stats.byDate || {}
                };
                console.log('Stats loaded successfully:', window.statsData);
                updateStats();
                updateCharts();
            } else {
                console.warn('Stats API returned unsuccessful response:', data);
                window.statsData = { approved: 0, declined: 0, byDate: {} };
                updateStats();
                updateCharts();
            }
        } else {
            console.warn(`Stats API returned status ${response.status}`);
            window.statsData = { approved: 0, declined: 0, byDate: {} };
            updateStats();
            updateCharts();
        }
    } catch (error) {
        console.warn('Stats API not available (Lambda may not be deployed yet):', error.message);
        window.statsData = { approved: 0, declined: 0, byDate: {} };
        updateStats();
        updateCharts();
    }
}

// Update stats
function updateStats() {
    const pending = allPosts.filter(p => p.status === 'pending').length;
    const approved = window.statsData?.approved || 0;
    const rejected = window.statsData?.declined || 0;
    const totalBusinesses = new Set(allPosts.map(p => p.businessEmail)).size;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
    document.getElementById('totalBusinessesCount').textContent = totalBusinesses;
}

// Approve post - Uses new publish-business Lambda
async function approvePost(postId) {
    const post = allPosts.find(p => (p.postId || p.id) === postId);
    if (!post) {
        showAlert('Post not found', 'danger');
        return;
    }

    // Store postId for confirmation
    window.pendingApprovePostId = postId;

    // Show approval confirmation modal
    const businessName = post.title || post.businessName || 'this business';
    document.getElementById('approveBusinessName').textContent = businessName;

    const modal = new bootstrap.Modal(document.getElementById('approveConfirmationModal'));
    modal.show();
}

// Confirm approval from modal
async function confirmApprove() {
    const postId = window.pendingApprovePostId;
    if (!postId) {
        showAlert('Post ID not found', 'danger');
        return;
    }

    const post = allPosts.find(p => (p.postId || p.id) === postId);
    if (!post) {
        showAlert('Post not found', 'danger');
        return;
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('approveConfirmationModal'));
    if (modal) {
        modal.hide();
    }

    // Show loading state
    const approveBtn = event?.target || document.querySelector(`[onclick*="approvePost('${postId}')"]`);
    const originalText = approveBtn?.innerHTML || '';
    if (approveBtn) {
        approveBtn.disabled = true;
        approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    }

    // Disable confirm button
    const confirmBtn = document.getElementById('confirmApproveBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    }

    try {
        // Use new publish-business Lambda - always use forceApprove=true for admin
        const response = await fetch(`${PUBLISH_BUSINESS_API}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                forceApprove: true // Admin can always approve immediately
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert(`Post "${post.title || post.businessName}" has been published successfully!`, 'success');

            // Track approval statistic
            fetch(`${TRACK_STATS_API}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'approved',
                    metadata: {
                        postId: postId,
                        businessName: post.title || post.businessName,
                        businessEmail: post.businessEmail
                    }
                })
            }).then(() => {
                loadStats(); // Reload stats after tracking
            }).catch(err => console.error('Stats tracking failed:', err));

            await loadPosts(); // Reload posts to get updated status
        } else {
            throw new Error(data.message || 'Failed to approve post');
        }
    } catch (error) {
        console.error('Error approving post:', error);
        showAlert(`Failed to approve post: ${error.message}`, 'danger');
    } finally {
        // Restore button state
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = originalText;
        }
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Yes, Approve';
        }
        // Clear pending post ID
        window.pendingApprovePostId = null;
    }
}

// Reject post - Uses new reject-business-post Lambda
async function rejectPost(postId) {
    const post = allPosts.find(p => (p.postId || p.id) === postId);
    if (!post) {
        showAlert('Post not found', 'danger');
        return;
    }

    // Store postId for confirmation
    window.pendingRejectPostId = postId;

    // Show rejection reason modal
    const businessName = post.title || post.businessName || 'this business';
    document.getElementById('rejectBusinessName').textContent = businessName;
    document.getElementById('rejectionReason').value = '';

    const modal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    modal.show();
}

// Confirm rejection with reason from modal
async function confirmReject() {
    const postId = window.pendingRejectPostId;
    if (!postId) {
        showAlert('Post ID not found', 'danger');
        return;
    }

    const post = allPosts.find(p => (p.postId || p.id) === postId);
    if (!post) {
        showAlert('Post not found', 'danger');
        return;
    }

    const reasonTextarea = document.getElementById('rejectionReason');
    const reason = reasonTextarea.value.trim();

    // Validate reason
    if (!reason || reason.length < 5) {
        showAlert('Rejection reason must be at least 5 characters. Please provide a clear explanation for the rejection.', 'warning');
        reasonTextarea.focus();
        return;
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('rejectReasonModal'));
    if (modal) {
        modal.hide();
    }

    // Show loading state
    const rejectBtn = event?.target || document.querySelector(`[onclick*="rejectPost('${postId}')"]`);
    const originalText = rejectBtn?.innerHTML || '';
    if (rejectBtn) {
        rejectBtn.disabled = true;
        rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
    }

    // Disable confirm button
    const confirmBtn = document.getElementById('confirmRejectBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
    }

    try {
        // Use new reject-business-post Lambda
        const response = await fetch(`${REJECT_BUSINESS_API}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postId: postId,
                reason: reason
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert(`Post "${post.title || post.businessName}" has been rejected. Reason: ${reason}`, 'danger');

            // Track decline statistic
            fetch(`${TRACK_STATS_API}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'declined',
                    metadata: {
                        postId: postId,
                        businessName: post.title || post.businessName,
                        businessEmail: post.businessEmail,
                        reason: reason
                    }
                })
            }).then(() => {
                loadStats(); // Reload stats after tracking
            }).catch(err => console.error('Stats tracking failed:', err));

            await loadPosts(); // Reload posts to get updated status
        } else {
            throw new Error(data.message || 'Failed to reject post');
        }
    } catch (error) {
        console.error('Error rejecting post:', error);
        showAlert(`Failed to reject post: ${error.message}`, 'danger');
    } finally {
        // Restore button state
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.innerHTML = originalText;
        }
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-times"></i> Reject Post';
        }
        // Clear pending post ID
        window.pendingRejectPostId = null;
    }
}

// Grant permission (placeholder - can be implemented later if needed)
function grantPermission(postId) {
    showAlert('Permission granting feature coming soon', 'info');
}

// Revoke approval (placeholder - can be implemented later if needed)
function revokeApproval(postId) {
    showAlert('Revoke approval feature coming soon', 'info');
}

// View post
// View post
function viewPost(postId) {
    const post = allPosts.find(p => (p.postId || p.id) === postId);
    if (!post) {
        showAlert('Post not found', 'danger');
        return;
    }

    currentPostId = postId;
    const modalBody = document.getElementById('postModalBody');

    // Update Header Elements
    const modalTitle = document.getElementById('modalBusinessName');
    const modalLogo = document.getElementById('modalBusinessLogo');
    const modalType = document.getElementById('modalBusinessType');

    if (modalTitle) modalTitle.textContent = post.businessName || 'Unknown Business';
    if (modalLogo) {
        modalLogo.src = post.logo || 'https://placehold.co/50';
        modalLogo.onerror = () => { modalLogo.src = 'https://placehold.co/50'; };
    }
    if (modalType) modalType.textContent = (post.type || 'Service');

    // Build service galleries HTML
    let servicesHtml = '';
    if (post.serviceGalleries && Object.keys(post.serviceGalleries).length > 0) {
        Object.keys(post.serviceGalleries).forEach(serviceName => {
            if (serviceName.endsWith('_description')) return;

            const serviceData = post.serviceGalleries[serviceName];
            const serviceImages = Array.isArray(serviceData) ? serviceData : (serviceData?.images || []);
            const serviceDescription = serviceData?.description || (post.serviceGalleries[`${serviceName}_description`] || '');

            servicesHtml += `
                <div class="mb-3">
                    <h6 class="fw-bold mb-1">${escapeHtml(serviceName)}</h6>
                    ${serviceDescription ? `<p class="small text-muted mb-2">${escapeHtml(serviceDescription)}</p>` : ''}
                    ${serviceImages && serviceImages.length > 0 ? `
                        <div class="d-flex gap-2 overflow-auto pb-2">
                            ${serviceImages.map(img => {
                const imgUrl = img.url || img.image || img;
                return imgUrl ? `<img src="${escapeHtml(imgUrl)}" class="rounded" style="height: 60px; width: 60px; object-fit: cover;">` : '';
            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }

    // Build main images HTML
    let imagesHtml = '';
    if (post.images && post.images.length > 0) {
        imagesHtml = '<div class="d-flex gap-2 overflow-auto pb-2">';
        post.images.forEach(img => {
            imagesHtml += `<img src="${escapeHtml(img.url || img.image)}" class="rounded" style="height: 80px; width: 80px; object-fit: cover;">`;
        });
        imagesHtml += '</div>';
    }

    // Build contact HTML
    const businessEmail = post.businessEmail || post.businessInfo?.businessEmail || '';
    const businessNumber = post.businessNumber || post.businessInfo?.businessNumber || '';
    const businessAddress = post.businessAddress || post.businessInfo?.businessAddress || '';

    // Build Validation HTML
    let validationHtml = '';
    if (post.validation && post.validation.issues && post.validation.issues.length > 0) {
        validationHtml = `
            <div class="alert alert-warning mb-3 border-0 bg-warning bg-opacity-10">
                <strong class="text-warning-emphasis">Validation Issues:</strong>
                <ul class="mb-0 small text-warning-emphasis">
                    ${post.validation.issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Construct 2-Column Layout
    modalBody.innerHTML = `
        <div class="row g-4">
            <!-- Left Col: Key Info -->
            <div class="col-md-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-uppercase text-muted small mb-3">Information</h6>
                        
                        <div class="mb-3">
                            <label class="small text-muted d-block">Status</label>
                            ${getStatusBadge(post.status)}
                        </div>
                        <div class="mb-3">
                            <label class="small text-muted d-block">Submitted</label>
                            <span class="fw-medium">${escapeHtml(post.submitted)}</span>
                        </div>
                        <hr class="my-3">
                        <div class="mb-2">
                            ${businessEmail ? `
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <i class="fas fa-envelope text-primary small"></i>
                                <span class="small fw-medium text-break">${escapeHtml(businessEmail)}</span>
                            </div>` : ''}
                            ${businessNumber ? `
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <i class="fas fa-phone text-success small"></i>
                                <span class="small fw-medium">${escapeHtml(businessNumber)}</span>
                            </div>` : ''}
                            ${businessAddress ? `
                            <div class="d-flex align-items-start gap-2">
                                <i class="fas fa-map-marker-alt text-danger small mt-1"></i>
                                <span class="small fw-medium">${escapeHtml(businessAddress)}</span>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Col: Content -->
            <div class="col-md-8">
                ${validationHtml}
                
                <!-- Description -->
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3 d-flex align-items-center gap-2">
                            <i class="fas fa-align-left text-danger"></i> Description
                        </h6>
                        <div class="text-muted small" style="line-height: 1.6;">
                            ${escapeHtml(post.description || post.content || 'No description available')}
                        </div>
                    </div>
                </div>

                <!-- Our Services Text -->
                 ${post.ourServices ? `
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3 d-flex align-items-center gap-2">
                            <i class="fas fa-list text-danger"></i> Service List
                        </h6>
                        <ul class="mb-0 small text-muted ps-3">
                             ${post.ourServices.split(/\n/).filter(item => item.trim()).map(service => {
        const cleaned = service.trim().replace(/^[•\-\*]\s*/, '').trim();
        return cleaned ? `<li>${escapeHtml(cleaned)}</li>` : '';
    }).join('')}
                        </ul>
                    </div>
                </div>` : ''}

                <!-- Services Gallery -->
                 ${servicesHtml ? `
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3 d-flex align-items-center gap-2">
                            <i class="fas fa-images text-danger"></i> Services Gallery
                        </h6>
                        ${servicesHtml}
                    </div>
                </div>` : ''}

                <!-- Main Gallery -->
                ${imagesHtml ? `
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="fw-bold mb-3 d-flex align-items-center gap-2">
                            <i class="fas fa-image text-danger"></i> Additional Images
                        </h6>
                        ${imagesHtml}
                    </div>
                </div>` : ''}
            </div>
        </div>
    `;

    // Show/hide action buttons based on status
    const approveBtn = document.getElementById('modalApproveBtn');
    const rejectBtn = document.getElementById('modalRejectBtn');

    if (approveBtn && rejectBtn) {
        if (post.status === 'pending') {
            approveBtn.style.display = 'inline-block';
            rejectBtn.style.display = 'inline-block';
        } else if (post.status === 'approved') {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
        } else {
            approveBtn.style.display = 'inline-block';
            rejectBtn.style.display = 'none';
        }
    }

    const modal = new bootstrap.Modal(document.getElementById('viewPostModal'));
    modal.show();
}

// Approve from modal
function approvePostFromModal() {
    if (currentPostId) {
        // Close view modal first
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewPostModal'));
        if (viewModal) {
            viewModal.hide();
        }
        // Then open approval confirmation modal
        approvePost(currentPostId);
    }
}

// Reject from modal
function rejectPostFromModal() {
    if (currentPostId) {
        // Close view modal first
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewPostModal'));
        if (viewModal) {
            viewModal.hide();
        }
        // Then open rejection reason modal
        rejectPost(currentPostId);
    }
}

// Refresh posts
function refreshPosts() {
    loadPosts();
    showAlert('Posts refreshed', 'info');
}

// Export posts
function exportPosts() {
    if (filteredPosts.length === 0) {
        showAlert('No posts to export', 'warning');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Business Name,Business Email,Post Title,Type,Status,Permission,Submitted\n";

    filteredPosts.forEach(post => {
        csvContent += [
            `"${post.businessName}"`,
            `"${post.businessEmail}"`,
            `"${post.title}"`,
            `"${post.type}"`,
            `"${post.status}"`,
            `"${post.permission}"`,
            `"${post.submitted}"`
        ].join(',') + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `business_posts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('Posts exported successfully!', 'success');
}

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Initialize Analytics Charts
function initializeCharts() {
    // Destroy existing charts if they exist
    if (postsOverTimeChart) {
        postsOverTimeChart.destroy();
        postsOverTimeChart = null;
    }
    if (postStatusChart) {
        postStatusChart.destroy();
        postStatusChart = null;
    }
    if (postTypeChart) {
        postTypeChart.destroy();
        postTypeChart = null;
    }
    if (permissionStatusChart) {
        permissionStatusChart.destroy();
        permissionStatusChart = null;
    }

    // Chart 1: Posts Over Time (Line Chart)
    const postsOverTimeCtx = document.getElementById('postsOverTimeChart');
    if (postsOverTimeCtx) {
        const timeData = calculatePostsOverTime();
        const ctx1 = postsOverTimeCtx.getContext('2d');
        const gradient1 = ctx1.createLinearGradient(0, 0, 0, 300);
        gradient1.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); // Blue
        gradient1.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        postsOverTimeChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Posts Submitted',
                    data: timeData.data,
                    borderColor: '#3b82f6', // Blue
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
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    // Chart 2: Post Status Distribution (Pie Chart)
    const postStatusCtx = document.getElementById('postStatusChart');
    if (postStatusCtx) {
        const statusData = calculatePostStatus();
        postStatusChart = new Chart(postStatusCtx, {
            type: 'doughnut',
            data: {
                labels: statusData.labels || ['Pending', 'Approved', 'Rejected'],
                datasets: [{
                    data: statusData.data || [0, 0, 0],
                    backgroundColor: [
                        '#f59e0b', // Amber (Pending)
                        '#10b981', // Emerald (Approved)
                        '#ef4444'  // Red (Rejected)
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            boxWidth: 8,
                            font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                            },
                            color: '#94a3b8'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: true,
                        boxPadding: 4
                    }
                }
            }
        });
    }

    // Chart 3: Posts by Type (Bar Chart)
    const postTypeCtx = document.getElementById('postTypeChart');
    if (postTypeCtx) {
        const typeData = calculatePostType();
        const ctx3 = postTypeCtx.getContext('2d');
        const gradient3 = ctx3.createLinearGradient(0, 0, 0, 300);
        gradient3.addColorStop(0, '#6366f1'); // Indigo
        gradient3.addColorStop(1, '#a855f7'); // Purple

        postTypeChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: typeData.labels,
                datasets: [{
                    label: 'Posts',
                    data: typeData.data,
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
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    // Chart 4: Permission Status (Doughnut Chart)
    const permissionStatusCtx = document.getElementById('permissionStatusChart');
    if (permissionStatusCtx) {
        const permissionData = calculatePermissionStatus();
        permissionStatusChart = new Chart(permissionStatusCtx, {
            type: 'doughnut',
            data: {
                labels: permissionData.labels || ['Pending', 'Approved', 'Rejected'],
                datasets: [{
                    data: permissionData.data || [0, 0, 0],
                    backgroundColor: [
                        '#f59e0b', // Amber (Pending)
                        '#10b981', // Emerald (Approved)
                        '#ef4444'  // Red (Rejected/Revoked)
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            boxWidth: 8,
                            font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                            },
                            color: '#94a3b8'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: true,
                        boxPadding: 4
                    }
                }
            }
        });
    }
}

// Calculate posts over time
function calculatePostsOverTime() {
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
        // Use stats data if available (approved + declined for that date)
        if (window.statsData?.byDate && window.statsData.byDate[date]) {
            const dayStats = window.statsData.byDate[date];
            return (dayStats.approved || 0) + (dayStats.declined || 0);
        }

        // Fallback to counting from allPosts if stats not available
        return allPosts.filter(post => {
            if (!post.submittedAt) return false;

            try {
                const postDate = new Date(post.submittedAt);
                if (isNaN(postDate.getTime())) {
                    console.warn('Invalid date for post:', post.postId, post.submittedAt);
                    return false;
                }
                const postDateStr = postDate.toISOString().split('T')[0];
                return postDateStr === date;
            } catch (error) {
                console.warn('Error parsing date for post:', post.postId, error);
                return false;
            }
        }).length;
    });

    return { labels, data };
}

// Calculate post status distribution
function calculatePostStatus() {
    const pending = allPosts.filter(p => p.status === 'pending').length;
    const approved = window.statsData?.approved || 0;
    const rejected = window.statsData?.declined || 0;

    return {
        labels: ['Pending', 'Approved', 'Rejected'],
        data: [pending, approved, rejected]
    };
}

// Calculate post type distribution
function calculatePostType() {
    const types = {};

    if (allPosts && allPosts.length > 0) {
        allPosts.forEach(post => {
            const type = post.type || 'Unknown';
            types[type] = (types[type] || 0) + 1;
        });
    }

    const labels = Object.keys(types).length > 0 ? Object.keys(types) : ['No Data'];
    const data = Object.keys(types).length > 0 ? Object.values(types) : [0];

    return { labels, data };
}

// Calculate permission status distribution (using approval status as proxy)
function calculatePermissionStatus() {
    const pending = allPosts.filter(p => p.status === 'pending').length;
    const approved = window.statsData?.approved || 0;
    const rejected = window.statsData?.declined || 0;

    return {
        labels: ['Pending', 'Approved', 'Rejected'],
        data: [pending, approved, rejected]
    };
}

// Update charts with real data
function updateCharts() {
    if (!postsOverTimeChart || !postStatusChart || !postTypeChart || !permissionStatusChart) {
        return;
    }

    // Update Chart 1: Posts Over Time
    const timeData = calculatePostsOverTime();
    postsOverTimeChart.data.labels = timeData.labels;
    postsOverTimeChart.data.datasets[0].data = timeData.data;
    postsOverTimeChart.update();

    // Update Chart 2: Post Status
    const statusData = calculatePostStatus();
    postStatusChart.data.labels = statusData.labels;
    postStatusChart.data.datasets[0].data = statusData.data;
    postStatusChart.update();

    // Update Chart 3: Post Type
    const typeData = calculatePostType();
    postTypeChart.data.labels = typeData.labels;
    postTypeChart.data.datasets[0].data = typeData.data;
    postTypeChart.update();

    // Update Chart 4: Permission Status
    const permissionData = calculatePermissionStatus();
    permissionStatusChart.data.labels = permissionData.labels;
    permissionStatusChart.data.datasets[0].data = permissionData.data;
    permissionStatusChart.update();
}

// Check login state
async function checkLoginState() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/admin/account/get-user-info`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                const userSection = document.getElementById('userSection');
                const loginBtnHeader = document.getElementById('loginBtnHeader');
                const userName = document.getElementById('userName');
                const userAvatar = document.getElementById('userAvatar');

                if (userSection && loginBtnHeader) {
                    userSection.style.display = 'flex';
                    loginBtnHeader.style.display = 'none';
                }

                if (userName && data.user.email) {
                    const email = data.user.email;
                    userName.textContent = email.split('@')[0];
                    if (userAvatar) {
                        const initials = email.substring(0, 2).toUpperCase();
                        userAvatar.textContent = initials;
                    }
                }
            } else {
                throw new Error('Not logged in');
            }
        } else {
            throw new Error('Not logged in');
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        const userSection = document.getElementById('userSection');
        const loginBtnHeader = document.getElementById('loginBtnHeader');
        if (userSection && loginBtnHeader) {
            userSection.style.display = 'none';
            loginBtnHeader.style.display = 'inline-flex';
        }
    }
}

// Handle logout
async function handleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    }

    try {
        const result = await window.adminAWSAuthService.logout();

        if (result.success) {
            console.log('Logout successful:', result.message);

            if (result.warning) {
                console.warn('Logout warning:', result.warning);
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        } else {
            console.error('Logout failed:', result.message || result.error);
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = 'admin-login.html';
    }
}
