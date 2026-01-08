/**
 * Admin Monitor View - Wishlist Service
 * Handles data fetching and chart rendering for the service monitoring dashboard.
 */

document.addEventListener('DOMContentLoaded', function () {
    initDashboard();
});

// Configuration
const urlParams = new URLSearchParams(window.location.search);
const SERVICE_ID = urlParams.get('id') || 'wishlist-api-prod';
const API_BASE_URL = 'https://hub.comparehubprices.co.za/admin/monitor';

// Global Chart Instances
let mainChart = null;
let errorChart = null;

/**
 * Initialize the dashboard
 */
async function initDashboard() {
    // 1. Initial Data Fetch
    await Promise.all([
        fetchMetrics(),
        fetchLogs(),
        fetchChartData()
    ]);

    // 2. Set up polling (every 30 seconds)
    setInterval(() => {
        fetchMetrics();
        fetchLogs();
    }, 30000); // 30s polling
}

/**
 * Fetch Key Metrics (Latency, Requests, Ability, Errors)
 */
async function fetchMetrics() {
    try {
        const token = localStorage.getItem('id_token');
        const response = await fetch(`${API_BASE_URL}/metrics?service=${SERVICE_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        updateMetricCard('avgLatency', data.latency, 'ms', false);
        updateMetricCard('totalRequests', data.requests, 'k', true);
        updateMetricCard('availability', data.availability, '%', true);
        updateMetricCard('errorRate', data.errorRate, '%', false);

    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        // Fallback to '-' if fetch fails
        updateMetricCard('avgLatency', '-', '', false);
        updateMetricCard('totalRequests', '-', '', false);
        updateMetricCard('availability', '-', '', false);
        updateMetricCard('errorRate', '-', '', false);
    }
}

/**
 * Fetch Logs
 */
async function fetchLogs() {
    const tableBody = document.getElementById('logsTableBody');
    if (!tableBody) return;

    try {
        const token = localStorage.getItem('id_token');
        const response = await fetch(`${API_BASE_URL}/logs?service=${SERVICE_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const logs = await response.json();

        if (!logs || logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent logs found.</td></tr>';
            return;
        }

        tableBody.innerHTML = logs.map(log => `
            <tr>
                <td><span class="badge ${getStatusBadgeClass(log.status)}">${log.status}</span></td>
                <td><span class="badge-method badge-${log.method}">${log.method}</span></td>
                <td>${formatTime(log.timestamp)}</td>
                <td>${log.message}</td>
                <td class="text-muted small font-monospace">${log.requestId}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Failed to fetch logs:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load logs.</td></tr>';
    }
}

/**
 * Fetch Chart Data
 */
async function fetchChartData() {
    try {
        const token = localStorage.getItem('id_token');
        const response = await fetch(`${API_BASE_URL}/charts?service=${SERVICE_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.mainChart) renderMainChart(data.mainChart);
        if (data.errorChart) renderErrorChart(data.errorChart);

    } catch (error) {
        console.error('Failed to fetch chart data:', error);
    }
}

// --- Rendering Functions ---

function updateMetricCard(type, value, unit, isPositiveTrend) {
    const valueEl = document.getElementById(`${type}Value`);
    const changeEl = document.getElementById(`${type}Change`) || document.getElementById(`${type}Status`) || document.getElementById(`${type}Text`);

    if (valueEl) valueEl.textContent = `${value}${unit}`;

    // Update trend/status if applicable
    // Note: This matches the IDs added to the HTML
}

function renderMainChart(data) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Avg Latency (ms)',
                    data: data.latency,
                    borderColor: '#3b82f6',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Traffic (req/min)',
                    data: data.traffic,
                    borderColor: '#10b981',
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Latency (ms)' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Requests' } }
            }
        }
    });
}

function renderErrorChart(data) {
    const ctx = document.getElementById('errorChart');
    if (!ctx) return;

    if (errorChart) errorChart.destroy();

    errorChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6 } }
            }
        }
    });
}

// --- Helpers ---

function getStatusBadgeClass(status) {
    if (status >= 200 && status < 300) return 'bg-success bg-opacity-10 text-success';
    if (status >= 400 && status < 500) return 'bg-warning bg-opacity-10 text-warning';
    if (status >= 500) return 'bg-danger bg-opacity-10 text-danger';
    return 'bg-secondary bg-opacity-10 text-secondary';
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}


