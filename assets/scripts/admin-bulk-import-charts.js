// Configuration - API Base URL
const API_CONFIG = {
    BASE_URL: 'https://acc.comparehubprices.site/data',
    BATCH_CREATE_ENDPOINT: '/products/batch',
    CREATE_PRODUCT_ENDPOINT: '/products/single',
    BULK_IMPORT_SESSION_ENDPOINT: '/products/bulk-import-session',
};

// Declare TRACK_STATS_API in global scope
window.TRACK_STATS_API = 'https://hub.comparehubprices.co.za/admin/admin/track-import-stats';
const TRACK_STATS_API = window.TRACK_STATS_API;

let productsData = [];
let fileContent = null;
let selectedCategory = '';
let currentFileName = '';

// Chart instances
let importsOverTimeChart = null;
let importStatusChart = null;
let categoryChart = null;
let brandChart = null;
let importHistory = JSON.parse(localStorage.getItem('importHistory') || '[]');
let statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };

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
    
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Load saved API URL from localStorage
 */
function loadApiUrl() {
    const savedUrl = localStorage.getItem('comparehubprices_api_url');
    const defaultUrl = 'https://hub.comparehubprices.co.za/data';
    
    if (savedUrl) {
        API_CONFIG.BASE_URL = savedUrl;
        const apiUrlInput = document.getElementById('apiUrlInput');
        if (apiUrlInput) {
            apiUrlInput.value = savedUrl;
        }
        const apiConfigAlert = document.getElementById('apiConfigAlert');
        if (apiConfigAlert) {
            apiConfigAlert.style.display = 'none';
        }
    } else {
        API_CONFIG.BASE_URL = defaultUrl;
        const apiUrlInput = document.getElementById('apiUrlInput');
        if (apiUrlInput) {
            apiUrlInput.value = defaultUrl;
        }
        const apiConfigAlert = document.getElementById('apiConfigAlert');
        if (apiConfigAlert) {
            apiConfigAlert.style.display = 'none';
        }
    }
}

/**
 * Save API URL to localStorage
 */
function saveApiUrl() {
    const apiUrlInput = document.getElementById('apiUrlInput');
    if (!apiUrlInput) return;
    
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) {
        alert('Please enter a valid API URL');
        return;
    }
    
    const cleanUrl = apiUrl.replace(/\/$/, '');
    
    if (!cleanUrl.startsWith('https://')) {
        alert('Please enter a valid API URL (should start with https://)');
        return;
    }
    
    API_CONFIG.BASE_URL = cleanUrl;
    localStorage.setItem('comparehubprices_api_url', cleanUrl);
    const apiConfigAlert = document.getElementById('apiConfigAlert');
    if (apiConfigAlert) {
        apiConfigAlert.style.display = 'none';
    }
    
    if (typeof showAlert === 'function') {
        showAlert('API URL saved successfully!', 'success');
    } else {
        alert('API URL saved successfully!');
    }
}

