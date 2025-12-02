/**
 * نظام إدارة المخزون - QR
 * Inventory Management System with QR Code Support
 * 
 * Features:
 * - Product Management
 * - Category Management
 * - Stock In/Out with QR Scanning
 * - Local Storage Persistence
 * - Data Export/Import
 */

// ============================================
// Data Store
// ============================================
const DataStore = {
    KEYS: {
        CATEGORIES: 'stock_qr_categories',
        PRODUCTS: 'stock_qr_products',
        TRANSACTIONS: 'stock_qr_transactions',
        SETTINGS: 'stock_qr_settings'
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    },

    // Get data from localStorage
    getData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading data:', e);
            return [];
        }
    },

    // Save data to localStorage
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    },

    // Categories
    getCategories() {
        return this.getData(this.KEYS.CATEGORIES);
    },

    saveCategory(category) {
        const categories = this.getCategories();
        if (category.id) {
            const index = categories.findIndex(c => c.id === category.id);
            if (index !== -1) {
                categories[index] = { ...categories[index], ...category };
            }
        } else {
            category.id = this.generateId();
            category.createdAt = new Date().toISOString();
            categories.push(category);
        }
        this.saveData(this.KEYS.CATEGORIES, categories);
        return category;
    },

    deleteCategory(id) {
        const categories = this.getCategories().filter(c => c.id !== id);
        this.saveData(this.KEYS.CATEGORIES, categories);
    },

    // Products
    getProducts() {
        return this.getData(this.KEYS.PRODUCTS);
    },

    getProductById(id) {
        return this.getProducts().find(p => p.id === id);
    },

    getProductByQRCode(qrCode) {
        return this.getProducts().find(p => p.qrCode === qrCode);
    },

    saveProduct(product) {
        const products = this.getProducts();
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                products[index] = { ...products[index], ...product };
            }
        } else {
            product.id = this.generateId();
            product.qrCode = 'PRD-' + product.id;
            product.stock = 0;
            product.totalIn = 0;
            product.totalOut = 0;
            product.createdAt = new Date().toISOString();
            products.push(product);
        }
        this.saveData(this.KEYS.PRODUCTS, products);
        return product;
    },

    updateProductStock(productId, quantity, type) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            if (type === 'in') {
                products[index].stock += quantity;
                products[index].totalIn += quantity;
            } else if (type === 'out') {
                products[index].stock -= quantity;
                products[index].totalOut += quantity;
            }
            products[index].updatedAt = new Date().toISOString();
            this.saveData(this.KEYS.PRODUCTS, products);
            return products[index];
        }
        return null;
    },

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        this.saveData(this.KEYS.PRODUCTS, products);
    },

    // Transactions
    getTransactions() {
        return this.getData(this.KEYS.TRANSACTIONS);
    },

    addTransaction(transaction) {
        const transactions = this.getTransactions();
        transaction.id = this.generateId();
        transaction.timestamp = new Date().toISOString();
        transactions.unshift(transaction); // Add to beginning
        // Keep only last 1000 transactions
        if (transactions.length > 1000) {
            transactions.pop();
        }
        this.saveData(this.KEYS.TRANSACTIONS, transactions);
        return transaction;
    },

    // Export all data
    exportAllData() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            categories: this.getCategories(),
            products: this.getProducts(),
            transactions: this.getTransactions()
        };
    },

    // Import all data
    importAllData(data) {
        if (data.categories) {
            this.saveData(this.KEYS.CATEGORIES, data.categories);
        }
        if (data.products) {
            this.saveData(this.KEYS.PRODUCTS, data.products);
        }
        if (data.transactions) {
            this.saveData(this.KEYS.TRANSACTIONS, data.transactions);
        }
        return true;
    },

    // Clear all data
    clearAllData() {
        localStorage.removeItem(this.KEYS.CATEGORIES);
        localStorage.removeItem(this.KEYS.PRODUCTS);
        localStorage.removeItem(this.KEYS.TRANSACTIONS);
        localStorage.removeItem(this.KEYS.SETTINGS);
    }
};

