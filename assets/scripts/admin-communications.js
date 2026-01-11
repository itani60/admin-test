const ADMIN_API_BASE_URL = 'https://hub.comparehubprices.co.za/admin';

// Initialize on load
// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (window.adminAWSAuthService) {
        const auth = await window.adminAWSAuthService.getUserInfo();
        if (!auth.success || !window.adminAWSAuthService.hasPermission('canManageComms')) {
            window.location.href = 'index.html';
            return;
        }
    }
    console.log('Admin Communications loading...');
    loadCommunications();

    // Setup form listener if form exists
    const form = document.getElementById('announcementForm');
    if (form) {
        // Remove simple submit, handle via JS
    }
});

// Load communications list
async function loadCommunications() {
    try {
        const historyList = document.querySelector('.history-list');
        if (!historyList) return;

        historyList.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        const response = await fetch(`${ADMIN_API_BASE_URL}/get-communications`);
        if (!response.ok) throw new Error('Failed to fetch communications');

        const data = await response.json();

        if (!data.success || !data.communications || data.communications.length === 0) {
            historyList.innerHTML = '<div class="text-center py-3 text-muted">No communications found.</div>';
            return;
        }

        historyList.innerHTML = data.communications.map(renderCommunicationItem).join('');

    } catch (error) {
        console.error('Error loading communications:', error);
        const historyList = document.querySelector('.history-list');
        if (historyList) {
            historyList.innerHTML = '<div class="text-center py-3 text-danger"><i class="fas fa-exclamation-circle"></i> Failed to load communications.</div>';
        }
    }
}

// Render individual item
function renderCommunicationItem(comm) {
    const statusClass = comm.status === 'published' ? 'bg-success' : 'bg-secondary';
    const typeClass = getBadgeClass(comm.type);
    const date = new Date(comm.createdAt).toLocaleDateString();

    return `
        <div class="history-item" id="comm-${comm.id}">
            <div class="history-header">
                <div>
                    <span class="badge ${typeClass} me-2">${formatType(comm.type)}</span>
                    <span class="fw-bold">${comm.title}</span>
                </div>
                <div>
                    <span class="badge ${statusClass} me-2">${comm.status}</span>
                    <small class="text-muted text-nowrap">${date}</small>
                    <div class="dropdown d-inline-block ms-2">
                        <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                                <a class="dropdown-item text-danger" href="#" onclick="deleteCommunication('${comm.id}')">
                                    <i class="fas fa-trash-alt me-2"></i>Delete
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <p class="mb-1 text-muted small mt-2">${comm.message}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">
                    <i class="fas fa-users me-1"></i> ${comm.targetAudience}
                    ${comm.notificationsSent ? '<i class="fas fa-check-circle text-success ms-2" title="Notifications sent"></i>' : ''}
                </small>
                <small class="text-muted">
                    <i class="fas fa-eye me-1"></i> ${comm.views || 0} views
                </small>
            </div>
        </div>
    `;
}

// Handle Form Submission (Draft or Publish)
async function sendAnnouncement(status) {
    const title = document.getElementById('announcementTitle').value;
    const type = document.getElementById('announcementType').value;
    const message = document.getElementById('announcementMessage').value;
    const targetAudience = document.getElementById('targetAudience').value;
    const scheduledDate = document.getElementById('scheduledDate').value;

    if (!title || !message) {
        alert('Please fill in at least the Title and Message fields.');
        return;
    }

    const payload = {
        title,
        type,
        message,
        targetAudience,
        status,
        scheduledDate: scheduledDate || null
    };

    const btnDraft = document.querySelector('.btn-outline-secondary');
    const btnPublish = document.querySelector('.btn-primary');

    // Disable buttons
    if (btnDraft) btnDraft.disabled = true;
    if (btnPublish) btnPublish.disabled = true;

    try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/create-communication`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Reset form
            document.getElementById('announcementTitle').value = '';
            document.getElementById('announcementMessage').value = '';
            document.getElementById('scheduledDate').value = '';
            resetDropdowns();

            // Reload list
            loadCommunications();

            alert(`Announcement ${status === 'published' ? 'published' : 'saved as draft'} successfully!`);
        } else {
            throw new Error(result.message || 'Unknown error');
        }

    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Failed to save announcement: ' + error.message);
    } finally {
        // Re-enable buttons
        if (btnDraft) btnDraft.disabled = false;
        if (btnPublish) btnPublish.disabled = false;
    }
}

async function deleteCommunication(id) {
    if (!confirm('Are you sure you want to delete this communication? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${ADMIN_API_BASE_URL}/delete-communication?id=${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            // Remove from DOM strictly
            const item = document.getElementById(`comm-${id}`);
            if (item) item.remove();
        } else {
            alert('Failed to delete: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting communication');
    }
}


// Helpers
function getBadgeClass(type) {
    switch (type) {
        case 'info': return 'bg-info';
        case 'maintenance': return 'bg-warning text-dark';
        case 'update': return 'bg-primary';
        case 'warning': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function formatType(type) {
    switch (type) {
        case 'info': return 'General Info';
        case 'maintenance': return 'Maintenance';
        case 'update': return 'Update';
        case 'warning': return 'Warning';
        default: return type;
    }
}

function resetDropdowns() {
    // Reset custom dropdowns usage if needed, or just values
    document.getElementById('targetAudience').value = 'all';
    document.getElementById('audienceDropdownText').textContent = 'All Users';

    // Type is standard select now? Or custom? Currently standard in HTML.
    const typeSelect = document.getElementById('announcementType');
    if (typeSelect) typeSelect.value = 'info';
}
