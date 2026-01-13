const API_BASE_URL = 'https://hub.comparehubprices.co.za/admin/admin/review-reports';

let reportsData = [];
let currentReport = null;
let filteredReports = [];
let isLoading = false;

async function loadReports(status = null) {
    if (isLoading) return;
    isLoading = true;

    // Show loading state immediately
    renderReports();

    try {
        const url = status ? `${API_BASE_URL}?status=${status}` : API_BASE_URL;
        console.log('Fetching reports from:', url);
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);

        if (data.success && Array.isArray(data.reports)) {
            reportsData = data.reports;
            console.log('Loaded reports:', reportsData.length);

            // Extract unique reasons dynamically
            const uniqueReasons = [...new Set(reportsData.map(r => r.reason).filter(r => r))];
            updateReasonOptions(uniqueReasons);

            filterReports();
            updateStats();
        } else {
            console.error('Failed to load reports:', data);
            reportsData = [];
            filterReports();
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showAlert('Failed to load reports: ' + error.message, 'danger');
        reportsData = [];
        filterReports();
    } finally {
        isLoading = false;
        // Ensure we render again after loading is complete
        renderReports();
    }
}


function renderReports() {
    const container = document.getElementById('reportsContainer');

    // If container not found, try finding the table body for backward compatibility or error handling
    if (!container) {
        console.error('Reports container not found');
        return;
    }

    container.innerHTML = '';

    if (isLoading) {
        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        return;
    }

    if (filteredReports.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">No reports found matching your criteria</div>';
        return;
    }

    filteredReports.forEach((report, index) => {
        // Determine status class and icon
        let statusClass = (report.status || 'pending').toLowerCase();
        let iconClass = 'fa-exclamation-triangle';

        if (statusClass === 'resolved') {
            statusClass = 'resolved';
            iconClass = 'fa-check-circle';
        } else if (statusClass === 'dismissed') {
            statusClass = 'dismissed';
            iconClass = 'fa-ban';
        } else if (statusClass === 'reviewed') {
            statusClass = 'reviewed';
            iconClass = 'fa-search';
        } else {
            // Default to pending styles
            statusClass = 'pending';
        }

        const dateStr = new Date(report.createdAt || report.reportedDate).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        const card = document.createElement('div');
        card.className = `d2-card ${statusClass}`;

        // Pass the actual report object to viewReportDetail
        // We use a closure approach or attach data to the element to avoid complex string escaping in onclick

        card.innerHTML = `
            <div class="d2-icon ${statusClass}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="d2-content">
                <div class="d2-business">${report.businessName || report.businessId || 'Unknown Business'}</div>
                <div class="d2-meta">
                    <span><i class="fas fa-user-tag"></i> Reporter: ${report.reporterName || report.reporterEmail || 'Anonymous'}</span>
                    <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                    <span><i class="fas fa-flag"></i> Reason: <span class="text-capitalize">${report.reason || 'Other'}</span></span>
                </div>
            </div>
            <div class="text-end d-flex flex-column align-items-end gap-2">
                <span class="status-badge ${statusClass}">${report.status || 'PENDING'}</span>
                <button class="btn btn-link text-dark p-0 no-arrow report-detail-btn" type="button">
                    <i class="fas fa-ellipsis-v fa-lg"></i>
                </button>
            </div>
        `;

        // Add click listener to the button
        const btn = card.querySelector('.report-detail-btn');
        btn.onclick = (e) => {
            e.stopPropagation();
            viewReportDetail(report);
        };

        // Make the whole card clickable too if desired, matching previous behavior
        card.onclick = () => viewReportDetail(report);

        container.appendChild(card);
    });
}

