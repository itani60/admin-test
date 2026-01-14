const API_URL = 'https://hub.comparehubprices.co.za/admin/support-management';

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth - handled via Cookie
    // const token = localStorage.getItem('admin_session_token');

    await fetchStats();
    await fetchTickets();

    // Search Listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            filterTickets(term);
        });
    }
});

async function fetchStats() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'getDashboardStats' })
        });

        const data = await response.json();
        if (data.totalTickets !== undefined) {
            updateStat('stat-total-tickets', data.totalTickets);
            updateStat('stat-open-tickets', data.openTickets);
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

async function fetchTickets() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
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
        if (ticket.Status === 'Open') sBadge = 'bg-warning text-dark';
        if (ticket.Status === 'Resolved') sBadge = 'bg-success text-white';
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