/**
 * Initialize custom category dropdown
 */
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
        itemDiv.addEventListener('click', function() {
            categoryDropdownItems.querySelectorAll('.custom-dropdown-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');
            
            document.getElementById('categoryDropdownText').textContent = option.text;
            categorySelect.value = option.value;
            selectedCategory = option.value;
            
            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
            
            if (productsData.length > 0) {
                validateCategoryInProducts();
                saveBulkImportSession();
            }
        });
        categoryDropdownItems.appendChild(itemDiv);
    });
    
    categoryDropdownBtn.addEventListener('click', function(e) {
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
    
    document.addEventListener('click', function(e) {
        if (!categoryDropdown.contains(e.target)) {
            categoryDropdown.classList.remove('active');
            categoryDropdownMenu.style.display = 'none';
        }
    });
}

/**
 * Initialize file upload handlers
 */
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');

    fileInput.addEventListener('change', handleFileSelect);

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

    document.getElementById('fileNameText').textContent = file.name;
    document.getElementById('fileName').style.display = 'block';

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            fileContent = JSON.parse(e.target.result);
            
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

            const categorySelect = document.getElementById('categorySelect');
            selectedCategory = categorySelect.value;
            if (!selectedCategory) {
                showAlert('Please select a product category first', 'warning');
                return;
            }

            productsData = fileContent.products;
            currentFileName = file.name;
            
            validateCategoryInProducts();
            saveBulkImportSession();
            showPreview();
            updateCharts();
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

    const categorySelect = document.getElementById('categorySelect');
    selectedCategory = categorySelect.value;
    if (!selectedCategory) {
        showAlert('Please select a product category', 'warning');
        return;
    }

    productsData.forEach(product => {
        product.category = selectedCategory;
    });

    const productsWithErrors = productsData.filter(p => validateProduct(p).length > 0);
    if (productsWithErrors.length > 0) {
        const proceed = confirm(
            `${productsWithErrors.length} product(s) have validation errors. ` +
            `They may fail to import. Do you want to continue?`
        );
        if (!proceed) return;
    }

    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;

    const previewSection = document.getElementById('previewSection');
    const progressSection = document.getElementById('progressSection');
    previewSection.classList.remove('active');
    progressSection.classList.add('active');

    updateProgress(0, 'Sending products to server...');

    try {
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

        try {
            await recordImportStats(data);
        } catch (error) {
            console.warn('Error recording import stats:', error);
        }

        await clearBulkImportSession();

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
 * Record import statistics to Lambda
 */
async function recordImportStats(data) {
    try {
        const resultData = typeof data.body === 'string' ? JSON.parse(data.body) : data;
        const successful = resultData.results?.created || resultData.created || 0;
        const failed = resultData.results?.failed || resultData.failed || 0;
        const skipped = resultData.results?.skipped || 0;
        const total = productsData.length;
        
        const categories = {};
        const brands = {};
        
        productsData.forEach(product => {
            const category = product.category || 'Unknown';
            const brand = product.brand || 'Unknown';
            categories[category] = (categories[category] || 0) + 1;
            brands[brand] = (brands[brand] || 0) + 1;
        });
        
        const metadata = {
            successful,
            failed,
            skipped,
            total,
            category: selectedCategory || null,
            categories,
            brands
        };
        
        const response = await fetch(TRACK_STATS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ metadata })
        });
        
        if (!response.ok) {
            console.warn(`Stats API returned status ${response.status}`);
        } else {
            const result = await response.json();
            console.log('Import stats recorded:', result);
        }
    } catch (error) {
        console.warn('Error recording import stats:', error);
    }
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

    let resultData = data;
    if (typeof data.body === 'string') {
        try {
            resultData = JSON.parse(data.body);
        } catch (e) {
            console.error('Error parsing response body:', e);
        }
    }

    const total = resultData.results?.total || resultData.created || productsData.length;
    const created = resultData.results?.created || resultData.created || 0;
    const failed = resultData.results?.failed || resultData.failed || 0;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('successCount').textContent = created;
    document.getElementById('failedCount').textContent = failed;

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

    if (resultData.success !== false && created > 0) {
        showAlert(`Successfully imported ${created} product(s)!`, 'success');
    } else {
        showAlert(
            `Import completed with errors: ${created} created, ${failed} failed.`,
            failed === total ? 'danger' : 'warning'
        );
    }

    saveImportHistory(resultData);
    loadStats().then(() => updateCharts());
}

/**
 * Reset import form
 */
async function resetImport() {
    productsData = [];
    fileContent = null;
    selectedCategory = '';
    currentFileName = '';
    
    await clearBulkImportSession();
    
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').style.display = 'none';
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('progressSection').classList.remove('active');
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('importBtn').disabled = false;
    document.getElementById('alertContainer').innerHTML = '';
    
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.value = '';
    }
    
    updateCharts();
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
            credentials: 'omit',
            body: JSON.stringify({
                productsData: productsData,
                selectedCategory: selectedCategory,
                fileName: currentFileName
            })
        });

        if (response.ok) {
            console.log('Bulk import session saved successfully');
        } else {
            if (response.status === 400 || response.status === 404) {
                console.log('Session endpoint not available');
            } else {
                console.warn('Failed to save bulk import session:', response.status);
            }
        }
    } catch (error) {
        console.warn('Error saving bulk import session (non-critical):', error.message);
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
            credentials: 'omit'
        });

        if (!response.ok) {
            if (response.status === 400 || response.status === 404) {
                console.log('Session endpoint not available or no saved session');
            } else {
                console.log('No saved session found or error loading session');
            }
            return;
        }

        const result = await response.json();
        
        if (result.success && result.data && result.data.productsData && result.data.productsData.length > 0) {
            productsData = result.data.productsData;
            selectedCategory = result.data.selectedCategory || '';
            currentFileName = result.data.fileName || '';

            const categorySelect = document.getElementById('categorySelect');
            if (categorySelect && selectedCategory) {
                categorySelect.value = selectedCategory;
                const categoryDropdownText = document.getElementById('categoryDropdownText');
                if (categoryDropdownText) {
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
                    const selectedOption = categoryOptions.find(opt => opt.value === selectedCategory);
                    if (selectedOption) {
                        categoryDropdownText.textContent = selectedOption.text;
                    }
                }
            }

            if (currentFileName) {
                document.getElementById('fileNameText').textContent = currentFileName;
                document.getElementById('fileName').style.display = 'block';
            }

            showPreview();
            updateCharts();
            console.log(`Restored ${productsData.length} products from saved session`);
        }
    } catch (error) {
        console.warn('Error loading bulk import session (non-critical):', error.message);
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
            credentials: 'omit'
        });
    } catch (error) {
        console.warn('Error clearing bulk import session (non-critical):', error.message);
    }
}