// ============================================
// UI Controller
// ============================================
const UI = {
    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format number
    formatNumber(num) {
        return new Intl.NumberFormat('ar-SA').format(num);
    },

    // Populate category dropdowns
    populateCategoryDropdowns() {
        const categories = DataStore.getCategories();
        const selects = ['product-category', 'filter-category'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                const firstOption = select.querySelector('option:first-child');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }
                
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            }
        });
    },

    // Populate product dropdowns
    populateProductDropdowns() {
        const products = DataStore.getProducts();
        const selects = ['stock-in-product', 'stock-out-product'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">اختر المنتج</option>';
                
                products.forEach(prod => {
                    const option = document.createElement('option');
                    option.value = prod.id;
                    const category = DataStore.getCategories().find(c => c.id === prod.categoryId);
                    option.textContent = `${prod.name} (${category ? category.name : 'غير مصنف'}) - المخزون: ${prod.stock}`;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            }
        });
    },

    // Render categories list
    renderCategories() {
        const categories = DataStore.getCategories();
        const container = document.getElementById('categories-list');
        
        if (categories.length === 0) {
            container.innerHTML = '<p class="empty-message">لا توجد أصناف. أضف صنفك الأول!</p>';
            return;
        }
        
        container.innerHTML = categories.map(cat => {
            const productCount = DataStore.getProducts().filter(p => p.categoryId === cat.id).length;
            return `
                <div class="category-item" data-id="${cat.id}">
                    <div class="item-info">
                        <div class="item-name">📁 ${cat.name}</div>
                        <div class="item-details">${cat.description || 'بدون وصف'} • ${productCount} منتج</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-small btn-primary edit-category" data-id="${cat.id}">✏️ تعديل</button>
                        <button class="btn btn-small btn-danger delete-category" data-id="${cat.id}">🗑️ حذف</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Render products list
    renderProducts(filter = {}) {
        let products = DataStore.getProducts();
        
        // Apply search filter
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            products = products.filter(p => 
                p.name.toLowerCase().includes(searchLower) ||
                (p.barcode && p.barcode.toLowerCase().includes(searchLower))
            );
        }
        
        // Apply category filter
        if (filter.categoryId) {
            products = products.filter(p => p.categoryId === filter.categoryId);
        }
        
        const container = document.getElementById('products-list');
        
        if (products.length === 0) {
            container.innerHTML = '<p class="empty-message">لا توجد منتجات مطابقة</p>';
            return;
        }
        
        container.innerHTML = products.map(prod => {
            const category = DataStore.getCategories().find(c => c.id === prod.categoryId);
            const isLowStock = prod.stock <= (prod.minStock || 10);
            return `
                <div class="product-item ${isLowStock ? 'low-stock' : ''}" data-id="${prod.id}">
                    <div class="item-info">
                        <div class="item-name">📦 ${prod.name}</div>
                        <div class="item-details">
                            ${category ? category.name : 'غير مصنف'} 
                            ${prod.barcode ? '• ' + prod.barcode : ''} 
                            ${prod.price ? '• ' + UI.formatNumber(prod.price) + ' ر.س' : ''}
                        </div>
                    </div>
                    <div class="item-stock">
                        <span class="stock-value">${UI.formatNumber(prod.stock)}</span>
                        <span class="stock-label">المخزون</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-small btn-secondary show-qr" data-id="${prod.id}">📱 QR</button>
                        <button class="btn btn-small btn-primary edit-product" data-id="${prod.id}">✏️</button>
                        <button class="btn btn-small btn-danger delete-product" data-id="${prod.id}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Render transactions list
    renderTransactions(type = 'all', limit = 20) {
        let transactions = DataStore.getTransactions();
        
        if (type === 'in') {
            transactions = transactions.filter(t => t.type === 'in');
        } else if (type === 'out') {
            transactions = transactions.filter(t => t.type === 'out');
        }
        
        transactions = transactions.slice(0, limit);
        
        const containerId = type === 'in' ? 'stock-in-history' : 
                           type === 'out' ? 'stock-out-history' : 
                           'recent-transactions';
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-message">لا توجد عمليات</p>';
            return;
        }
        
        container.innerHTML = transactions.map(trans => {
            const product = DataStore.getProductById(trans.productId);
            return `
                <div class="transaction-item ${trans.type === 'in' ? 'stock-in' : 'stock-out'}">
                    <div class="item-info">
                        <div class="item-name">${product ? product.name : 'منتج محذوف'}</div>
                        <div class="item-details">${UI.formatDate(trans.timestamp)} ${trans.notes ? '• ' + trans.notes : ''}</div>
                    </div>
                    <span class="transaction-type ${trans.type}">${trans.type === 'in' ? '📥 +' : '📤 -'}${trans.quantity}</span>
                </div>
            `;
        }).join('');
    },

    // Render low stock products
    renderLowStock() {
        const products = DataStore.getProducts().filter(p => p.stock <= (p.minStock || 10));
        const container = document.getElementById('low-stock-list');
        
        if (products.length === 0) {
            container.innerHTML = '<p class="empty-message">✅ لا توجد منتجات منخفضة المخزون</p>';
            return;
        }
        
        container.innerHTML = products.map(prod => {
            const category = DataStore.getCategories().find(c => c.id === prod.categoryId);
            return `
                <div class="product-item low-stock">
                    <div class="item-info">
                        <div class="item-name">⚠️ ${prod.name}</div>
                        <div class="item-details">${category ? category.name : 'غير مصنف'}</div>
                    </div>
                    <div class="item-stock">
                        <span class="stock-value">${UI.formatNumber(prod.stock)}</span>
                        <span class="stock-label">المخزون</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Update dashboard stats
    updateDashboard() {
        const products = DataStore.getProducts();
        const categories = DataStore.getCategories();
        
        let totalStockIn = 0;
        let totalStockOut = 0;
        products.forEach(p => {
            totalStockIn += p.totalIn || 0;
            totalStockOut += p.totalOut || 0;
        });
        
        document.getElementById('total-products').textContent = UI.formatNumber(products.length);
        document.getElementById('total-stock-in').textContent = UI.formatNumber(totalStockIn);
        document.getElementById('total-stock-out').textContent = UI.formatNumber(totalStockOut);
        document.getElementById('total-categories').textContent = UI.formatNumber(categories.length);
        
        this.renderLowStock();
        this.renderTransactions('all', 10);
        
        // Update settings info
        const totalRecords = products.length + categories.length + DataStore.getTransactions().length;
        document.getElementById('total-records').textContent = UI.formatNumber(totalRecords);
        document.getElementById('last-sync').textContent = UI.formatDate(new Date().toISOString());
    },

    // Refresh all UI
    refreshAll() {
        this.populateCategoryDropdowns();
        this.populateProductDropdowns();
        this.renderCategories();
        this.renderProducts();
        this.renderTransactions('in');
        this.renderTransactions('out');
        this.updateDashboard();
    }
};

// ============================================
// QR Code Handler
// ============================================
const QRHandler = {
    html5QrcodeScanner: null,
    currentMode: 'in',
    scannedProductId: null,

    // Generate QR Code for product
    generateQRCode(productId) {
        const product = DataStore.getProductById(productId);
        if (!product) return;

        const container = document.getElementById('qr-code-container');
        container.innerHTML = '';
        
        const qrData = JSON.stringify({
            id: product.id,
            qrCode: product.qrCode,
            name: product.name
        });

        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(qrData, { 
                width: 250,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error, canvas) => {
                if (error) {
                    console.error(error);
                    UI.showToast('خطأ في إنشاء كود QR', 'error');
                    return;
                }
                container.appendChild(canvas);
            });
        } else {
            UI.showToast('مكتبة QR غير متوفرة', 'error');
            return;
        }

        document.getElementById('qr-product-name').textContent = product.name;
        document.getElementById('qr-modal').classList.remove('hidden');
    },

    // Start QR Scanner
    startScanner() {
        const reader = document.getElementById('qr-reader');
        
        if (typeof Html5Qrcode === 'undefined') {
            UI.showToast('مكتبة الماسح غير متوفرة', 'error');
            return;
        }

        this.html5QrcodeScanner = new Html5Qrcode('qr-reader');
        
        this.html5QrcodeScanner.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                this.handleScanResult(decodedText);
            },
            (errorMessage) => {
                // Ignore scan errors
            }
        ).then(() => {
            document.getElementById('start-scanner').disabled = true;
            document.getElementById('stop-scanner').disabled = false;
        }).catch(err => {
            console.error('Error starting scanner:', err);
            UI.showToast('خطأ في تشغيل الكاميرا. تأكد من إعطاء الإذن.', 'error');
        });
    },

    // Stop QR Scanner
    stopScanner() {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.stop().then(() => {
                document.getElementById('start-scanner').disabled = false;
                document.getElementById('stop-scanner').disabled = true;
                document.getElementById('qr-reader').innerHTML = '';
                this.html5QrcodeScanner = null;
            }).catch(err => {
                console.error('Error stopping scanner:', err);
            });
        }
    },

    // Handle scan result
    handleScanResult(decodedText) {
        try {
            let productData;
            try {
                productData = JSON.parse(decodedText);
            } catch {
                // If not JSON, treat as product ID or QR code
                productData = { qrCode: decodedText };
            }

            let product = null;
            if (productData.id) {
                product = DataStore.getProductById(productData.id);
            }
            if (!product && productData.qrCode) {
                product = DataStore.getProductByQRCode(productData.qrCode);
            }

            if (product) {
                this.scannedProductId = product.id;
                const category = DataStore.getCategories().find(c => c.id === product.categoryId);
                
                document.getElementById('scanned-product-info').innerHTML = `
                    <p><strong>المنتج:</strong> ${product.name}</p>
                    <p><strong>الصنف:</strong> ${category ? category.name : 'غير مصنف'}</p>
                    <p><strong>المخزون الحالي:</strong> ${product.stock}</p>
                    <p><strong>العملية:</strong> ${this.currentMode === 'in' ? '📥 إدخال' : '📤 بيع'}</p>
                `;
                document.getElementById('scan-result').classList.remove('hidden');
                document.getElementById('scan-quantity').value = 1;
                
                // Beep sound or vibration
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
                
                this.stopScanner();
            } else {
                UI.showToast('المنتج غير موجود في النظام', 'warning');
            }
        } catch (e) {
            console.error('Error processing scan:', e);
            UI.showToast('خطأ في قراءة الكود', 'error');
        }
    },

    // Confirm scanned operation
    confirmScan() {
        if (!this.scannedProductId) return;

        const quantity = parseInt(document.getElementById('scan-quantity').value) || 1;
        const product = DataStore.getProductById(this.scannedProductId);

        if (!product) {
            UI.showToast('المنتج غير موجود', 'error');
            return;
        }

        if (this.currentMode === 'out' && product.stock < quantity) {
            UI.showToast('الكمية المطلوبة أكبر من المخزون المتاح', 'error');
            return;
        }

        DataStore.updateProductStock(this.scannedProductId, quantity, this.currentMode);
        DataStore.addTransaction({
            productId: this.scannedProductId,
            type: this.currentMode,
            quantity: quantity,
            notes: 'عبر ماسح QR'
        });

        UI.showToast(
            this.currentMode === 'in' 
                ? `تم إضافة ${quantity} إلى المخزون` 
                : `تم خصم ${quantity} من المخزون`,
            'success'
        );

        document.getElementById('scan-result').classList.add('hidden');
        this.scannedProductId = null;
        UI.refreshAll();
    },

    // Download QR as image
    downloadQR() {
        const canvas = document.querySelector('#qr-code-container canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    },

    // Print QR
    printQR() {
        window.print();
    }
};

// ============================================
// Event Handlers
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    UI.refreshAll();

    // Tab Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            
            // Refresh relevant data when switching tabs
            if (tabId === 'dashboard') {
                UI.updateDashboard();
            } else if (tabId === 'products') {
                UI.renderProducts();
            } else if (tabId === 'categories') {
                UI.renderCategories();
            }
        });
    });

    // Category Form
    document.getElementById('category-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const category = {
            id: document.getElementById('category-id').value || null,
            name: document.getElementById('category-name').value.trim(),
            description: document.getElementById('category-description').value.trim()
        };
        
        DataStore.saveCategory(category);
        UI.showToast('تم حفظ الصنف بنجاح', 'success');
        e.target.reset();
        document.getElementById('category-id').value = '';
        UI.refreshAll();
    });

    document.getElementById('cancel-category').addEventListener('click', () => {
        document.getElementById('category-form').reset();
        document.getElementById('category-id').value = '';
    });

    // Category List Actions (Edit/Delete)
    document.getElementById('categories-list').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const id = btn.dataset.id;
        
        if (btn.classList.contains('edit-category')) {
            const category = DataStore.getCategories().find(c => c.id === id);
            if (category) {
                document.getElementById('category-id').value = category.id;
                document.getElementById('category-name').value = category.name;
                document.getElementById('category-description').value = category.description || '';
                document.querySelector('#categories h3').scrollIntoView({ behavior: 'smooth' });
            }
        } else if (btn.classList.contains('delete-category')) {
            const products = DataStore.getProducts().filter(p => p.categoryId === id);
            if (products.length > 0) {
                UI.showToast('لا يمكن حذف الصنف لوجود منتجات مرتبطة به', 'error');
                return;
            }
            if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
                DataStore.deleteCategory(id);
                UI.showToast('تم حذف الصنف', 'success');
                UI.refreshAll();
            }
        }
    });

    // Product Form
    document.getElementById('product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const product = {
            id: document.getElementById('product-id').value || null,
            name: document.getElementById('product-name').value.trim(),
            categoryId: document.getElementById('product-category').value,
            barcode: document.getElementById('product-barcode').value.trim(),
            price: parseFloat(document.getElementById('product-price').value) || 0,
            cost: parseFloat(document.getElementById('product-cost').value) || 0,
            minStock: parseInt(document.getElementById('product-min-stock').value) || 10
        };
        
        if (!product.categoryId) {
            UI.showToast('الرجاء اختيار الصنف', 'error');
            return;
        }
        
        DataStore.saveProduct(product);
        UI.showToast('تم حفظ المنتج بنجاح', 'success');
        e.target.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-min-stock').value = '10';
        UI.refreshAll();
    });

    document.getElementById('cancel-product').addEventListener('click', () => {
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-min-stock').value = '10';
    });

    // Product Search & Filter
    document.getElementById('search-products').addEventListener('input', (e) => {
        UI.renderProducts({
            search: e.target.value,
            categoryId: document.getElementById('filter-category').value
        });
    });

    document.getElementById('filter-category').addEventListener('change', (e) => {
        UI.renderProducts({
            search: document.getElementById('search-products').value,
            categoryId: e.target.value
        });
    });

    // Product List Actions
    document.getElementById('products-list').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const id = btn.dataset.id;
        
        if (btn.classList.contains('edit-product')) {
            const product = DataStore.getProductById(id);
            if (product) {
                document.getElementById('product-id').value = product.id;
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-category').value = product.categoryId;
                document.getElementById('product-barcode').value = product.barcode || '';
                document.getElementById('product-price').value = product.price || '';
                document.getElementById('product-cost').value = product.cost || '';
                document.getElementById('product-min-stock').value = product.minStock || 10;
                document.querySelector('#products h3').scrollIntoView({ behavior: 'smooth' });
            }
        } else if (btn.classList.contains('delete-product')) {
            if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                DataStore.deleteProduct(id);
                UI.showToast('تم حذف المنتج', 'success');
                UI.refreshAll();
            }
        } else if (btn.classList.contains('show-qr')) {
            QRHandler.generateQRCode(id);
        }
    });

    // Stock In Form
    document.getElementById('stock-in-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const productId = document.getElementById('stock-in-product').value;
        const quantity = parseInt(document.getElementById('stock-in-quantity').value);
        const notes = document.getElementById('stock-in-notes').value.trim();
        
        if (!productId || !quantity) {
            UI.showToast('الرجاء اختيار المنتج وإدخال الكمية', 'error');
            return;
        }
        
        DataStore.updateProductStock(productId, quantity, 'in');
        DataStore.addTransaction({
            productId,
            type: 'in',
            quantity,
            notes
        });
        
        UI.showToast(`تم إضافة ${quantity} إلى المخزون`, 'success');
        e.target.reset();
        UI.refreshAll();
    });

    // Stock Out Form
    document.getElementById('stock-out-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const productId = document.getElementById('stock-out-product').value;
        const quantity = parseInt(document.getElementById('stock-out-quantity').value);
        const notes = document.getElementById('stock-out-notes').value.trim();
        
        if (!productId || !quantity) {
            UI.showToast('الرجاء اختيار المنتج وإدخال الكمية', 'error');
            return;
        }
        
        const product = DataStore.getProductById(productId);
        if (!product || product.stock < quantity) {
            UI.showToast('الكمية المطلوبة أكبر من المخزون المتاح', 'error');
            return;
        }
        
        DataStore.updateProductStock(productId, quantity, 'out');
        DataStore.addTransaction({
            productId,
            type: 'out',
            quantity,
            notes
        });
        
        UI.showToast(`تم خصم ${quantity} من المخزون`, 'success');
        e.target.reset();
        UI.refreshAll();
    });

    // QR Scanner Controls
    document.getElementById('scan-mode-in').addEventListener('click', (e) => {
        QRHandler.currentMode = 'in';
        document.getElementById('scan-mode-in').classList.add('active');
        document.getElementById('scan-mode-out').classList.remove('active');
    });

    document.getElementById('scan-mode-out').addEventListener('click', (e) => {
        QRHandler.currentMode = 'out';
        document.getElementById('scan-mode-out').classList.add('active');
        document.getElementById('scan-mode-in').classList.remove('active');
    });

    document.getElementById('start-scanner').addEventListener('click', () => {
        QRHandler.startScanner();
    });

    document.getElementById('stop-scanner').addEventListener('click', () => {
        QRHandler.stopScanner();
    });

    document.getElementById('confirm-scan').addEventListener('click', () => {
        QRHandler.confirmScan();
    });

    // QR Modal
    document.getElementById('close-qr-modal').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });

    document.getElementById('qr-modal').addEventListener('click', (e) => {
        if (e.target.id === 'qr-modal') {
            document.getElementById('qr-modal').classList.add('hidden');
        }
    });

    document.getElementById('download-qr').addEventListener('click', () => {
        QRHandler.downloadQR();
    });

    document.getElementById('print-qr').addEventListener('click', () => {
        QRHandler.printQR();
    });

    // Settings - Export Data
    document.getElementById('export-data').addEventListener('click', () => {
        const data = DataStore.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        UI.showToast('تم تحميل النسخة الاحتياطية', 'success');
    });

    // Settings - Import Data
    document.getElementById('import-data').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
                    DataStore.importAllData(data);
                    UI.showToast('تم استيراد البيانات بنجاح', 'success');
                    UI.refreshAll();
                }
            } catch (err) {
                UI.showToast('خطأ في قراءة الملف', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Settings - Clear All Data
    document.getElementById('clear-all-data').addEventListener('click', () => {
        if (confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
            if (confirm('⚠️ تأكيد نهائي: سيتم حذف جميع المنتجات والأصناف والعمليات!')) {
                DataStore.clearAllData();
                UI.showToast('تم حذف جميع البيانات', 'success');
                UI.refreshAll();
            }
        }
    });
});
