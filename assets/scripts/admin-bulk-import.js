// Configuration - API Base URL
const API_CONFIG = {
    BASE_URL: 'https://hub.comparehubprices.co.za/data', // Custom API domain
    BATCH_CREATE_ENDPOINT: '/products/batch', // POST - Batch create products
    CREATE_PRODUCT_ENDPOINT: '/products/single', // POST - Single product creation
};

let productsData = [];
let fileContent = null;
let selectedCategory = '';

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();

    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    alertContainer.innerHTML = alertHTML;

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Initialize file upload handlers and category selection
 */
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');

    // Initialize custom category dropdown
    initializeCategoryDropdown();

    // Click to upload
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.endsWith('.json')) {
        showAlert('Please upload a JSON file', 'danger');
        return;
    }

    // Show file name
    document.getElementById('fileNameText').textContent = file.name;
    document.getElementById('fileName').style.display = 'block';

    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            fileContent = JSON.parse(e.target.result);

            // Validate structure
            if (!fileContent.products || !Array.isArray(fileContent.products)) {
                showAlert('Invalid JSON format. File must contain a "products" array.', 'danger');
                return;
            }

            if (fileContent.products.length === 0) {
                showAlert('Products array is empty', 'warning');
                return;
            }

            if (fileContent.products.length > 100) {
                showAlert(`Too many products (${fileContent.products.length}). Maximum is 100.`, 'danger');
                return;
            }

            // Check if category is selected
            const categorySelect = document.getElementById('categorySelect');
            selectedCategory = categorySelect ? categorySelect.value : '';
            if (!selectedCategory) {
                showAlert('Please select a product category first', 'warning');
                return;
            }

            productsData = fileContent.products;

            // Validate that all products have the correct category
            validateCategoryInProducts();

            showPreview();
            showAlert(`Loaded ${productsData.length} products successfully!`, 'success');
        } catch (error) {
            console.error('Error parsing JSON:', error);
            showAlert('Invalid JSON file. Please check the file format.', 'danger');
        }
    };
    reader.readAsText(file);
}

/**
 * Validate that all products have the selected category
 */
function validateCategoryInProducts() {
    if (!selectedCategory) return;

    const mismatched = productsData.filter(p => p.category !== selectedCategory);
    if (mismatched.length > 0) {
        showAlert(
            `Warning: ${mismatched.length} product(s) have different category. ` +
            `They will be updated to "${selectedCategory}" during import.`,
            'warning'
        );

        // Update categories to match selection
        productsData.forEach(product => {
            product.category = selectedCategory;
        });
    }
}

/**
 * Show preview of products
 */
