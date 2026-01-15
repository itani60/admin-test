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

// Current Ticket State
let currentTicketId = null;
let ticketModal = null;

// Initialize Modal
document.addEventListener('DOMContentLoaded', () => {
    // Existing Init

    // Modal Init
    const el = document.getElementById('ticketManageModal');
    if (el) ticketModal = new bootstrap.Modal(el);

    // Bind Reply
    document.getElementById('btn-send-reply')?.addEventListener('click', sendAdminReply);
    document.getElementById('btn-resolve')?.addEventListener('click', () => updateTicketStatus('Resolved'));
    document.getElementById('btn-delete')?.addEventListener('click', deleteTicket);
});

// Update renderTickets to use viewTicket which maps to openTicketModal
window.viewTicket = openTicketModal;

// Open Modal
async function openTicketModal(id) {
    if (!ticketModal) {
        const el = document.getElementById('ticketManageModal');
        if (el) ticketModal = new bootstrap.Modal(el);
    }
    if (!ticketModal) return;

    currentTicketId = id;

    // Reset UI
    document.getElementById('modal-subject').innerText = 'Loading...';
    document.getElementById('modal-chat-container').innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></div>';

    // Reset inputs
    const replyArea = document.getElementById('reply-textarea');
    if (replyArea) replyArea.value = '';

    ticketModal.show();

    try {
        const token = localStorage.getItem('admin_token') || getCookie('adminsessionid');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({ action: 'getTicketDetails', ticketId: id })
        });

        const data = await response.json();
        const ticket = data.ticket || data; // Handle wrapper

        if (ticket && ticket.TicketID) {
            renderModalDetails(ticket);
            renderChat(ticket);
        } else {
            document.getElementById('modal-chat-container').innerHTML = '<div class="text-center text-danger">Failed to load ticket details.</div>';
        }

    } catch (e) {
        console.error('Error opening ticket:', e);
        document.getElementById('modal-chat-container').innerHTML = '<div class="text-center text-danger">Error loading ticket.</div>';
    }
}

// Render Header & Sidebar
function renderModalDetails(ticket) {
    // Header
    const statusBadge = document.getElementById('modal-status-badge');
    statusBadge.innerText = ticket.Status;
    statusBadge.className = 'badge px-3 py-2 rounded-2 fw-bold text-uppercase';

    if (ticket.Status === 'Pending') statusBadge.classList.add('bg-warning', 'text-dark');
    else if (ticket.Status === 'Resolved') statusBadge.classList.add('bg-success');
    else if (ticket.Status === 'Open') statusBadge.classList.add('bg-primary');
    else statusBadge.classList.add('bg-secondary');

    document.getElementById('modal-ticket-id').innerText = '#' + ticket.TicketID;
    document.getElementById('modal-ticket-date').innerText = new Date(ticket.Timestamp).toLocaleString();

    // Sidebar - Customer
    const customer = ticket.Customer || {};
    const name = customer.Name || 'Unknown';
    document.getElementById('modal-customer-name').innerText = name;
    document.getElementById('modal-customer-email').innerText = customer.Email || 'No Email';

    const avatarEl = document.getElementById('modal-customer-avatar');
    avatarEl.innerText = getInitials(name);

    // Sidebar - Details
    document.getElementById('modal-subject').innerText = ticket.Subject || '-';
    document.getElementById('modal-category').innerText = ticket.Category || '-';
    document.getElementById('modal-priority').innerText = ticket.Priority || 'Medium';
}

