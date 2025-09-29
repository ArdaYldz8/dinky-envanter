// Customers (Cari Hesaplar) Page
import { customerService } from '../services/supabaseService2.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

let currentCustomers = [];
let selectedCustomer = null;
let currentTransactions = [];

export async function loadCustomers() {
    const content = document.getElementById('mainContent');

    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-users-cog"></i> Cari Hesaplar</h1>
            <p>Müşteri ve tedarikçi bilgilerini yönetin.</p>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="window.openCustomerModal()">
                    <i class="fas fa-plus"></i> Yeni Cari Hesap
                </button>
                <button class="btn btn-info" onclick="window.showAgingReport()">
                    <i class="fas fa-chart-bar"></i> Yaşlandırma Raporu
                </button>
            </div>
        </div>

        <div class="page-content">
            <div class="search-bar">
                <input type="text" id="customerSearch" placeholder="Firma adı, kişi adı veya kod ile ara..." class="form-control">
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Kod</th>
                            <th>Firma Adı</th>
                            <th>Yetkili</th>
                            <th>Telefon</th>
                            <th>Şehir</th>
                            <th>Tip</th>
                            <th>Bakiye</th>
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="customersTableBody">
                        <tr>
                            <td colspan="9" class="text-center">Yükleniyor...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Setup search functionality
    const searchInput = document.getElementById('customerSearch');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterCustomers(e.target.value);
        }, 300);
    });

    // Load customers data
    await loadCustomersData();
}

async function loadCustomersData() {
    try {
        const { data: customers, error } = await customerService.getAll();
        if (error) throw error;

        // Load balances for each customer
        const customersWithBalances = await Promise.all(customers.map(async (customer) => {
            const { data: balanceData } = await customerService.getCustomerBalance(customer.id);
            return {
                ...customer,
                balance: balanceData ? balanceData.balance : 0
            };
        }));

        currentCustomers = customersWithBalances || [];
        renderCustomersTable(currentCustomers);

    } catch (error) {
        console.error('Customers loading error:', error);
        Toast.error('Cari hesaplar yüklenirken hata oluştu');
    }
}

