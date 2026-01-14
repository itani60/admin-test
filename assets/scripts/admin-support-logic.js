const API_URL = 'https://hub.comparehubprices.co.za/admin/support-management';

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth - handled via Cookie primarily, but we add Header for robustness
    const token = localStorage.getItem('admin_session_token');

    await fetchStats(token);
    await fetchTickets(token);
    await fetchActiveAgents(token); // Fetch Active Agents count

    // Search Listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterTickets(term);
        });
    }
});

async function fetchActiveAgents(token) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Endpoint: /admin/users/activity-status
        const BASE = 'https://hub.comparehubprices.co.za/admin';
        const response = await fetch(`${BASE}/admin/users/activity-status`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            const activityMap = data.activity || {};

            const listContainer = document.getElementById('active-agents-list');
            const badgeEl = document.getElementById('active-agents-badge');

            // Count Online
            let onlineCount = 0;
            const entries = Object.entries(activityMap);

            // Sort: Online first
            entries.sort((a, b) => {
                const s1 = (typeof a[1] === 'object' ? a[1].status : a[1]) || 'Offline';
                const s2 = (typeof b[1] === 'object' ? b[1].status : b[1]) || 'Offline';
                if (s1 === 'Online' && s2 !== 'Online') return -1;
                if (s1 !== 'Online' && s2 === 'Online') return 1;
                return 0;
            });

            if (listContainer) listContainer.innerHTML = '';

            entries.forEach(([email, val]) => {
                const status = (typeof val === 'string') ? val : (val.status || 'Offline');
                if (status === 'Online') onlineCount++;

                // Styling
                let dotClass = 'bg-secondary';
                let textClass = 'text-secondary';
                if (status === 'Online') { dotClass = 'bg-success'; textClass = 'text-success'; }
                if (status === 'Away') { dotClass = 'bg-warning'; textClass = 'text-warning'; }

                const initials = email.substring(0, 2).toUpperCase();
                const displayName = email.split('@')[0];

                if (listContainer) {
                    const div = document.createElement('div');
                    div.className = 'd-flex align-items-center justify-content-between mb-3';
                    div.innerHTML = `
                        <div class="d-flex align-items-center gap-3">
                            <div class="position-relative">
                                <div class="avatar-small bg-light text-dark border">${initials}</div>
                                <span class="position-absolute bottom-0 end-0 ${dotClass} border border-white rounded-circle"
                                    style="width:10px;height:10px;"></span>
                            </div>
                            <div>
                                <div class="fw-bold text-dark text-truncate" style="max-width:130px;" title="${email}">${displayName}</div>
                                <div class="small text-muted" style="font-size:0.75rem">Support Agent</div>
                            </div>
                        </div>
                        <span class="badge bg-white ${textClass} border">${status}</span>
                    `;
                    listContainer.appendChild(div);
                }
            });

            if (listContainer && entries.length === 0) {
                listContainer.innerHTML = '<div class="text-center py-3 text-muted small">No active agents found.</div>';
            }

            updateStat('stat-active-agents', onlineCount);
            if (badgeEl) badgeEl.innerText = `${onlineCount} Online`;
        }
    } catch (e) {
        console.error('Error fetching active agents:', e);
    }
}

async function fetchStats(token) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({ action: 'getDashboardStats' })
        });

        if (response.status === 401 || response.status === 403) {
            console.warn('Access Denied. Please log in as Admin.');
            // Optional: Redirect or Alert
            return;
        }

        const data = await response.json();
        if (data.totalTickets !== undefined) {
            updateStat('stat-total-tickets', data.totalTickets);
            updateStat('stat-open-tickets', data.openTickets); // In backend this is now 'Pending' count
            updateStat('stat-resolved-today', data.resolvedToday);
            updateStat('stat-avg-response', data.avgResponseTime);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

let allTickets = [];

async function fetchTickets(token) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({ action: 'getTickets', status: 'All' })
        });

        const result = await response.json();
        if (result.tickets) {
            allTickets = result.tickets;
            renderTickets(allTickets);
        }
    } catch (e) {
        console.error('Error fetching tickets:', e);
    }
}

function renderTickets(tickets) {
    const tbody = document.getElementById('tickets-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No tickets found</td></tr>';
        return;
    }

    tickets.forEach(ticket => {
        // Priority Dot Color
        let pDot = 'priority-med'; // default
        if (ticket.Priority === 'High') pDot = 'priority-high';
        if (ticket.Priority === 'Low') pDot = 'priority-low';

        // Status Badge Color
        let sBadge = 'bg-secondary';
        if (ticket.Status === 'Open') sBadge = 'bg-primary text-white'; // Legacy
        if (ticket.Status === 'Pending') sBadge = 'bg-warning text-dark';
        if (ticket.Status === 'Resolved') sBadge = 'bg-success text-white';
        // Handle Urgent display
        // Handle Urgent display
        if (ticket.Status === 'Urgent') sBadge = 'bg-danger bg-opacity-10 text-danger';

        const tr = document.createElement('tr');
        tr.className = 'ticket-row';
        tr.innerHTML = `
            <td class="ps-4">
                <div class="fw-bold text-dark">${ticket.Subject}</div>
                <div class="small text-muted">#${ticket.TicketID} • ${ticket.Category}</div>
            </td>
            <td>
                <span class="badge bg-light text-dark border">
                    <i class="fas fa-${ticket.Type === 'Business' ? 'briefcase' : 'user'} me-1 text-${ticket.Type === 'Business' ? 'warning' : 'primary'}"></i>${ticket.Type}
                </span>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar-small">${getInitials(ticket.Customer.Name)}</div>
                    <div class="small fw-bold text-dark">${ticket.Customer.Name}</div>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center"><span class="priority-dot ${pDot}"></span>${ticket.Priority}</div>
            </td>
            <td><span class="badge ${sBadge} rounded-pill">${ticket.Status}</span></td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm btn-light text-dark border" onclick="viewTicket('${ticket.TicketID}')">Manage</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function filterTickets(term) {
    if (!term) {
        renderTickets(allTickets);
        return;
    }
    const filtered = allTickets.filter(t =>
        t.Subject.toLowerCase().includes(term) ||
        t.TicketID.toLowerCase().includes(term) ||
        t.Customer.Name.toLowerCase().includes(term)
    );
    renderTickets(filtered);
}

function viewTicket(id) {
    // For admin, we don't have a specific view file mentioned, but we can alert for now or send to user-support-view... 
    // actually, user-support-view is for USERS.
    // Use alert for now as Admin View isn't explicitly requested/defined, or I'll check if there is one.
    // The previous prompt mentioned "user-support-view.html" for "user", so I'll just log.
    alert('Managing ticket: ' + id);
}
