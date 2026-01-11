// TODO: Update this URL after deployment
const API_BASE_URL = 'https://hub.comparehubprices.co.za/admin';

// State
let currentUser = null;

// Initialize Page
document.addEventListener('DOMContentLoaded', initRBAC);

// 1. Authentication Check & User UI
// 1. Authentication Check & User UI
async function initRBAC() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.error('adminAWSAuthService is not defined');
            window.location.href = 'admin-login.html';
            return;
        }

        const result = await window.adminAWSAuthService.getUserInfo();

        if (result.success && window.adminAWSAuthService.hasPermission('canManageAccessControl')) {
            currentUser = result.user;
            // Update Page Specific UI (Invite Card visibility)
            updatePageSpecificUI(currentUser);

            // Start Fetching Data
            fetchUsers();

            // Setup Listeners if needed
            setupEventListeners();
        } else {
            console.warn('User not authorized, redirecting...');
            if (result.success) window.location.href = 'index.html';
            else window.location.href = 'admin-login.html';
        }
    } catch (err) {
        console.error('Auth Check Failed:', err);
        window.location.href = 'admin-login.html';
    }
}

function updatePageSpecificUI(user) {
    // Show Invite Section for Super Admin Only
    if (user.role === 'super_admin') {
        const inviteCard = document.getElementById('inviteAdminCard');
        if (inviteCard) inviteCard.style.display = 'block';
    }
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// 2. Fetch & Render Users
// 2. Fetch & Render Users
async function fetchUsers() {
    const tbody = document.getElementById('teamTableBody');
    if (!tbody) return;

    try {
        const headers = { 'Content-Type': 'application/json' };

        // Fetch Users and Activity Status in parallel
        // Assuming /users/activity-status endpoint maps to our new Lambda
        const [usersRes, activityRes] = await Promise.all([
            fetch(`${API_BASE_URL}/users`, { method: 'GET', headers, credentials: 'include' }),
            fetch(`${API_BASE_URL}/users/activity-status`, { method: 'GET', headers, credentials: 'include' })
        ]);

        if (!usersRes.ok) throw new Error('Failed to fetch users');

        const userData = await usersRes.json();
        let activityMap = {};

        if (activityRes.ok) {
            try {
                const activityData = await activityRes.json();
                if (activityData.success) {
                    activityMap = activityData.activity || {};
                }
            } catch (e) {
                console.warn('Failed to parse activity status', e);
            }
        } else {
            console.warn('Activity status endpoint failed', activityRes.status);
        }

        // Merge Activity Status
        const users = (userData.users || []).map(user => ({
            ...user,
            activityStatus: activityMap[user.email] || (user.activityStatus || 'Offline') // Fallback to existing or Offline
        }));

        renderUsers(users);

    } catch (error) {
        console.error('Fetch Users Error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-warning"><i class="fas fa-exclamation-triangle me-2"></i>API connection failed. Please check configuration.</td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger"><i class="fas fa-times-circle me-2"></i>Error loading users.</td></tr>`;
        }
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('teamTableBody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No users found.</td></tr>`;
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        const initials = getInitials(user.name || 'User');
        const badgeClass = getRoleBadgeClass(user.role);
        const date = new Date(user.createdAt || Date.now()).toLocaleDateString();

        // Calculate Status based on Activity API
        const isOnline = (user.activityStatus === 'Online');

        let statusBadge;
        if (user.status !== 'active') {
            statusBadge = `<span class="badge bg-danger-subtle text-danger rounded-pill px-3">Suspended</span>`;
        } else if (isOnline) {
            statusBadge = `<span class="badge bg-success-subtle text-success rounded-pill px-3"><i class="fas fa-circle me-1" style="font-size:6px"></i> Online</span>`;
        } else {
            statusBadge = `<span class="badge bg-secondary-subtle text-secondary rounded-pill px-3">Offline</span>`;
        }

        // Actions: Disable delete for self or Super Admin
        const isSelf = currentUser && currentUser.email === user.email;
        const canDelete = !isSelf;

        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                    <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: ${stringToColor(user.email || 'U')}">${initials}</div>
                    <div>
                        <div class="fw-bold text-dark">${user.name}</div>
                        <div class="text-muted small">${user.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge rounded-pill px-3 ${badgeClass}">${formatRole(user.role)}</span></td>
            <td>${statusBadge}</td>
            <td class="text-muted small">${date}</td>
            <td class="text-muted small">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
            <td class="text-end pe-4">
                 ${canDelete ? `
                    <button class="btn btn-sm btn-light text-primary me-1" onclick="renewUser('${user.email}')" title="Renew Access">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-danger" onclick="deleteUser('${user.email}')" title="Remove User">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                 ` : `
                    <button class="btn btn-sm btn-light text-muted" disabled>
                        <i class="fas fa-ban"></i>
                    </button>
                 `}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Handle Invite
// 3. Handle Invite
async function handleInvite(e) {
    e.preventDefault();
    const form = e.target;
    // Updated Selectors for Design 3 Form
    const email = document.getElementById('inviteEmail').value;
    const name = document.getElementById('inviteName').value;
    const roleInput = form.querySelector('input[name="role"]:checked');
    const role = roleInput ? roleInput.value : 'viewer';

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    if (!email || !name) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending...';

        const response = await fetch(`${API_BASE_URL}/users/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, role }),
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Invitation failed');

        showAlert(`Invitation sent successfully to <strong>${email}</strong> as ${role}`, 'success');
        form.reset();

        // Reset Visual Selection
        document.querySelectorAll('.role-select-card').forEach(c => c.classList.remove('border-primary', 'bg-primary-subtle'));
        const defaultRole = document.querySelector('input[value="editor"]').closest('.role-select-card');
        if (defaultRole) {
            defaultRole.classList.add('border-primary', 'bg-primary-subtle');
            defaultRole.querySelector('input').checked = true;
        }

        fetchUsers(); // Refresh list

    } catch (error) {
        console.error('Invite Error:', error);
        showAlert(error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

window.selectRoleCard = function (el) {
    document.querySelectorAll('.role-select-card').forEach(c => c.classList.remove('border-primary', 'bg-primary-subtle'));
    el.classList.add('border-primary', 'bg-primary-subtle');
    const input = el.querySelector('input[type="radio"]');
    if (input) input.checked = true;
};
// Listeners for form
function setupEventListeners() {
    const inviteForm = document.getElementById('inviteAdminForm');
    if (inviteForm) {
        inviteForm.addEventListener('submit', handleInvite);
    }
}


// 4. Handle Delete & Renew
async function deleteUser(email) {
    const confirmed = await showConfirm(`Are you sure you want to remove ${email}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to remove user');

        showAlert(`User removed successfully.`, 'success');
        fetchUsers(); // Refresh list

    } catch (error) {
        console.error('Delete Error:', error);
        showAlert('Failed to remove user. Please try again.', 'danger');
    }
}
window.deleteUser = deleteUser;

async function renewUser(email) {
    const confirmed = await showConfirm(`Are you sure you want to renew access for ${email}?`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(email)}/renew`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to renew user access');

        showAlert(`User access renewed successfully.`, 'success');
        fetchUsers();

    } catch (error) {
        console.error('Renew Error:', error);
        showAlert('Failed to renew user access. Please try again.', 'danger');
    }
}
window.renewUser = renewUser;

// Utils
function getRoleBadgeClass(role) {
    switch (role) {
        case 'super_admin': return 'role-super';
        case 'manager': return 'bg-warning text-dark';
        case 'editor': return 'role-editor';
        case 'moderator': return 'bg-primary text-white';
        case 'analyst': return 'bg-info text-dark';
        case 'support': return 'bg-success text-white';
        case 'viewer': return 'role-viewer';
        default: return 'bg-secondary text-white';
    }
}

function formatRole(role) {
    if (!role) return 'Unknown';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getStatusHtml(status) {
    if (status === 'active') return '<span class="status-dot status-active"></span>Active';
    if (status === 'invited') return '<span class="status-dot status-pending"></span>Invited';
    if (status === 'suspended') return '<span class="status-dot bg-danger"></span>Suspended';
    return '<span class="status-dot bg-secondary"></span>Unknown';
}

function showAlert(msg, type) {
    const container = document.getElementById('alertContainer');
    if (!container) return;

    const html = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' : '<i class="fas fa-exclamation-circle me-2"></i>'}
            ${msg}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.innerHTML = html;
}

// Custom Dropdown Logic
function toggleRoleDropdown() {
    const dropdown = document.getElementById('roleDropdown');
    dropdown.classList.toggle('active');
}
window.toggleRoleDropdown = toggleRoleDropdown;

function selectRole(value, text) {
    document.getElementById('roleInput').value = value;
    document.getElementById('roleText').textContent = text;

    // Update UI selection state
    const items = document.querySelectorAll('.custom-dropdown-item');
    items.forEach(item => {
        if (item.textContent === text) item.classList.add('selected');
        else item.classList.remove('selected');
    });

    document.getElementById('roleDropdown').classList.remove('active');
}
window.selectRole = selectRole;

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('roleDropdown');

    // Also handle click outside for custom dropdown if not closed by selection
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Custom Confirmation Modal Logic
let confirmResolve = null;

function showConfirm(msg) {
    document.getElementById('confirmMessage').textContent = msg;
    document.getElementById('confirmModal').classList.add('active');
    return new Promise((resolve) => {
        confirmResolve = resolve;
    });
}
window.showConfirm = showConfirm; // Though it's async so window property is just the function

function closeConfirmModal(result) {
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
}
window.closeConfirmModal = closeConfirmModal;