function renderCustomersTable(customers) {
    const tableBody = document.getElementById('customersTableBody');

    if (!customers || customers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-users"></i><br>
                    Henüz cari hesap kaydı bulunmuyor.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = customers.map(customer => `
        <tr>
            <td><strong>${customer.customer_code}</strong></td>
            <td>
                <div class="customer-name">
                    ${customer.company_name}
                    ${customer.tax_number ? `<small class="text-muted d-block">VN: ${customer.tax_number}</small>` : ''}
                </div>
            </td>
            <td>${customer.contact_person || '-'}</td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.city || '-'}</td>
            <td>
                <span class="badge badge-${getCustomerTypeBadge(customer.customer_type)}">
                    ${customer.customer_type}
                </span>
            </td>
            <td>
                <span class="badge badge-${customer.balance > 0 ? 'success' : customer.balance < 0 ? 'danger' : 'secondary'}">
                    ${formatter.currency(Math.abs(customer.balance || 0))}
                    ${customer.balance > 0 ? ' (A)' : customer.balance < 0 ? ' (B)' : ''}
                </span>
            </td>
            <td>
                <span class="badge badge-${customer.is_active ? 'success' : 'secondary'}">
                    ${customer.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info" onclick="window.viewCustomerDetails('${customer.id}')" title="Detaylar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.openTransactionsModal('${customer.id}')" title="Cari Hareketler">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.editCustomer('${customer.id}')" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteCustomer('${customer.id}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getCustomerTypeBadge(type) {
    const badges = {
        'Müşteri': 'primary',
        'Tedarikçi': 'info',
        'Her İkisi': 'success'
    };
    return badges[type] || 'secondary';
}

function filterCustomers(searchTerm) {
    if (!searchTerm.trim()) {
        renderCustomersTable(currentCustomers);
        return;
    }

    const filtered = currentCustomers.filter(customer =>
        customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.contact_person && customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.includes(searchTerm))
    );

    renderCustomersTable(filtered);
}

// Global functions for window access
window.openCustomerModal = function(customer = null) {
    const isEdit = customer !== null;
    const modal = new Modal({
        title: isEdit ? 'Cari Hesap Düzenle' : 'Yeni Cari Hesap',
        size: 'large',
        content: `
            <form id="customerForm">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Cari Kodu</label>
                            <input type="text" id="customer_code" class="form-control"
                                   value="${customer?.customer_code || ''}"
                                   ${customer ? 'readonly' : ''}
                                   placeholder="Otomatik oluşturulacak">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Cari Tipi *</label>
                            <select id="customer_type" class="form-control" required>
                                <option value="Müşteri" ${customer?.customer_type === 'Müşteri' ? 'selected' : ''}>Müşteri</option>
                                <option value="Tedarikçi" ${customer?.customer_type === 'Tedarikçi' ? 'selected' : ''}>Tedarikçi</option>
                                <option value="Her İkisi" ${customer?.customer_type === 'Her İkisi' ? 'selected' : ''}>Her İkisi</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Firma Adı *</label>
                    <input type="text" id="company_name" class="form-control"
                           value="${customer?.company_name || ''}" required>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Yetkili Kişi</label>
                            <input type="text" id="contact_person" class="form-control"
                                   value="${customer?.contact_person || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Telefon</label>
                            <input type="text" id="phone" class="form-control"
                                   value="${customer?.phone || ''}">
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>E-posta</label>
                            <input type="email" id="email" class="form-control"
                                   value="${customer?.email || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Şehir</label>
                            <input type="text" id="city" class="form-control"
                                   value="${customer?.city || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Adres</label>
                    <textarea id="address" class="form-control" rows="2">${customer?.address || ''}</textarea>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Vergi Numarası</label>
                            <input type="text" id="tax_number" class="form-control"
                                   value="${customer?.tax_number || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Vergi Dairesi</label>
                            <input type="text" id="tax_office" class="form-control"
                                   value="${customer?.tax_office || ''}">
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Kredi Limiti (TL)</label>
                            <input type="number" id="credit_limit" class="form-control" min="0" step="0.01"
                                   value="${customer?.credit_limit || 0}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>Vade (Gün)</label>
                            <input type="number" id="payment_term_days" class="form-control" min="0"
                                   value="${customer?.payment_term_days || 0}">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Notlar</label>
                    <textarea id="notes" class="form-control" rows="2">${customer?.notes || ''}</textarea>
                </div>

                <div class="form-group">
                    <div class="form-check">
                        <input type="checkbox" id="is_active" class="form-check-input"
                               ${customer?.is_active !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="is_active">Aktif</label>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">İptal</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </form>
        `
    });

    modal.show();

    // Form submit handler
    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            customer_code: document.getElementById('customer_code').value.trim() || undefined,
            company_name: document.getElementById('company_name').value.trim(),
            contact_person: document.getElementById('contact_person').value.trim() || null,
            phone: document.getElementById('phone').value.trim() || null,
            email: document.getElementById('email').value.trim() || null,
            city: document.getElementById('city').value.trim() || null,
            address: document.getElementById('address').value.trim() || null,
            tax_number: document.getElementById('tax_number').value.trim() || null,
            tax_office: document.getElementById('tax_office').value.trim() || null,
            customer_type: document.getElementById('customer_type').value,
            credit_limit: parseFloat(document.getElementById('credit_limit').value) || 0,
            payment_term_days: parseInt(document.getElementById('payment_term_days').value) || 0,
            notes: document.getElementById('notes').value.trim() || null,
            is_active: document.getElementById('is_active').checked
        };

        try {
            if (isEdit) {
                const { error } = await customerService.update(customer.id, formData);
                if (error) throw error;
                Toast.success('Cari hesap güncellendi');
            } else {
                const { error } = await customerService.create(formData);
                if (error) throw error;
                Toast.success('Cari hesap oluşturuldu');
            }

            modal.close();
            await loadCustomersData();

        } catch (error) {
            console.error('Customer save error:', error);
            Toast.error('Kaydetme sırasında hata oluştu');
        }
    });
};

// Open transactions modal for a customer
window.openTransactionsModal = async function(customerId) {
    selectedCustomer = currentCustomers.find(c => c.id === customerId);
    if (!selectedCustomer) return;

    const modal = new Modal({
        title: `${selectedCustomer.company_name} - Cari Hareketler`,
        size: 'x-large',
        content: `
            <div class="transactions-container">
                <div class="row mb-3">
                    <div class="col-md-3">
                        <div class="info-box">
                            <small>Güncel Bakiye</small>
                            <h4 class="${selectedCustomer.balance >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatter.currency(Math.abs(selectedCustomer.balance || 0))}
                                ${selectedCustomer.balance > 0 ? ' (Alacak)' : selectedCustomer.balance < 0 ? ' (Borç)' : ''}
                            </h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="info-box">
                            <small>Kredi Limiti</small>
                            <h4>${formatter.currency(selectedCustomer.credit_limit || 0)}</h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="info-box">
                            <small>Vade</small>
                            <h4>${selectedCustomer.payment_term_days || 0} gün</h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary btn-block" onclick="window.addTransactionModal('${customerId}')">
                            <i class="fas fa-plus"></i> Yeni Hareket
                        </button>
                        <button class="btn btn-info btn-block mt-2" onclick="window.printStatement('${customerId}')">
                            <i class="fas fa-print"></i> Ekstre Yazdır
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>İşlem Tipi</th>
                                <th>Açıklama</th>
                                <th>Belge No</th>
                                <th>Borç</th>
                                <th>Alacak</th>
                                <th>Bakiye</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody id="transactionsTableBody">
                            <tr>
                                <td colspan="8" class="text-center">Yükleniyor...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    });

    modal.show();

    // Load transactions
    await loadTransactions(customerId);
};

// Load customer transactions
async function loadTransactions(customerId) {
    try {
        const { data: transactions, error } = await customerService.getCustomerTransactions(customerId);
        if (error) throw error;

        currentTransactions = transactions || [];
        renderTransactionsTable(currentTransactions);

    } catch (error) {
        console.error('Transactions loading error:', error);
        Toast.error('Hareketler yüklenirken hata oluştu');
    }
}

// Render transactions table
function renderTransactionsTable(transactions) {
    const tableBody = document.getElementById('transactionsTableBody');

    if (!transactions || transactions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    Henüz hareket kaydı bulunmuyor.
                </td>
            </tr>
        `;
        return;
    }

    let runningBalance = 0;
    tableBody.innerHTML = transactions.map(transaction => {
        const debit = transaction.transaction_type === 'Borç' || transaction.transaction_type === 'Alış' ? transaction.amount : 0;
        const credit = transaction.transaction_type === 'Alacak' || transaction.transaction_type === 'Satış' || transaction.transaction_type === 'Tahsilat' ? transaction.amount : 0;
        runningBalance += (credit - debit);

        return `
            <tr>
                <td>${formatter.date(transaction.transaction_date)}</td>
                <td>
                    <span class="badge badge-${getTransactionTypeBadge(transaction.transaction_type)}">
                        ${transaction.transaction_type}
                    </span>
                </td>
                <td>${transaction.description || '-'}</td>
                <td>${transaction.document_number || '-'}</td>
                <td class="text-danger">${debit > 0 ? formatter.currency(debit) : '-'}</td>
                <td class="text-success">${credit > 0 ? formatter.currency(credit) : '-'}</td>
                <td class="${runningBalance >= 0 ? 'text-success' : 'text-danger'}">
                    ${formatter.currency(Math.abs(runningBalance))}
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteTransaction('${transaction.id}', '${transaction.customer_id}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get transaction type badge
function getTransactionTypeBadge(type) {
    const badges = {
        'Satış': 'success',
        'Alış': 'danger',
        'Tahsilat': 'info',
        'Ödeme': 'warning',
        'Borç': 'danger',
        'Alacak': 'success'
    };
    return badges[type] || 'secondary';
}

// Add transaction modal
window.addTransactionModal = function(customerId) {
    const modal = new Modal({
        title: 'Yeni Cari Hareket',
        size: 'medium',
        content: `
            <form id="transactionForm">
                <div class="form-group">
                    <label>İşlem Tipi *</label>
                    <select id="transaction_type" class="form-control" required>
                        <option value="">Seçiniz...</option>
                        <option value="Satış">Satış</option>
                        <option value="Alış">Alış</option>
                        <option value="Tahsilat">Tahsilat</option>
                        <option value="Ödeme">Ödeme</option>
                        <option value="Borç">Borç Dekontu</option>
                        <option value="Alacak">Alacak Dekontu</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Tarih *</label>
                    <input type="date" id="transaction_date" class="form-control"
                           value="${new Date().toISOString().split('T')[0]}" required>
                </div>

                <div class="form-group">
                    <label>Tutar (TL) *</label>
                    <input type="number" id="amount" class="form-control"
                           min="0.01" step="0.01" required>
                </div>

                <div class="form-group">
                    <label>Belge No</label>
                    <input type="text" id="document_number" class="form-control">
                </div>

                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea id="description" class="form-control" rows="2"></textarea>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">İptal</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Kaydet
                    </button>
                </div>
            </form>
        `
    });

    modal.show();

    // Form submit handler
    document.getElementById('transactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            customer_id: customerId,
            transaction_type: document.getElementById('transaction_type').value,
            transaction_date: document.getElementById('transaction_date').value,
            amount: parseFloat(document.getElementById('amount').value),
            document_number: document.getElementById('document_number').value.trim() || null,
            description: document.getElementById('description').value.trim() || null
        };

        try {
            const { error } = await customerService.addTransaction(formData);
            if (error) throw error;

            Toast.success('Hareket kaydedildi');
            modal.close();
            await loadTransactions(customerId);
            await loadCustomersData(); // Refresh balances

        } catch (error) {
            console.error('Transaction save error:', error);
            Toast.error('Hareket kaydedilirken hata oluştu');
        }
    });
};

// Delete transaction
window.deleteTransaction = async function(transactionId, customerId) {
    const confirmed = await Modal.confirm(
        'Bu hareketi silmek istediğinizden emin misiniz?',
        'Hareket Silme'
    );

    if (confirmed) {
        try {
            const { error } = await customerService.deleteTransaction(transactionId);
            if (error) throw error;

            Toast.success('Hareket silindi');
            await loadTransactions(customerId);
            await loadCustomersData(); // Refresh balances

        } catch (error) {
            console.error('Transaction delete error:', error);
            Toast.error('Hareket silinirken hata oluştu');
        }
    }
};

// Print customer statement
window.printStatement = async function(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (!customer) return;

    try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 90 days

        const { data: statement, error } = await customerService.getCustomerStatement(customerId, startDate, endDate);
        if (error) throw error;

        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Cari Ekstre - ${customer.company_name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .info { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; border: 1px solid #ddd; }
                        th { background: #f5f5f5; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>CARİ HESAP EKSTRESİ</h2>
                        <p>${startDate} - ${endDate}</p>
                    </div>
                    <div class="info">
                        <strong>Firma:</strong> ${customer.company_name}<br>
                        <strong>Kod:</strong> ${customer.customer_code}<br>
                        <strong>Telefon:</strong> ${customer.phone || '-'}<br>
                        <strong>Vergi No:</strong> ${customer.tax_number || '-'}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>İşlem</th>
                                <th>Belge No</th>
                                <th>Açıklama</th>
                                <th>Borç</th>
                                <th>Alacak</th>
                                <th>Bakiye</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateStatementRows(statement)}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('Statement print error:', error);
        Toast.error('Ekstre hazırlanırken hata oluştu');
    }
};

// Generate statement rows for printing
function generateStatementRows(transactions) {
    if (!transactions || transactions.length === 0) {
        return '<tr><td colspan="7" class="text-center">Hareket bulunmamaktadır.</td></tr>';
    }

    let runningBalance = 0;
    return transactions.map(t => {
        const debit = t.transaction_type === 'Borç' || t.transaction_type === 'Alış' || t.transaction_type === 'Ödeme' ? t.amount : 0;
        const credit = t.transaction_type === 'Alacak' || t.transaction_type === 'Satış' || t.transaction_type === 'Tahsilat' ? t.amount : 0;
        runningBalance += (credit - debit);

        return `
            <tr>
                <td>${formatter.date(t.transaction_date)}</td>
                <td>${t.transaction_type}</td>
                <td>${t.document_number || '-'}</td>
                <td>${t.description || '-'}</td>
                <td class="text-right">${debit > 0 ? formatter.currency(debit) : '-'}</td>
                <td class="text-right">${credit > 0 ? formatter.currency(credit) : '-'}</td>
                <td class="text-right">${formatter.currency(Math.abs(runningBalance))}</td>
            </tr>
        `;
    }).join('');
}

// Show aging report
window.showAgingReport = async function() {
    try {
        const { data: agingData, error } = await customerService.getAgingReport();
        if (error) throw error;

        const modal = new Modal({
            title: 'Yaşlandırma Raporu',
            size: 'large',
            content: `
                <div class="aging-report">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Müşteri</th>
                                    <th>Güncel</th>
                                    <th>1-30 Gün</th>
                                    <th>31-60 Gün</th>
                                    <th>61-90 Gün</th>
                                    <th>90+ Gün</th>
                                    <th>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${generateAgingRows(agingData)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `
        });

        modal.show();

    } catch (error) {
        console.error('Aging report error:', error);
        Toast.error('Yaşlandırma raporu hazırlanırken hata oluştu');
    }
};

// Generate aging report rows
function generateAgingRows(data) {
    if (!data || data.length === 0) {
        return '<tr><td colspan="7" class="text-center">Veri bulunmamaktadır.</td></tr>';
    }

    return data.map(row => `
        <tr>
            <td>${row.company_name}</td>
            <td>${formatter.currency(row.current || 0)}</td>
            <td>${formatter.currency(row.days_30 || 0)}</td>
            <td>${formatter.currency(row.days_60 || 0)}</td>
            <td>${formatter.currency(row.days_90 || 0)}</td>
            <td>${formatter.currency(row.days_over_90 || 0)}</td>
            <td><strong>${formatter.currency(row.total || 0)}</strong></td>
        </tr>
    `).join('');
}

window.viewCustomerDetails = function(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (!customer) return;

    const modal = new Modal({
        title: `${customer.company_name} - Detaylar`,
        size: 'large',
        content: `
            <div class="customer-details">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Genel Bilgiler</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Cari Kodu:</strong></td><td>${customer.customer_code}</td></tr>
                            <tr><td><strong>Firma Adı:</strong></td><td>${customer.company_name}</td></tr>
                            <tr><td><strong>Yetkili:</strong></td><td>${customer.contact_person || '-'}</td></tr>
                            <tr><td><strong>Tip:</strong></td><td>${customer.customer_type}</td></tr>
                            <tr><td><strong>Durum:</strong></td><td>${customer.is_active ? 'Aktif' : 'Pasif'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>İletişim Bilgileri</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Telefon:</strong></td><td>${customer.phone || '-'}</td></tr>
                            <tr><td><strong>E-posta:</strong></td><td>${customer.email || '-'}</td></tr>
                            <tr><td><strong>Şehir:</strong></td><td>${customer.city || '-'}</td></tr>
                            <tr><td><strong>Adres:</strong></td><td>${customer.address || '-'}</td></tr>
                        </table>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <h6>Mali Bilgiler</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Vergi No:</strong></td><td>${customer.tax_number || '-'}</td></tr>
                            <tr><td><strong>Vergi Dairesi:</strong></td><td>${customer.tax_office || '-'}</td></tr>
                            <tr><td><strong>Kredi Limiti:</strong></td><td>${formatter.currency(customer.credit_limit || 0)}</td></tr>
                            <tr><td><strong>Vade:</strong></td><td>${customer.payment_term_days || 0} gün</td></tr>
                            <tr><td><strong>Güncel Bakiye:</strong></td>
                                <td class="${customer.balance >= 0 ? 'text-success' : 'text-danger'}">
                                    ${formatter.currency(Math.abs(customer.balance || 0))}
                                    ${customer.balance > 0 ? ' (A)' : customer.balance < 0 ? ' (B)' : ''}
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Sistem Bilgileri</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Oluşturma:</strong></td><td>${formatter.datetime(customer.created_at)}</td></tr>
                            <tr><td><strong>Güncelleme:</strong></td><td>${formatter.datetime(customer.updated_at)}</td></tr>
                            <tr><td><strong>Notlar:</strong></td><td>${customer.notes || '-'}</td></tr>
                        </table>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.openTransactionsModal('${customer.id}')">
                        <i class="fas fa-list"></i> Cari Hareketler
                    </button>
                    <button class="btn btn-warning" onclick="window.editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">Kapat</button>
                </div>
            </div>
        `
    });

    modal.show();
};

window.editCustomer = function(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (customer) {
        window.openCustomerModal(customer);
    }
};

window.deleteCustomer = async function(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (!customer) return;

    const confirmed = await Modal.confirm(
        `"${customer.company_name}" cari hesabını silmek istediğinizden emin misiniz?`,
        'Cari Hesap Silme'
    );

    if (confirmed) {
        try {
            console.log('Attempting to delete customer:', customerId, customer.company_name);
            const { error } = await customerService.delete(customerId);

            if (error) {
                console.error('Delete service returned error:', error);
                throw error;
            }

            console.log('Delete service completed successfully');
            Toast.success('Cari hesap başarıyla silindi');

            // Reload the customer data
            await loadCustomersData();
            console.log('Customer data reloaded after deletion');

        } catch (error) {
            console.error('Customer delete error:', error);
            Toast.error(`Silme işlemi başarısız: ${error.message || 'Bilinmeyen hata'}`);
        }
    }
};