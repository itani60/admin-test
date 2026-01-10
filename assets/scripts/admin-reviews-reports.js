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
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';

    if (isLoading) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
        return;
    }

    if (filteredReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No reports found</td></tr>';
        return;
    }

    filteredReports.forEach(report => {
        const row = document.createElement('tr');
        row.className = 'report-item';
        row.onclick = () => viewReportDetail(report);

        const reportedDate = new Date(report.createdAt || report.reportedDate).toLocaleDateString();
        const reviewComment = report.review?.comment || 'No comment available';
        const reviewPreview = reviewComment.length > 50
            ? reviewComment.substring(0, 50) + '...'
            : reviewComment;
        const rating = report.review?.rating || 0;

        row.innerHTML = `
                    <td><code style="font-size: 0.8rem;">${(report.reportId || report.reviewId || '').substring(0, 20)}...</code></td>
                    <td>
                        <div class="review-preview" title="${reviewComment}">
                            ${reviewPreview}
                        </div>
                        <div class="review-rating mt-1">
                            ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                        </div>
                    </td>
                    <td>${report.businessName || report.businessId || 'N/A'}</td>
                    <td>${report.reporterName || report.reporterEmail || 'Anonymous'}</td>
                    <td><span class="reason-badge">${report.reason || 'other'}</span></td>
                    <td><span class="status-badge ${report.status || 'pending'}">${report.status || 'pending'}</span></td>
                    <td>${reportedDate}</td>
                    <td>
                        <div class="action-buttons" onclick="event.stopPropagation()">
                            <button class="btn-action btn-view" onclick="viewReportDetail('${report.reviewId}', '${report.reporterUserId}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </div>
                    </td>
                `;
        tbody.appendChild(row);
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

// Confirmation modal state
let pendingAction = null;

// Show confirmation modals
function showDismissConfirm() {
    showConfirmModal(
        'Dismiss Report',
        'Are you sure you want to dismiss this report?',
        'warning',
        'dismiss'
    );
}

function showResolveConfirm() {
    showConfirmModal(
        'Resolve Report',
        'Are you sure you want to mark this report as resolved?',
        'info',
        'resolve'
    );
}

function showRemoveConfirm() {
    showConfirmModal(
        'Remove Review',
        'Are you sure you want to remove this review? This action cannot be undone.',
        'danger',
        'remove'
    );
}

function showConfirmModal(title, message, type, action) {
    const modal = document.getElementById('confirmModal');
    const header = document.getElementById('confirmModalHeader');
    const titleEl = document.getElementById('confirmModalLabel');
    const body = document.getElementById('confirmModalBody');
    const button = document.getElementById('confirmModalButton');

    // Set header class
    header.className = 'modal-header ' + type;

    // Set title with icon
    const icons = {
        warning: 'fa-exclamation-triangle',
        danger: 'fa-exclamation-circle',
        info: 'fa-question-circle'
    };
    titleEl.innerHTML = `<i class="fas ${icons[type] || 'fa-exclamation-triangle'}"></i> ${title}`;

    // Set message
    body.innerHTML = `<p class="mb-0">${message}</p>`;

    // Set button style
    button.className = 'btn btn-' + type;
    button.innerHTML = action === 'remove' ? '<i class="fas fa-trash"></i> Remove Review' : 'Confirm';

    // Store pending action
    pendingAction = action;

    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
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

function showAlert(message, type = 'info') {
    const modal = document.getElementById('alertModal');
    const header = document.getElementById('alertModalHeader');
    const titleEl = document.getElementById('alertModalLabel');
    const body = document.getElementById('alertModalBody');

    // Set header class
    header.className = 'modal-header ' + type;

    // Set title with icon
    const icons = {
        success: 'fa-check-circle',
        danger: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    const titles = {
        success: 'Success',
        danger: 'Error',
        info: 'Information',
        warning: 'Warning'
    };
    titleEl.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${titles[type] || 'Notification'}`;

    // Set message
    body.innerHTML = `<p class="mb-0">${message}</p>`;

    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
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
            bootstrap.Modal.getInstance(document.getElementById('reportDetailModal')).hide();
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
            bootstrap.Modal.getInstance(document.getElementById('reportDetailModal')).hide();
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
            bootstrap.Modal.getInstance(document.getElementById('reportDetailModal')).hide();
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
        { value: 'pending', text: 'Pending' },
        { value: 'reviewed', text: 'Reviewed' },
        { value: 'resolved', text: 'Resolved' },
        { value: 'dismissed', text: 'Dismissed' }
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
            filterReports();

            // Reload reports if needed
            const status = option.value === 'all' ? null : option.value;
            loadReports(status);
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

// Initialize custom reason dropdown
function initializeReasonDropdown() {
    const reasonDropdown = document.getElementById('reasonDropdown');
    const reasonDropdownBtn = document.getElementById('reasonDropdownBtn');
    const reasonDropdownMenu = document.getElementById('reasonDropdownMenu');
    const reasonDropdownItems = document.getElementById('reasonDropdownItems');
    const reasonSelect = document.getElementById('reasonSelect');

    if (!reasonDropdown || !reasonDropdownBtn || !reasonDropdownMenu || !reasonDropdownItems) return;

    // Reason options
    const reasonOptions = [
        { value: 'all', text: 'All Reasons' },
        { value: 'spam', text: 'Spam' },
        { value: 'inappropriate', text: 'Inappropriate' },
        { value: 'fake', text: 'Fake' },
        { value: 'offensive', text: 'Offensive' },
        { value: 'other', text: 'Other' }
    ];

    // Render dropdown items
    reasonOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === 'all') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            // Update selected state
            reasonDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            // Update button text and hidden input
            document.getElementById('reasonDropdownText').textContent = option.text;
            reasonSelect.value = option.value;

            // Close dropdown
            reasonDropdown.classList.remove('active');
            reasonDropdownMenu.style.display = 'none';

            // Apply filters
            filterReports();
        });
        reasonDropdownItems.appendChild(itemDiv);
    });

    // Toggle dropdown
    reasonDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = reasonDropdown.classList.contains('active');

        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'reasonDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            reasonDropdown.classList.remove('active');
            reasonDropdownMenu.style.display = 'none';
        } else {
            reasonDropdown.classList.add('active');
            reasonDropdownMenu.style.display = 'block';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            reasonDropdown.classList.remove('active');
            reasonDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initRBAC();
    initializeStatusDropdown();
    initializeReasonDropdown();
    await loadReports();
});