function filterReports() {
    const statusSelect = document.getElementById('statusSelect');
    const statusFilter = statusSelect ? statusSelect.value : 'all';
    const reasonSelect = document.getElementById('reasonSelect');
    const reasonFilter = reasonSelect ? reasonSelect.value : 'all';
    const searchFilter = document.getElementById('searchFilter')?.value.toLowerCase() || '';

    console.log('Filtering reports:', {
        totalReports: reportsData.length,
        statusFilter,
        reasonFilter,
        searchFilter
    });

    filteredReports = reportsData.filter(report => {
        const statusMatch = statusFilter === 'all' || (report.status || 'pending') === statusFilter;
        const reasonMatch = reasonFilter === 'all' || (report.reason || 'other') === reasonFilter;
        const searchMatch = !searchFilter ||
            (report.businessName || report.businessId || '').toLowerCase().includes(searchFilter) ||
            (report.reviewerName || report.reviewerEmail || report.review?.reviewerName || report.review?.reviewerEmail || '').toLowerCase().includes(searchFilter) ||
            (report.reporterName || report.reporterEmail || '').toLowerCase().includes(searchFilter) ||
            (report.review?.comment || '').toLowerCase().includes(searchFilter) ||
            (report.description || '').toLowerCase().includes(searchFilter);

        return statusMatch && reasonMatch && searchMatch;
    });

    console.log('Filtered reports:', filteredReports.length);
    renderReports();
}

function updateStats() {
    const total = reportsData.length;
    const pending = reportsData.filter(r => (r.status || 'pending') === 'pending').length;
    const resolved = reportsData.filter(r => r.status === 'resolved').length;
    const dismissed = reportsData.filter(r => r.status === 'dismissed').length;

    const totalEl = document.getElementById('totalReportsStat');
    const pendingEl = document.getElementById('pendingReportsStat');
    const resolvedEl = document.getElementById('resolvedReportsStat');
    const dismissedEl = document.getElementById('dismissedReportsStat');

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (resolvedEl) resolvedEl.textContent = resolved;
    if (dismissedEl) dismissedEl.textContent = dismissed;
}

async function viewReportDetail(reportOrReviewId, reporterUserId) {
    // Handle both cases: report object passed directly, or reviewId + reporterUserId
    let report;
    if (typeof reportOrReviewId === 'object' && reportOrReviewId !== null) {
        // Report object was passed directly
        report = reportOrReviewId;
    } else {
        // reviewId and reporterUserId were passed as strings
        report = reportsData.find(r => r.reviewId === reportOrReviewId && r.reporterUserId === reporterUserId);
    }

    if (!report) {
        showAlert('Report not found', 'warning');
        return;
    }

    currentReport = report;
    const modal = new bootstrap.Modal(document.getElementById('reportDetailModal'));
    const content = document.getElementById('reportDetailContent');

    const reportedDate = new Date(report.createdAt || report.reportedDate).toLocaleString();
    const reviewerName = report.review?.reviewerName || report.reviewerName || report.reviewerEmail || 'Unknown';
    const reviewerEmail = report.review?.reviewerEmail || report.reviewerEmail || 'N/A';
    const reporterName = report.reporterName || report.reporterEmail || 'Anonymous';
    const reviewDate = report.review?.createdAt ? new Date(report.review.createdAt).toLocaleString() : 'N/A';
    const rating = report.review?.rating || 0;
    const reviewComment = report.review?.comment || 'No comment available';

    content.innerHTML = `
                <div class="review-detail-card">
                    <div class="review-detail-header">
                        <div class="reviewer-info">
                            <div class="reviewer-avatar">${reviewerName.charAt(0).toUpperCase()}</div>
                            <div>
                                <div class="fw-bold">${reviewerName}</div>
                                <div class="text-muted small">${reviewerEmail}</div>
                            </div>
                        </div>
                        <div class="review-rating">
                            ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                        </div>
                    </div>
                    <div class="mt-2">
                        <p class="mb-0">${reviewComment}</p>
                        <small class="text-muted">${reviewDate}</small>
                    </div>
                </div>

                <div class="report-detail-card">
                    <h6 class="fw-bold mb-3"><i class="fas fa-flag text-danger"></i> Report Information</h6>
                    <div class="report-meta">
                        <div class="meta-item">
                            <span class="meta-label">Reporter</span>
                            <span class="meta-value">${reporterName}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Report Reason</span>
                            <span class="meta-value"><span class="reason-badge">${report.reason || 'other'}</span></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Status</span>
                            <span class="meta-value"><span class="status-badge ${report.status || 'pending'}">${report.status || 'pending'}</span></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Reported Date</span>
                            <span class="meta-value">${reportedDate}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Business</span>
                            <span class="meta-value">${report.businessName || report.businessId || 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Review ID</span>
                            <span class="meta-value"><code style="font-size: 0.8rem;">${report.reviewId}</code></span>
                        </div>
                    </div>
                    ${report.description ? `
                        <div class="mt-3">
                            <span class="meta-label">Description</span>
                            <p class="mt-1 mb-0">${report.description}</p>
                        </div>
                    ` : ''}
                </div>
            `;

    modal.show();
}