// Render Chat
function renderChat(ticket) {
    const container = document.getElementById('modal-chat-container');
    container.innerHTML = '';

    let messages = [];

    if (ticket.Messages && Array.isArray(ticket.Messages) && ticket.Messages.length > 0) {
        messages = ticket.Messages;
    } else if (ticket.History && Array.isArray(ticket.History)) {
        messages = ticket.History.map(h => ({
            Sender: h.Author === 'Customer' ? 'User' : 'Admin',
            Message: h.Message,
            Timestamp: h.Timestamp,
            Attachments: []
        }));
    }

    // Sort Chronologically
    messages.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

    messages.forEach(msg => {
        if (msg.Type === 'System') return;

        // Admin View: Sender 'Admin' is ME. Sender 'User' is THEM.
        // We'll rely on Role first.
        let isMe = false;

        if (msg.Role === 'Admin' || msg.Sender === 'Admin' || msg.Role === 'System') {
            isMe = true;
        } else {
            // If Role is User or Business, it is NOT me.
            isMe = false;
        }

        const div = document.createElement('div');
        div.className = `message-group ${isMe ? 'me' : ''}`;

        const avatar = isMe ? '<i class="fas fa-headset"></i>' : getInitials(ticket.Customer?.Name || 'User');
        const avatarClass = isMe ? 'bg-primary text-white' : 'bg-white border text-secondary';
        // Use the saved Sender name for Admins too, fallback to 'You' only if missing? 
        // User requesting: "Fetch display admin name". 
        // So we show msg.Sender. If it is 'Admin' or 'Support Agent', that is what shows. 
        // If it is 'Itani Rabs', that shows.
        const name = msg.Sender || (isMe ? 'Support Agent' : (ticket.Customer?.Name || 'User'));
        const time = new Date(msg.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Build Attachments HTML
        let attHtml = '';
        if (msg.Attachments && msg.Attachments.length > 0) {
            attHtml = '<div class="attachment-grid">';
            msg.Attachments.forEach(att => {
                const isImg = att.match(/\.(jpeg|jpg|png|gif|webp)$/i);
                const icon = isImg ? 'fa-image text-danger' : 'fa-file text-secondary';
                // Handle Full URL vs Relative Key
                const url = att.startsWith('http') ? att : `https://assets.comparehubprices.co.za/${att}`;

                attHtml += `
                    <a href="${url}" target="_blank" class="att-file text-decoration-none">
                        <i class="fas ${icon}"></i>
                        <span class="text-truncate" style="max-width:150px">${att.split('/').pop()}</span>
                    </a>
                `;
            });
            attHtml += '</div>';
        }

        div.innerHTML = `
            <div class="avatar d-flex align-items-center justify-content-center rounded-3 shadow-sm ${avatarClass}" style="width:40px;height:40px;">${avatar}</div>
            <div class="msg-bubble">
                <div class="msg-meta justify-content-${isMe ? 'end' : 'start'}">
                    <span>${name}</span> • <span>${time}</span>
                </div>
                <div class="msg-content text-break">${msg.Message}</div>
                ${attHtml}
            </div>
        `;
        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

// Send Reply
async function sendAdminReply() {
    const textarea = document.getElementById('reply-textarea');
    const message = textarea.value.trim();
    if (!message || !currentTicketId) return;

    const btn = document.getElementById('btn-send-reply');
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const token = localStorage.getItem('admin_token') || getCookie('adminsessionid');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const payload = {
            action: 'addReply',
            ticketId: currentTicketId,
            message: message,
            sender: 'Admin'
        };

        const response = await fetch(API_URL, {
            method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload)
        });

        if (response.ok) {
            textarea.value = '';
            // Refresh Chat
            await openTicketModal(currentTicketId);
        } else {
            console.error(await response.text());
            alert('Failed to send reply');
        }

    } catch (e) {
        console.error(e);
        alert('Error sending reply');
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
}

// Update Status (Resolve)
async function updateTicketStatus(status) {
    if (!currentTicketId) return;
    if (!confirm(`Mark ticket as ${status}?`)) return;

    try {
        const token = localStorage.getItem('admin_token') || getCookie('adminsessionid');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(API_URL, {
            method: 'POST', credentials: 'include', headers,
            body: JSON.stringify({ action: 'updateStatus', ticketId: currentTicketId, status: status })
        });

        if (response.ok) {
            openTicketModal(currentTicketId); // Refresh UI
            fetchTickets(token); // Refresh Background Table
            fetchStats(token);
        }
    } catch (e) { console.error(e); }
}

// Delete Ticket
async function deleteTicket() {
    alert('Delete functionality requires backend implementation.');
}

// Helper to get cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
