const SEO_API_URL = 'https://hub.comparehubprices.co.za/admin/manage-seo';

document.addEventListener('DOMContentLoaded', () => {
    initSeoDashboard();
});

async function initSeoDashboard() {
    console.log('Initializing SEO Dashboard...');
    try {
        await Promise.all([
            fetchDashboardStats(),
            fetchSearchConsoleData()
        ]);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
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
        updateStatCard('overall-score', data.overallScore + '%', data.overallScore);
        updateStatCard('indexed-pages', data.indexedPages, 75); // Mock progress for count
        updateStatCard('crawl-errors', data.crawlErrors, 20); // Mock progress for count
        updateStatCard('load-speed', data.avgLoadSpeed + 's', 90);

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
        container.innerHTML = '<div class="text-center text-secondary py-3">No critical issues found!</div>';
        return;
    }

    container.innerHTML = issues.map(issue => `
        <div class="d-flex gap-3 mb-3">
            <div class="bg-${issue.severity === 'High' ? 'danger' : 'warning'} bg-opacity-25 p-2 rounded text-${issue.severity === 'High' ? 'danger' : 'warning'}">
                <i class="fas fa-${issue.severity === 'High' ? 'times' : 'exclamation'}"></i>
            </div>
            <div>
                <div class="fw-bold">${issue.type}</div>
                <div class="small text-secondary">${issue.count} occurrences detected</div>
            </div>
        </div>
    `).join('');
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
        alert('Audit Complete! Score: ' + result.score);
        fetchDashboardStats(); // Refresh stats
    } catch (error) {
        alert('Audit Failed: ' + error.message);
    }
}
