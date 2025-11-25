// Configuration - API Base URL
const API_CONFIG = {
    BASE_URL: 'https://acc.comparehubprices.site/data', // Custom API domain
    BATCH_CREATE_ENDPOINT: '/products/batch', // POST - Batch create products
    CREATE_PRODUCT_ENDPOINT: '/products/single', // POST - Single product creation
    BULK_IMPORT_SESSION_ENDPOINT: '/products/bulk-import-session', // GET/POST - Save/load session
};

let productsData = [];
let fileContent = null;
let selectedCategory = '';
let currentFileName = '';

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
    const categorySelect = document.getElementById('categorySelect');

    // Category selection handler
    categorySelect.addEventListener('change', (e) => {
        selectedCategory = e.target.value;
        if (productsData.length > 0) {
            // Re-validate products with new category
            validateCategoryInProducts();
            // Save session when category changes
            saveBulkImportSession();
        }
    });

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
            selectedCategory = categorySelect.value;
            if (!selectedCategory) {
                showAlert('Please select a product category first', 'warning');
                return;
            }

            productsData = fileContent.products;
            currentFileName = file.name;
            
            // Validate that all products have the correct category
            validateCategoryInProducts();
            
            // Save session data
            saveBulkImportSession();
            
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
    selectedCategory = categorySelect.value;
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

        // Clear session after successful import
        await clearBulkImportSession();

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
async function resetImport() {
    productsData = [];
    fileContent = null;
    selectedCategory = '';
    currentFileName = '';
    
    // Clear session from server
    await clearBulkImportSession();
    
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').style.display = 'none';
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('progressSection').classList.remove('active');
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('importBtn').disabled = false;
    document.getElementById('alertContainer').innerHTML = '';
    
    // Reset category select
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = '';
    }
}

/**
 * Save bulk import session to server
 */
async function saveBulkImportSession() {
    if (productsData.length === 0) return;

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.BULK_IMPORT_SESSION_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                productsData: productsData,
                selectedCategory: selectedCategory,
                fileName: currentFileName
            })
        });

        if (response.ok) {
            console.log('Bulk import session saved successfully');
        } else {
            console.warn('Failed to save bulk import session:', response.status);
        }
    } catch (error) {
        console.error('Error saving bulk import session:', error);
        // Don't show error to user - this is a background operation
    }
}

/**
 * Load bulk import session from server
 */
async function loadBulkImportSession() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.BULK_IMPORT_SESSION_ENDPOINT}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.log('No saved session found or error loading session');
            return;
        }

        const result = await response.json();
        
        if (result.success && result.data && result.data.productsData && result.data.productsData.length > 0) {
            // Restore session data
            productsData = result.data.productsData;
            selectedCategory = result.data.selectedCategory || '';
            currentFileName = result.data.fileName || '';

            // Restore UI state
            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect && selectedCategory) {
                categorySelect.value = selectedCategory;
            }

            // Show file name if available
            if (currentFileName) {
                document.getElementById('fileNameText').textContent = currentFileName;
                document.getElementById('fileName').style.display = 'block';
            }

            // Show preview
            showPreview();
            
            console.log(`Restored ${productsData.length} products from saved session`);
        }
    } catch (error) {
        console.error('Error loading bulk import session:', error);
        // Don't show error to user - just continue without restored data
    }
}

/**
 * Clear bulk import session from server
 */
async function clearBulkImportSession() {
    try {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.BULK_IMPORT_SESSION_ENDPOINT}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error clearing bulk import session:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initFileUpload();
    // Load saved session data
    loadBulkImportSession();
});

