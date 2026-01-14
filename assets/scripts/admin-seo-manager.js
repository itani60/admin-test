const SEO_API_URL = 'https://hub.comparehubprices.co.za/admin/manage-seo';

document.addEventListener('DOMContentLoaded', () => {
    initSeoDashboard();
});

async function initSeoDashboard() {
    console.log('Initializing SEO Dashboard...');
    try {
        await Promise.all([
            fetchDashboardStats(),
            fetchSearchConsoleData(),
            fetchRecentAudits()
        ]);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

async function fetchRecentAudits() {
    try {
        const response = await fetch(SEO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getLastAudits' })
        });

        const audits = await response.json();
        if (Array.isArray(audits)) {
            updateAuditTable(audits);
        }
    } catch (error) {
        console.error('Failed to fetch audits:', error);
    }
}

async function fetchDashboardStats() {
    try {
        const response = await fetch(SEO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getDashboardStats' })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Update Stat Cards
        updateStatCard('overall-score', (data.overallScore || 0) + '%', data.overallScore || 0);
        updateStatCard('indexed-pages', data.indexedPages || 0, 75); // Mock progress for count
        updateStatCard('crawl-errors', data.crawlErrors || 0, 20); // Mock progress for count
        updateStatCard('load-speed', (data.avgLoadSpeed || 0) + 's', 90);

        // Update Priority Fixes (Top Issues)
        updatePriorityFixes(data.topIssues);

    } catch (error) {
        console.error('Failed to fetch stats:', error);
    }
}

async function fetchSearchConsoleData() {
    try {
        const response = await fetch(SEO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getSearchConsoleData' })
        });

        const data = await response.json();
        if (data.rows) {
            updateKeywordList(data.rows);
        }

    } catch (error) {
        console.error('Failed to fetch search console data:', error);
    }
}

function updateAuditTable(audits) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    if (audits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-secondary">No audits found. Run a "New Audit" to get started!</td></tr>';
        return;
    }

    tbody.innerHTML = audits.map(audit => {
        const date = new Date(audit.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let statusBadge = '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Good</span>';
        if (audit.score < 50) statusBadge = '<span class="badge bg-danger bg-opacity-10 text-danger rounded-pill px-3">Poor</span>';
        else if (audit.score < 80) statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning rounded-pill px-3">Fair</span>';

        const issuesEncoded = encodeURIComponent(JSON.stringify(audit.issues_list || []));

        return `
            <tr>
                <td class="ps-4 fw-medium text-break" style="max-width: 200px;">${audit.PagePath}</td>
                <td class="text-muted small">${date}</td>
                <td><span class="fw-bold">${audit.score}</span></td>
                <td>${statusBadge}</td>
                <td class="pe-4 text-end">
                    <button class="btn btn-sm btn-light text-secondary me-1" onclick="triggerPageAudit('${audit.FullUrl}')" title="Re-Analyze">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-secondary" onclick="showIssuesModal('${issuesEncoded}', ${audit.score})">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStatCard(id, value, progress) {
    // Note: This assumes specific IDs were added to the HTML stats cards. 
    // I will need to update the HTML to add these IDs: 
    // #stat-overall-score, #stat-indexed-pages, #stat-crawl-errors, #stat-load-speed
    const valueEl = document.getElementById(`stat-${id}-value`);
    const progressEl = document.getElementById(`stat-${id}-progress`);

    if (valueEl) valueEl.textContent = value;
    if (progressEl) progressEl.style.width = `${progress}%`;
}

function updatePriorityFixes(issues) {
    const container = document.getElementById('priority-fixes-list');
    if (!container) return; // Need to add this ID to HTML

    if (!issues || issues.length === 0) {
        container.innerHTML = '<div class="text-center text-white-50 py-3">No critical issues found!</div>';
        return;
    }

    container.innerHTML = issues.map(issue => {
        const isHigh = issue.severity === 'High';
        const glowClass = isHigh ? 'd6-glow-red' : 'd6-glow-yellow';
        const iconClass = isHigh ? 'fa-times' : 'fa-bolt';
        const titleColor = 'text-white';
        const descColor = 'text-white-50';

        return `
        <div class="d6-item">
            <div class="d6-icon-box ${glowClass}">
                <i class="fas ${iconClass}"></i>
            </div>
            <div>
                <h6 class="m-0 fw-bold ${titleColor}">${issue.type}</h6>
                <p class="m-0 ${descColor} small">${issue.count} occurrences detected</p>
            </div>
        </div>
        `;
    }).join('');
}

function updateKeywordList(keywords) {
    const container = document.getElementById('keyword-list');
    if (!container) return; // Need to add this ID to HTML

    const topKeywords = keywords.slice(0, 5); // Show top 5

    container.innerHTML = topKeywords.map((kw, index) => `
        <div class="list-group-item p-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-3">
                <span class="fw-bold text-secondary">#${Math.round(kw.position)}</span>
                <div>
                    <div class="fw-bold text-dark">${kw.keys}</div>
                    <div class="small text-success"><i class="fas fa-check me-1"></i>CTR: ${(kw.ctr * 100).toFixed(1)}%</div>
                </div>
            </div>
            <span class="text-muted small">Clicks: ${kw.clicks}</span>
        </div>
    `).join('');
}

// Function to trigger manual audit (e.g. from a modal or button)
async function triggerPageAudit(url) {
    // Show loading state...
    try {
        const response = await fetch(SEO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auditPage', url: url })
        });
        const result = await response.json();
        showToast('Audit Complete! Score: ' + result.score, 'success');
        fetchDashboardStats(); // Refresh stats
        fetchRecentAudits(); // Refresh table
    } catch (error) {
        showToast('Audit Failed: ' + error.message, 'error');
    }
}

// --- Audit Modal Logic ---

function openAuditModal() {
    const modal = document.getElementById('auditModal');
    if (modal) modal.classList.add('show');
}

function closeAuditModal() {
    const modal = document.getElementById('auditModal');
    if (modal) modal.classList.remove('show');
}

function submitAudit() {
    const input = document.getElementById('auditUrlInput');
    const url = input ? input.value.trim() : '';

    if (!url) {
        alert('Please enter a valid URL.');
        return;
    }

    closeAuditModal();
    // Trigger the existing audit logic
    triggerPageAudit(url);
}

// Close modal when clicking outside
document.getElementById('auditModal')?.addEventListener('click', function (e) {
    if (e.target === this) {
        closeAuditModal();
    }
});

// --- Toast Notification Logic (Design 6) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    // Determine icon and classes based on type
    const isError = type === 'error';
    const iconClass = isError ? 'fa-times' : 'fa-check';
    const wrapperClass = isError ? 'toast-d6-error' : 'toast-d6-success';

    toast.innerHTML = `
        <div class="toast-d6 ${wrapperClass}">
            <div class="toast-d6-icon-circle"><i class="fas ${iconClass}"></i></div>
            <div class="toast-d6-text">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);

    // Allow manual dismiss logic if needed (clicking toast)
    toast.onclick = function () {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    };
}

// --- Issues Modal Logic (Design 2) ---
function showIssuesModal(issuesEncoded, score) {
    const issues = JSON.parse(decodeURIComponent(issuesEncoded));
    const modal = document.getElementById('issuesModal');
    const grid = document.getElementById('issuesGrid');
    const scoreEl = document.getElementById('issuesModalScore');

    if (modal && scoreEl) {
        scoreEl.innerText = `Score: ${score}/100`;
        scoreEl.className = `d2-score ${score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger'}`;
    }

    if (grid) {
        if (issues.length === 0) {
            grid.innerHTML = `
                <div class="d2-card" style="grid-column: 1 / -1; background:#f0fdf4; border-color:#bbf7d0;">
                    <i class="fas fa-check-circle text-success" style="font-size:2rem; margin-bottom:0.5rem;"></i>
                    <div class="d2-title text-success">No Issues Found</div>
                    <div class="small text-secondary">Great job! This page is fully optimized.</div>
                </div>
            `;
        } else {
            grid.innerHTML = issues.map(issue => `
                <div class="d2-card">
                    <i class="fas fa-exclamation-circle d2-icon"></i>
                    <div class="d2-title">${issue}</div>
                </div>
            `).join('');
        }
    }

    if (modal) modal.classList.add('show');
}

function closeIssuesModal() {
    const modal = document.getElementById('issuesModal');
    if (modal) modal.classList.remove('show');
}

// Close issues modal on outside click
document.getElementById('issuesModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeIssuesModal();
});