// Custom Confirmation Modal Logic
function closeCustomConfirm() {
    const modal = document.getElementById('customConfirmModal');
    if (modal) modal.classList.remove('active');
}

function showConfirmModal(title, message, action, type = 'warning') {
    const modal = document.getElementById('customConfirmModal');
    const titleEl = document.getElementById('customConfirmTitle');
    const msgEl = document.getElementById('customConfirmMessage');
    const btn = document.getElementById('customConfirmBtn');
    const iconContainer = document.getElementById('confirmIconContainer');

    if (!modal) return;

    pendingAction = action;

    titleEl.textContent = title;
    msgEl.innerHTML = message; // Use innerHTML to allow bolding if needed

    // Set styling based on type
    btn.className = 'btn-d1-confirm'; // Reset
    let iconClass = 'fa-question-circle';
    let iconColorClass = 'text-primary';

    if (type === 'danger') {
        btn.style.backgroundColor = 'var(--danger)';
        iconClass = 'fa-exclamation-triangle';
        iconColorClass = 'text-danger';
    } else if (type === 'warning') {
        btn.style.backgroundColor = 'var(--warning)';
        btn.style.color = '#212529';
        iconClass = 'fa-exclamation-circle';
        iconColorClass = 'text-warning';
    } else if (type === 'info') {
        btn.style.backgroundColor = 'var(--info)';
        iconClass = 'fa-info-circle';
        iconColorClass = 'text-info';
    } else {
        // success/primary
        btn.style.backgroundColor = 'var(--primary)';
        iconClass = 'fa-check-circle';
        iconColorClass = 'text-primary';
    }

    iconContainer.className = `mb-3 ${iconColorClass}`;
    iconContainer.innerHTML = `<i class="fas ${iconClass} fa-3x"></i>`;

    // Set click handler
    btn.onclick = async () => {
        closeCustomConfirm();
        await executeConfirmedAction();
    };

    modal.classList.add('active');
}

// Wrapper functions for confirmation actions
function showDismissConfirm() {
    if (!currentReport) return;
    const reportDetailModal = bootstrap.Modal.getInstance(document.getElementById('reportDetailModal'));
    if (reportDetailModal) reportDetailModal.hide();

    showConfirmModal(
        'Dismiss Report?',
        'Are you sure you want to dismiss this report? No action will be taken against the review.',
        'dismiss',
        'warning'
    );
}

function showResolveConfirm() {
    if (!currentReport) return;
    const reportDetailModal = bootstrap.Modal.getInstance(document.getElementById('reportDetailModal'));
    if (reportDetailModal) reportDetailModal.hide();

    showConfirmModal(
        'Resolve Report?',
        'Mark this report as resolved? This indicates the issue has been addressed.',
        'resolve',
        'success'
    );
}

function showRemoveConfirm() {
    if (!currentReport) return;
    const reportDetailModal = bootstrap.Modal.getInstance(document.getElementById('reportDetailModal'));
    if (reportDetailModal) reportDetailModal.hide();

    showConfirmModal(
        'Remove Review?',
        'Are you sure you want to remove this review? This action cannot be undone and will affect the business rating.',
        'remove',
        'danger'
    );
}

