// Customers (Cari Hesaplar) Page
import { customerService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

let currentCustomers = [];

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
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="customersTableBody">
                        <tr>
                            <td colspan="8" class="text-center">Yükleniyor...</td>
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

        currentCustomers = customers || [];
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
                <td colspan="8" class="text-center text-muted">
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
                <span class="badge badge-${customer.is_active ? 'success' : 'secondary'}">
                    ${customer.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info" onclick="window.viewCustomer('${customer.id}')" title="Görüntüle">
                        <i class="fas fa-eye"></i>
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

window.viewCustomer = function(customerId) {
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
            const { error } = await customerService.delete(customerId);
            if (error) throw error;

            Toast.success('Cari hesap silindi');
            await loadCustomersData();
        } catch (error) {
            console.error('Customer delete error:', error);
            Toast.error('Silme işlemi sırasında hata oluştu');
        }
    }
};