function showPreview() {
    const previewSection = document.getElementById('previewSection');
    const previewContainer = document.getElementById('previewContainer');
    const productCount = document.getElementById('productCount');

    // Show the preview section
    previewSection.classList.add('active');

    previewContainer.innerHTML = '';
    productCount.textContent = productsData.length;

    productsData.forEach((product, index) => {
        const errors = validateProduct(product);
        const hasErrors = errors.length > 0;

        const previewItem = document.createElement('div');
        previewItem.className = `product-preview ${hasErrors ? 'error' : ''}`;
        previewItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${index + 1}. ${product.model || product.product_id || 'Unknown Product'}</strong>
                    <div class="mt-1">
                        <small class="text-muted">
                            ID: ${product.product_id || 'MISSING'} | 
                            Brand: ${product.brand || 'MISSING'} | 
                            Category: ${product.category || 'MISSING'}
                        </small>
                    </div>
                    ${hasErrors ? `
                        <div class="mt-2">
                            <small class="text-danger">
                                <i class="fas fa-exclamation-triangle"></i> Errors: ${errors.join(', ')}
                            </small>
                        </div>
                    ` : `
                        <div class="mt-2">
                            <small class="text-success">
                                <i class="fas fa-check-circle"></i> Valid
                            </small>
                        </div>
                    `}
                </div>
            </div>
        `;
        previewContainer.appendChild(previewItem);
    });

    previewSection.classList.add('active');
}

/**
 * Validate a single product
 */
function validateProduct(product) {
    const errors = [];

    if (!product.product_id || typeof product.product_id !== 'string') {
        errors.push('Missing product_id');
    }
    if (!product.category || typeof product.category !== 'string') {
        errors.push('Missing category');
    }
    if (!product.brand || typeof product.brand !== 'string') {
        errors.push('Missing brand');
    }
    if (!product.model || typeof product.model !== 'string') {
        errors.push('Missing model');
    }
    if (!product.description || typeof product.description !== 'string') {
        errors.push('Missing description');
    }
    if (!product.imageUrl || typeof product.imageUrl !== 'string') {
        errors.push('Missing imageUrl');
    }
    if (!product.color || typeof product.color !== 'string') {
        errors.push('Missing color');
    }
    if (!Array.isArray(product.offers)) {
        errors.push('Missing or invalid offers array');
    } else if (product.offers.length === 0) {
        errors.push('Offers array is empty');
    } else {
        product.offers.forEach((offer, index) => {
            if (!offer.retailer) errors.push(`Offer ${index + 1}: missing retailer`);
            if (typeof offer.price !== 'number') errors.push(`Offer ${index + 1}: invalid price`);
            if (!offer.url) errors.push(`Offer ${index + 1}: missing url`);
        });
    }
    if (!product.specs || typeof product.specs !== 'object') {
        errors.push('Missing or invalid specs');
    }

    return errors;
}

/**
 * Import products to database
 */
async function importProducts() {
    if (productsData.length === 0) {
        showAlert('No products to import', 'warning');
        return;
    }

    // Ensure category is selected
    const categorySelect = document.getElementById('categorySelect');
    selectedCategory = categorySelect ? categorySelect.value : '';
    if (!selectedCategory) {
        showAlert('Please select a product category', 'warning');
        return;
    }

    // Ensure all products have the correct category
    productsData.forEach(product => {
        product.category = selectedCategory;
    });

    // Check for validation errors
    const productsWithErrors = productsData.filter(p => validateProduct(p).length > 0);
    if (productsWithErrors.length > 0) {
        const proceed = confirm(
            `${productsWithErrors.length} product(s) have validation errors. ` +
            `They may fail to import. Do you want to continue?`
        );
        if (!proceed) return;
    }

    // Disable import button
    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;

    // Show progress
    const previewSection = document.getElementById('previewSection');
    const progressSection = document.getElementById('progressSection');
    previewSection.classList.remove('active');
    progressSection.classList.add('active');

    updateProgress(0, 'Sending products to server...');

    try {
        // Check if API URL is configured
        if (!API_CONFIG.BASE_URL || API_CONFIG.BASE_URL.includes('YOUR_API_ID')) {
            showAlert('Please configure your API URL in the settings above', 'danger');
            progressSection.classList.remove('active');
            importBtn.disabled = false;
            return;
        }

        const requestBody = {
            products: productsData
        };

        console.log('Sending batch create request:', {
            url: `${API_CONFIG.BASE_URL}${API_CONFIG.BATCH_CREATE_ENDPOINT}`,
            productCount: productsData.length
        });

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.BATCH_CREATE_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        updateProgress(50, 'Processing import...');

        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText || `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Batch create response:', data);

        updateProgress(100, 'Import complete!');

        // Show results
        setTimeout(() => {
            showResults(data);
        }, 1000);

    } catch (error) {
        console.error('Import error:', error);
        showAlert('Error importing products: ' + error.message, 'danger');
        progressSection.classList.remove('active');
        importBtn.disabled = false;
    }
}

/**
 * Update progress bar
 */
function updateProgress(percentage, text) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    progressBar.style.width = percentage + '%';
    progressBar.textContent = percentage + '%';
    progressText.textContent = text;
}

/**
 * Show import results
 */
function showResults(data) {
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    const errorContainer = document.getElementById('errorContainer');

    progressSection.classList.remove('active');
    resultsSection.classList.add('active');

    // Parse response - Lambda returns body as string, so we need to check
    let resultData = data;
    if (typeof data.body === 'string') {
        try {
            resultData = JSON.parse(data.body);
        } catch (e) {
            console.error('Error parsing response body:', e);
        }
    }

    // Update stats based on Lambda response format
    const total = resultData.results?.total || resultData.created || productsData.length;
    const created = resultData.results?.created || resultData.created || 0;
    const failed = resultData.results?.failed || resultData.failed || 0;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('successCount').textContent = created;
    document.getElementById('failedCount').textContent = failed;

    // Show errors if any
    const errors = resultData.results?.errors || resultData.errors || [];
    if (failed > 0 && errors.length > 0) {
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `
            <h5 class="text-danger mt-3">Errors:</h5>
            <div class="error-list">
                ${errors.map((err, idx) => `
                    <div class="error-item">
                        <strong>${err.batch ? `Batch ${err.batch}:` : `Error ${idx + 1}:`}</strong> 
                        ${err.error || err.message || JSON.stringify(err)}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        errorContainer.style.display = 'none';
    }

    // Show alert
    if (resultData.success !== false && created > 0) {
        showAlert(`Successfully imported ${created} product(s)!`, 'success');
    } else {
        showAlert(
            `Import completed with errors: ${created} created, ${failed} failed.`,
            failed === total ? 'danger' : 'warning'
        );
    }
}

/**
 * Reset import form
 */