async function executeConfirmedAction() {
    if (!pendingAction || !currentReport) return;

    // Hide confirmation modal
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
    confirmModal.hide();

    // Execute the action
    if (pendingAction === 'dismiss') {
        await dismissReport();
    } else if (pendingAction === 'resolve') {
        await resolveReport();
    } else if (pendingAction === 'remove') {
        await removeReview();
    }

    pendingAction = null;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    let icon = 'fa-info-circle';
    let wrapperClass = '';

    if (type === 'success') {
        icon = 'fa-check';
        wrapperClass = 'success';
    } else if (type === 'error' || type === 'danger') {
        icon = 'fa-times';
        wrapperClass = 'error';
    } else if (type === 'warning') {
        icon = 'fa-exclamation';
        // default warning colors are already close to orange/amber default
    }

    toast.innerHTML = `
        <div class="toast-d6 ${wrapperClass}">
            <div class="toast-d6-icon-circle"><i class="fas ${icon}"></i></div>
            <div class="toast-d6-text">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        });
    }, 3000); // 3 seconds
}

function showAlert(message, type = 'info') {
    showToast(message, type);
}

async function dismissReport() {
    if (!currentReport) return;

    try {
        const response = await fetch(`${API_BASE_URL}/dismiss`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reviewId: currentReport.reviewId,
                reporterUserId: currentReport.reporterUserId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('Report dismissed successfully!', 'success');

            const detailModalEl = document.getElementById('reportDetailModal');
            if (detailModalEl) {
                const modal = bootstrap.Modal.getInstance(detailModalEl);
                if (modal) modal.hide();
            }

            await loadReports(); // Reload reports
        } else {
            throw new Error(data.message || 'Failed to dismiss report');
        }
    } catch (error) {
        console.error('Error dismissing report:', error);
        showAlert(error.message || 'Failed to dismiss report. Please try again.', 'danger');
    }
}

async function resolveReport() {
    if (!currentReport) return;

    try {
        const response = await fetch(`${API_BASE_URL}/resolve`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reviewId: currentReport.reviewId,
                reporterUserId: currentReport.reporterUserId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('Report marked as resolved!', 'success');

            const detailModalEl = document.getElementById('reportDetailModal');
            if (detailModalEl) {
                const modal = bootstrap.Modal.getInstance(detailModalEl);
                if (modal) modal.hide();
            }

            await loadReports(); // Reload reports
        } else {
            throw new Error(data.message || 'Failed to resolve report');
        }
    } catch (error) {
        console.error('Error resolving report:', error);
        showAlert(error.message || 'Failed to resolve report. Please try again.', 'danger');
    }
}

async function removeReview() {
    if (!currentReport) return;

    try {
        const response = await fetch(`${API_BASE_URL}/remove-review`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                businessId: currentReport.businessId,
                reviewerUserId: currentReport.reviewerUserId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('Review removed successfully!', 'success');

            const detailModalEl = document.getElementById('reportDetailModal');
            if (detailModalEl) {
                const modal = bootstrap.Modal.getInstance(detailModalEl);
                if (modal) modal.hide();
            }

            await loadReports(); // Reload reports
        } else {
            throw new Error(data.message || 'Failed to remove review');
        }
    } catch (error) {
        console.error('Error removing review:', error);
        showAlert(error.message || 'Failed to remove review. Please try again.', 'danger');
    }
}

// Toggle navigation section collapse/expand
function toggleNavSection(element) {
    const navSection = element.closest('.nav-section');
    const navItems = navSection.querySelector('.nav-section-items');

    // Toggle collapsed class on title
    element.classList.toggle('collapsed');

    // Toggle collapsed class on items container
    navItems.classList.toggle('collapsed');
}



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

            // RBAC
            if (currentUserRole === 'viewer') {
                const actionButtons = document.querySelectorAll('.btn-dismiss, .btn-resolve, .btn-remove');
                actionButtons.forEach(btn => btn.style.display = 'none');
            }

        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

// Initialize custom status dropdown (Design 2)
function initializeStatusDropdown() {
    const statusDropdown = document.getElementById('statusDropdown');
    const statusSelect = document.getElementById('statusSelect');

    if (!statusDropdown || !statusSelect) return;

    const trigger = statusDropdown.querySelector('.dropdown-trigger');
    const menu = statusDropdown.querySelector('.dropdown-menu-list');
    const selectedText = statusDropdown.querySelector('.selected-text');

    if (!trigger || !menu || !selectedText) return;

    // Status options
    const statusOptions = [
        { value: 'all', text: 'All Status', icon: 'fas fa-clipboard-list', color: 'text-secondary' },
        { value: 'pending', text: 'Pending', icon: 'fas fa-clock', color: 'text-warning' },
        { value: 'reviewed', text: 'Reviewed', icon: 'fas fa-search', color: 'text-info' },
        { value: 'resolved', text: 'Resolved', icon: 'fas fa-check-circle', color: 'text-success' },
        { value: 'dismissed', text: 'Dismissed', icon: 'fas fa-ban', color: 'text-danger' }
    ];

    // Render dropdown items
    menu.innerHTML = '';
    statusOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dropdown-item-custom';
        if (option.value === statusSelect.value) {
            itemDiv.classList.add('selected');
        }
        itemDiv.dataset.value = option.value;
        itemDiv.innerHTML = `<i class="${option.icon} ${option.color}"></i> ${option.text}`;

        itemDiv.addEventListener('click', function (e) {
            e.stopPropagation();
            // Update selected state
            menu.querySelectorAll('.dropdown-item-custom').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            // Update button text and hidden input
            selectedText.textContent = option.text;
            statusSelect.value = option.value;

            // Close dropdown
            statusDropdown.classList.remove('active');

            // Apply filters
            filterReports();

            // Reload reports if needed (for specific backend status filtering)
            const status = option.value === 'all' ? null : option.value;
            loadReports(status);
        });
        menu.appendChild(itemDiv);
    });

    // Toggle dropdown
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = statusDropdown.classList.contains('active');

        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd !== statusDropdown) {
                dd.classList.remove('active');
            }
        });

        statusDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            statusDropdown.classList.remove('active');
        }
    });
}

// Initialize custom reason dropdown (Design 2)
// Initialize custom reason dropdown listeners (Design 2)
function initReasonDropdownListeners() {
    const reasonDropdown = document.getElementById('reasonDropdown');
    const trigger = reasonDropdown?.querySelector('.dropdown-trigger');

    if (!reasonDropdown || !trigger) return;

    // Toggle dropdown
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd !== reasonDropdown) dd.classList.remove('active');
        });
        reasonDropdown.classList.toggle('active');
    });
}

// Update Reason Options Dynamically
function updateReasonOptions(customReasons = null) {
    const reasonDropdown = document.getElementById('reasonDropdown');
    const reasonSelect = document.getElementById('reasonSelect');
    const menu = reasonDropdown?.querySelector('.dropdown-menu-list');
    const selectedText = reasonDropdown?.querySelector('.selected-text');

    if (!reasonDropdown || !reasonSelect || !menu || !selectedText) return;

    // Default static options
    let options = [
        { value: 'all', text: 'All Reasons', icon: 'fas fa-list', color: 'text-secondary' },
        { value: 'spam', text: 'Spam', icon: 'fas fa-trash', color: 'text-danger' },
        { value: 'inappropriate', text: 'Inappropriate', icon: 'fas fa-exclamation-triangle', color: 'text-warning' },
        { value: 'fake', text: 'Fake', icon: 'fas fa-robot', color: 'text-dark' },
        { value: 'offensive', text: 'Offensive', icon: 'fas fa-angry', color: 'text-danger' },
        { value: 'other', text: 'Other', icon: 'fas fa-question', color: 'text-secondary' }
    ];

    // Merge custom reasons if provided
    if (customReasons && Array.isArray(customReasons)) {
        const existingValues = new Set(options.map(o => o.value));
        customReasons.forEach(reason => {
            const val = reason.toLowerCase();
            if (!existingValues.has(val)) {
                options.push({
                    value: val,
                    text: reason.charAt(0).toUpperCase() + reason.slice(1), // Capitalize
                    icon: 'fas fa-tag', // Generic icon
                    color: 'text-muted'
                });
                existingValues.add(val);
            }
        });
    }

    // Render dropdown items
    menu.innerHTML = '';
    options.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dropdown-item-custom';
        if (option.value === reasonSelect.value) {
            itemDiv.classList.add('selected');
        }
        itemDiv.dataset.value = option.value;
        itemDiv.innerHTML = `<i class="${option.icon} ${option.color}"></i> ${option.text}`;

        itemDiv.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.querySelectorAll('.dropdown-item-custom').forEach(item => item.classList.remove('selected'));
            this.classList.add('selected');

            selectedText.textContent = option.text;
            reasonSelect.value = option.value;

            reasonDropdown.classList.remove('active');
            filterReports();
        });
        menu.appendChild(itemDiv);
    });
}

// Initialize
// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (window.adminAWSAuthService) {
        const auth = await window.adminAWSAuthService.getUserInfo();
        if (!auth.success || !window.adminAWSAuthService.hasPermission('canReviewReports')) {
            window.location.href = 'index.html';
            return;
        }
        currentUserRole = auth.user.role || 'viewer';
    }

    initializeStatusDropdown();
    initReasonDropdownListeners();
    updateReasonOptions(null); // Load static defaults
    await loadReports();
});