/**
 * Check Login State
 */
async function checkLoginState() {
    try {
        if (window.adminAWSAuthService) {
            const result = await window.adminAWSAuthService.getUserInfo();
            
            if (result.success && result.user) {
                const user = result.user;
                const userAvatar = document.getElementById('userAvatar');
                const userName = document.getElementById('userName');
                
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

                if (userAvatar) {
                    userAvatar.textContent = initials;
                }
                
                if (userName) {
                    userName.textContent = displayName;
                }
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Error checking login state:', error);
    }
}

/**
 * Load stats from Lambda
 */
async function loadStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        const url = `${TRACK_STATS_API}?startDate=${startDate}&endDate=${today}`;
        console.log('Loading import stats from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
                statsData = data.stats;
                console.log('Import stats loaded successfully:', statsData);
                updateCharts();
            } else {
                console.warn('Stats API returned unsuccessful response:', data);
                statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };
                updateCharts();
            }
        } else {
            console.warn(`Stats API returned status ${response.status}`);
            statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };
            updateCharts();
        }
    } catch (error) {
        console.warn('Error loading import stats:', error);
        statsData = { successful: 0, failed: 0, skipped: 0, total: 0, byDate: {}, byCategory: {}, byBrand: {} };
        updateCharts();
    }
}

/**
 * Initialize Analytics Charts
 */