function resetImport() {
    productsData = [];
    fileContent = null;

    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').style.display = 'none';
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('progressSection').classList.remove('active');
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('importBtn').disabled = false;
    document.getElementById('alertContainer').innerHTML = '';
}

// Initialize custom category dropdown
function initializeCategoryDropdown() {
    const categoryDropdown = document.getElementById('categoryDropdown');
    const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
    const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
    const categoryDropdownItems = document.getElementById('categoryDropdownItems');
    const categorySelect = document.getElementById('categorySelect');

    if (!categoryDropdown || !categoryDropdownBtn || !categoryDropdownMenu || !categoryDropdownItems) return;

    const categoryOptions = [
        { value: '', text: '-- Select Category --' },
        { value: 'smartphones', text: 'Smartphones' },
        { value: 'windows-laptops', text: 'Windows Laptops' },
        { value: 'macbooks-laptops', text: 'MacBooks Laptops' },
        { value: 'chromebooks-laptops', text: 'Chromebooks Laptops' },
        { value: 'tablets', text: 'Tablets' },
        { value: 'wearables', text: 'Wearables' },
        { value: 'televisions', text: 'Televisions' },
        { value: 'audio', text: 'Audio' },
        { value: 'gaming-consoles', text: 'Gaming Consoles' },
        { value: 'gaming-laptops', text: 'Gaming Laptops' },
        { value: 'gaming-monitors', text: 'Gaming Monitors' },
        { value: 'appliances', text: 'Appliances' }
    ];

    categoryOptions.forEach(option => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-dropdown-item';
        itemDiv.dataset.value = option.value;
        itemDiv.textContent = option.text;
        if (option.value === '') {
            itemDiv.classList.add('selected');
        }
        itemDiv.addEventListener('click', function () {
            categoryDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');

            document.getElementById('categoryDropdownText').textContent = option.text;
            categorySelect.value = option.value;
            selectedCategory = option.value;

            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';

            // Re-validate products with new category if products are loaded
            if (productsData.length > 0) {
                validateCategoryInProducts();
            }
        });
        categoryDropdownItems.appendChild(itemDiv);
    });

    categoryDropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isActive = categoryDropdown.classList.contains('active');

        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            if (dd.id !== 'categoryDropdown') {
                dd.classList.remove('active');
                const menu = dd.querySelector('.custom-dropdown-menu');
                if (menu) menu.style.display = 'none';
            }
        });

        if (isActive) {
            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
        } else {
            categoryDropdown.classList.add('active');
            categoryDropdownMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
    checkLoginState();
});

// Auth Check
let currentUserRole = 'viewer';

async function checkLoginState() {
    try {
        if (typeof window.adminAWSAuthService === 'undefined') {
            console.warn('Admin auth service not available');
            return;
        }

        const result = await window.adminAWSAuthService.getUserInfo();

        if (result.success && result.user) {
            const user = result.user;
            let displayName = '';
            let initials = '';

            if (user.givenName && user.familyName) {
                displayName = `${user.givenName} ${user.familyName}`;
                initials = `${user.givenName.charAt(0)}${user.familyName.charAt(0)}`.toUpperCase();
            } else if (user.givenName) {
                displayName = user.givenName;
                initials = user.givenName.substring(0, 2).toUpperCase();
            } else if (user.email) {
                const name = user.email.split('@')[0];
                displayName = name.charAt(0).toUpperCase() + name.slice(1);
                initials = name.substring(0, 2).toUpperCase();
            } else {
                displayName = 'Admin User';
                initials = 'AU';
            }

            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar) userAvatar.textContent = initials;
            const userName = document.getElementById('userName');
            if (userName) userName.textContent = displayName;

            // Update Role
            currentUserRole = user.role || 'viewer';
            const rawRole = (user.role || 'viewer').replace('_', ' ');
            const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
            const roleHeader = document.getElementById('userRoleHeader');
            if (roleHeader) roleHeader.textContent = roleDisplay;

            const ddName = document.getElementById('dropdownUserName');
            if (ddName) ddName.textContent = displayName;
            const ddEmail = document.getElementById('dropdownUserEmail');
            if (ddEmail) ddEmail.textContent = user.email || '';

            // RBAC Logic
            if (currentUserRole === 'viewer') {
                const uploadSection = document.querySelector('.upload-section');
                if (uploadSection) {
                    uploadSection.innerHTML = '<div class="alert alert-warning">You do not have permission to import products.</div>';
                }
                const exampleSection = document.querySelector('.example-section');
                if (exampleSection) exampleSection.style.display = 'none';
            }

        } else {
            window.location.href = 'admin-login.html';
        }
    } catch (error) {
        console.error('Error checking login state:', error);
        window.location.href = 'admin-login.html';
    }
}