function initializeCharts() {
    const importsOverTimeCtx = document.getElementById('importsOverTimeChart');
    if (importsOverTimeCtx) {
        const timeData = calculateImportsOverTime();
        importsOverTimeChart = new Chart(importsOverTimeCtx, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Products Imported',
                    data: timeData.data,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
        
        importsOverTimeCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    const importStatusCtx = document.getElementById('importStatusChart');
    if (importStatusCtx) {
        const statusData = calculateImportStatus();
        importStatusChart = new Chart(importStatusCtx, {
            type: 'pie',
            data: {
                labels: statusData.labels,
                datasets: [{
                    data: statusData.data,
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(244, 63, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        'rgb(37, 99, 235)',
                        'rgb(244, 63, 94)',
                        'rgb(245, 158, 11)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
        
        importStatusCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const categoryData = calculateCategoryDistribution();
        categoryChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    label: 'Products',
                    data: categoryData.data,
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
        
        categoryCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    const brandCtx = document.getElementById('brandChart');
    if (brandCtx) {
        const brandData = calculateBrandDistribution();
        brandChart = new Chart(brandCtx, {
            type: 'doughnut',
            data: {
                labels: brandData.labels,
                datasets: [{
                    data: brandData.data,
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(6, 182, 212, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(244, 63, 94, 0.8)',
                        'rgba(100, 116, 139, 0.8)',
                        'rgba(23, 162, 184, 0.8)',
                        'rgba(255, 87, 34, 0.8)',
                        'rgba(156, 39, 176, 0.8)'
                    ],
                    borderColor: [
                        'rgb(37, 99, 235)',
                        'rgb(6, 182, 212)',
                        'rgb(245, 158, 11)',
                        'rgb(244, 63, 94)',
                        'rgb(100, 116, 139)',
                        'rgb(23, 162, 184)',
                        'rgb(255, 87, 34)',
                        'rgb(156, 39, 176)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove']
            }
        });
        
        brandCtx.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, { passive: false });
    }
}

/**
 * Calculate imports over time
 */
function calculateImportsOverTime() {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
    }
    
    const labels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    
    const data = last7Days.map(date => {
        if (statsData.byDate && statsData.byDate[date]) {
            return statsData.byDate[date].total || 0;
        }
        return importHistory.filter(importItem => {
            if (!importItem.date) return false;
            const importDate = new Date(importItem.date).toISOString().split('T')[0];
            return importDate === date;
        }).reduce((sum, item) => sum + (item.successful || 0), 0);
    });
    
    return { labels, data };
}

/**
 * Calculate import status distribution
 */
function calculateImportStatus() {
    const totalSuccessful = statsData.successful || 0;
    const totalFailed = statsData.failed || 0;
    const totalSkipped = statsData.skipped || 0;
    
    if (totalSuccessful === 0 && totalFailed === 0 && totalSkipped === 0) {
        const historySuccessful = importHistory.reduce((sum, item) => sum + (item.successful || 0), 0);
        const historyFailed = importHistory.reduce((sum, item) => sum + (item.failed || 0), 0);
        const historySkipped = importHistory.reduce((sum, item) => sum + (item.skipped || 0), 0);
        return {
            labels: ['Successful', 'Failed', 'Skipped'],
            data: [historySuccessful, historyFailed, historySkipped]
        };
    }
    
    return {
        labels: ['Successful', 'Failed', 'Skipped'],
        data: [totalSuccessful, totalFailed, totalSkipped]
    };
}

/**
 * Calculate category distribution
 */
function calculateCategoryDistribution() {
    if (statsData.byCategory && Object.keys(statsData.byCategory).length > 0) {
        const sorted = Object.entries(statsData.byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        return {
            labels: sorted.map(([cat]) => cat),
            data: sorted.map(([, count]) => count)
        };
    }
    
    if (typeof productsData === 'undefined' || !productsData || productsData.length === 0) {
        return { labels: ['No Data'], data: [0] };
    }
    
    const categories = {};
    productsData.forEach(product => {
        const category = product.category || 'Unknown';
        categories[category] = (categories[category] || 0) + 1;
    });
    
    const sorted = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    return {
        labels: sorted.length > 0 ? sorted.map(([cat]) => cat) : ['No Data'],
        data: sorted.length > 0 ? sorted.map(([, count]) => count) : [0]
    };
}

/**
 * Calculate brand distribution
 */
function calculateBrandDistribution() {
    if (statsData.byBrand && Object.keys(statsData.byBrand).length > 0) {
        const sorted = Object.entries(statsData.byBrand)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        return {
            labels: sorted.map(([brand]) => brand),
            data: sorted.map(([, count]) => count)
        };
    }
    
    if (typeof productsData === 'undefined' || !productsData || productsData.length === 0) {
        return { labels: ['No Data'], data: [0] };
    }
    
    const brands = {};
    productsData.forEach(product => {
        const brand = product.brand || 'Unknown';
        brands[brand] = (brands[brand] || 0) + 1;
    });
    
    const sorted = Object.entries(brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    return {
        labels: sorted.length > 0 ? sorted.map(([brand]) => brand) : ['No Data'],
        data: sorted.length > 0 ? sorted.map(([, count]) => count) : [0]
    };
}

/**
 * Save import history
 */
function saveImportHistory(data) {
    const importRecord = {
        date: new Date().toISOString(),
        successful: data.successful || data.created || 0,
        failed: data.failed || data.errors?.length || 0,
        skipped: data.skipped || 0,
        total: typeof productsData !== 'undefined' ? productsData.length : 0
    };
    
    importHistory.push(importRecord);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    importHistory = importHistory.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= thirtyDaysAgo;
    });
    
    localStorage.setItem('importHistory', JSON.stringify(importHistory));
}

/**
 * Update charts with real data
 */
function updateCharts() {
    if (importsOverTimeChart) {
        const timeData = calculateImportsOverTime();
        importsOverTimeChart.data.labels = timeData.labels;
        importsOverTimeChart.data.datasets[0].data = timeData.data;
        importsOverTimeChart.update();
    }

    if (importStatusChart) {
        const statusData = calculateImportStatus();
        importStatusChart.data.labels = statusData.labels;
        importStatusChart.data.datasets[0].data = statusData.data;
        importStatusChart.update();
    }

    if (categoryChart) {
        const categoryData = calculateCategoryDistribution();
        categoryChart.data.labels = categoryData.labels;
        categoryChart.data.datasets[0].data = categoryData.data;
        categoryChart.update();
    }

    if (brandChart) {
        const brandData = calculateBrandDistribution();
        brandChart.data.labels = brandData.labels;
        brandChart.data.datasets[0].data = brandData.data;
        brandChart.update();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    loadApiUrl();
    await checkLoginState();
    initializeCategoryDropdown();
    initFileUpload();
    initializeCharts();
    await loadStats();
    await loadBulkImportSession();
});

