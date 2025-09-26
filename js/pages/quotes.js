// Quotes Page
import { quoteService } from '../services/quoteService.js';
import { customerService, productService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

export async function loadQuotes() {
    const main = document.getElementById('mainContent');

    main.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-file-invoice"></i> Teklifler</h1>
            <div class="page-actions">
                <button class="btn btn-secondary" onclick="window.exportQuotesSummary()">
                    <i class="fas fa-file-pdf"></i> PDF Raporu
                </button>
                <button class="btn btn-primary" onclick="window.showNewQuoteModal()">
                    <i class="fas fa-plus"></i> Yeni Teklif
                </button>
            </div>
        </div>

        <div class="page-filters">
            <select id="statusFilter" class="form-control" onchange="window.filterQuotes()">
                <option value="">Tüm Durumlar</option>
                <option value="Taslak">Taslak</option>
                <option value="Gönderildi">Gönderildi</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="Reddedildi">Reddedildi</option>
                <option value="İptal">İptal</option>
            </select>
            <input type="text" id="searchQuote" class="form-control" placeholder="Teklif no veya müşteri ara..." onkeyup="window.filterQuotes()">
        </div>

        <div class="quotes-grid" id="quotesGrid">
            <div class="loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>
        </div>
    `;

    await loadQuotesList();
}

async function loadQuotesList() {
    const grid = document.getElementById('quotesGrid');

    try {
        const { data: quotes, error } = await quoteService.getAll();

        if (error) throw error;

        if (quotes && quotes.length > 0) {
            const quotesHtml = quotes.map(quote => createQuoteCard(quote)).join('');
            grid.innerHTML = `<div class="quotes-container">${quotesHtml}</div>`;
        } else {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <p>Henüz teklif bulunmuyor</p>
                    <button class="btn btn-primary" onclick="window.showNewQuoteModal()">
                        <i class="fas fa-plus"></i> İlk Teklifi Oluştur
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Teklifler yüklenirken hata:', error);
        grid.innerHTML = `<div class="error-message">Teklifler yüklenemedi</div>`;
    }
}

function createQuoteCard(quote) {
    const statusColor = {
        'Taslak': 'secondary',
        'Gönderildi': 'info',
        'Onaylandı': 'success',
        'Reddedildi': 'danger',
        'İptal': 'warning'
    }[quote.status] || 'secondary';

    return `
        <div class="quote-card" data-quote-id="${quote.id}">
            <div class="quote-card__header">
                <div class="quote-number">
                    <strong>${quote.quote_number}</strong>
                    <span class="badge badge-${statusColor}">${quote.status}</span>
                </div>
                <div class="quote-actions">
                    <button class="btn btn-sm btn-info" onclick="window.viewQuote('${quote.id}')" title="Görüntüle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="window.editQuote('${quote.id}')" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="window.printQuote('${quote.id}')" title="PDF İndir">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteQuote('${quote.id}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="quote-card__body">
                <div class="customer-info">
                    <i class="fas fa-building"></i>
                    <strong>${quote.customer_name}</strong>
                </div>
                <div class="quote-details">
                    <div class="detail-item">
                        <span class="label">Tarih:</span>
                        <span>${formatter.date(quote.quote_date)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Geçerlilik:</span>
                        <span>${quote.valid_until ? formatter.date(quote.valid_until) : 'Belirtilmemiş'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Kalem:</span>
                        <span>${quote.quote_items?.length || 0} ürün</span>
                    </div>
                </div>
                <div class="quote-total">
                    <strong>Toplam:</strong>
                    <span class="amount">${formatter.currency(quote.total_amount)}</span>
                </div>
            </div>
        </div>
    `;
}

// Global functions
window.showNewQuoteModal = async function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h2><i class="fas fa-plus"></i> Yeni Teklif Oluştur</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="newQuoteForm">
                    <h3>Müşteri Bilgileri</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Müşteri Seçin</label>
                            <select id="customerId" class="form-control" onchange="window.fillCustomerInfo(this.value)">
                                <option value="">Müşteri Seçin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Müşteri Adı *</label>
                            <input type="text" id="customerName" class="form-control" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>E-posta</label>
                            <input type="email" id="customerEmail" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Telefon</label>
                            <input type="tel" id="customerPhone" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Adres</label>
                        <textarea id="customerAddress" class="form-control" rows="2"></textarea>
                    </div>

                    <h3>Teklif Detayları</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Teklif Tarihi</label>
                            <input type="date" id="quoteDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label>Geçerlilik Tarihi</label>
                            <input type="date" id="validUntil" class="form-control" value="${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <h3>Ürünler</h3>
                    <div id="quoteItems">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Ürün</th>
                                    <th>Açıklama</th>
                                    <th>Miktar</th>
                                    <th>Birim Fiyat</th>
                                    <th>İndirim %</th>
                                    <th>Toplam</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="itemsTableBody">
                                <!-- Items will be added here -->
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="7">
                                        <button type="button" class="btn btn-sm btn-primary" onclick="window.addQuoteItem()">
                                            <i class="fas fa-plus"></i> Ürün Ekle
                                        </button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div class="quote-summary">
                        <div class="summary-row">
                            <span>Ara Toplam:</span>
                            <span id="subtotal">0,00 ₺</span>
                        </div>
                        <div class="summary-row">
                            <span>KDV %18:</span>
                            <span id="taxAmount">0,00 ₺</span>
                        </div>
                        <div class="summary-row total">
                            <span>Genel Toplam:</span>
                            <span id="totalAmount">0,00 ₺</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Notlar</label>
                        <textarea id="notes" class="form-control" rows="2"></textarea>
                    </div>

                    <div class="form-group">
                        <label>Şartlar ve Koşullar</label>
                        <textarea id="termsConditions" class="form-control" rows="4">${quoteService.getDefaultTerms()}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">İptal</button>
                <button class="btn btn-primary" onclick="window.saveQuote()">
                    <i class="fas fa-save"></i> Kaydet
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Load customers and products
    await loadCustomersForSelect();
    await loadProductsData();

    // Add first empty item row
    window.addQuoteItem();
};

async function loadCustomersForSelect() {
    const select = document.getElementById('customerId');
    const { data: customers } = await customerService.getAll();

    if (customers) {
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.company_name || customer.contact_name;
            option.dataset.customer = JSON.stringify(customer);
            select.appendChild(option);
        });
    }
}

let productsData = [];
async function loadProductsData() {
    const { data: products } = await productService.getAll();
    productsData = products || [];
}

window.fillCustomerInfo = function(customerId) {
    if (!customerId) return;

    const select = document.getElementById('customerId');
    const option = select.querySelector(`option[value="${customerId}"]`);
    const customer = JSON.parse(option.dataset.customer);

    document.getElementById('customerName').value = customer.company_name || customer.contact_name || '';
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerAddress').value = customer.address || '';
};

let itemCounter = 0;
window.addQuoteItem = function() {
    const tbody = document.getElementById('itemsTableBody');
    const row = document.createElement('tr');
    row.dataset.itemId = itemCounter++;

    const productOptions = productsData.map(p =>
        `<option value="${p.id}" data-price="${p.unit_price}" data-name="${p.product_name}" data-code="${p.product_code || ''}">${p.product_name}</option>`
    ).join('');

    row.innerHTML = `
        <td>
            <select class="form-control product-select" onchange="window.updateItemFromProduct(this)">
                <option value="">Ürün Seçin</option>
                ${productOptions}
            </select>
        </td>
        <td><input type="text" class="form-control item-description"></td>
        <td><input type="number" class="form-control item-quantity" value="1" min="0.01" step="0.01" onchange="window.calculateItemTotal(this)"></td>
        <td><input type="number" class="form-control item-price" value="0" min="0" step="0.01" onchange="window.calculateItemTotal(this)"></td>
        <td><input type="number" class="form-control item-discount" value="0" min="0" max="100" step="0.01" onchange="window.calculateItemTotal(this)"></td>
        <td class="item-total">0,00 ₺</td>
        <td><button class="btn btn-sm btn-danger" onclick="window.removeQuoteItem(this)"><i class="fas fa-trash"></i></button></td>
    `;

    tbody.appendChild(row);
};

window.updateItemFromProduct = function(select) {
    const row = select.closest('tr');
    const selectedOption = select.selectedOptions[0];

    if (selectedOption.value) {
        const price = parseFloat(selectedOption.dataset.price) || 0;
        const name = selectedOption.dataset.name;
        const code = selectedOption.dataset.code;

        row.querySelector('.item-description').value = `${name} ${code ? `(${code})` : ''}`;
        row.querySelector('.item-price').value = price;
        window.calculateItemTotal(select);
    }
};

window.calculateItemTotal = function(input) {
    const row = input.closest('tr');
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const discount = parseFloat(row.querySelector('.item-discount').value) || 0;

    const subtotal = quantity * price;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;

    row.querySelector('.item-total').textContent = formatter.currency(total);

    // Update totals
    updateQuoteTotals();
};

window.removeQuoteItem = function(btn) {
    btn.closest('tr').remove();
    updateQuoteTotals();
};

function updateQuoteTotals() {
    let subtotal = 0;

    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const discount = parseFloat(row.querySelector('.item-discount').value) || 0;

        const itemSubtotal = quantity * price;
        const discountAmount = itemSubtotal * (discount / 100);
        subtotal += (itemSubtotal - discountAmount);
    });

    const taxRate = 18; // KDV %18
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    document.getElementById('subtotal').textContent = formatter.currency(subtotal);
    document.getElementById('taxAmount').textContent = formatter.currency(taxAmount);
    document.getElementById('totalAmount').textContent = formatter.currency(total);
}

window.saveQuote = async function() {
    const customerName = document.getElementById('customerName').value;
    if (!customerName) {
        Toast.error('Müşteri adı zorunludur');
        return;
    }

    // Collect items
    const items = [];
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const productSelect = row.querySelector('.product-select');
        const productId = productSelect.value;
        const productName = productSelect.selectedOptions[0]?.dataset.name || row.querySelector('.item-description').value;
        const productCode = productSelect.selectedOptions[0]?.dataset.code || '';

        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const discount = parseFloat(row.querySelector('.item-discount').value) || 0;

        if (quantity > 0 && price > 0) {
            const subtotal = quantity * price;
            const discountAmount = subtotal * (discount / 100);
            const lineTotal = subtotal - discountAmount;

            items.push({
                product_id: productId || null,
                product_name: productName,
                product_code: productCode,
                description: row.querySelector('.item-description').value,
                quantity: quantity,
                unit_price: price,
                discount_rate: discount,
                discount_amount: discountAmount,
                line_total: lineTotal,
                unit: 'Adet'
            });
        }
    });

    if (items.length === 0) {
        Toast.error('En az bir ürün ekleyin');
        return;
    }

    const quoteData = {
        customer_id: document.getElementById('customerId').value || null,
        customer_name: customerName,
        customer_email: document.getElementById('customerEmail').value,
        customer_phone: document.getElementById('customerPhone').value,
        customer_address: document.getElementById('customerAddress').value,
        quote_date: document.getElementById('quoteDate').value,
        valid_until: document.getElementById('validUntil').value,
        notes: document.getElementById('notes').value,
        terms_conditions: document.getElementById('termsConditions').value,
        items: items,
        tax_rate: 18
    };

    try {
        Toast.info('Teklif oluşturuluyor...');
        const { data, error } = await quoteService.create(quoteData);

        if (error) throw error;

        Toast.success('Teklif başarıyla oluşturuldu!');
        document.querySelector('.modal').remove();
        await loadQuotesList();
    } catch (error) {
        console.error('Teklif oluşturma hatası:', error);
        Toast.error('Teklif oluşturulamadı');
    }
};

window.viewQuote = async function(quoteId) {
    const { data: quote, error } = await quoteService.getById(quoteId);
    if (error || !quote) {
        Toast.error('Teklif bulunamadı');
        return;
    }

    // TODO: Implement detailed view modal
    Toast.info('Detaylı görünüm hazırlanıyor...');
};

window.editQuote = async function(quoteId) {
    // TODO: Implement edit functionality
    Toast.info('Düzenleme özelliği hazırlanıyor...');
};

window.printQuote = async function(quoteId) {
    try {
        Toast.info('PDF oluşturuluyor...');

        const { data: quote, error } = await quoteService.getById(quoteId);
        if (error) throw error;

        const result = await PDFGenerator.generateQuotePDF(quote);

        if (result.success) {
            Toast.success(`PDF başarıyla oluşturuldu: ${result.fileName}`);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        Toast.error('PDF oluşturulamadı: ' + error.message);
    }
};

window.deleteQuote = async function(quoteId) {
    if (!confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;

    try {
        const { error } = await quoteService.delete(quoteId);
        if (error) throw error;

        Toast.success('Teklif silindi');
        await loadQuotesList();
    } catch (error) {
        console.error('Silme hatası:', error);
        Toast.error('Teklif silinemedi');
    }
};

window.filterQuotes = function() {
    const status = document.getElementById('statusFilter').value.toLowerCase();
    const search = document.getElementById('searchQuote').value.toLowerCase();

    document.querySelectorAll('.quote-card').forEach(card => {
        const cardStatus = card.querySelector('.badge').textContent.toLowerCase();
        const cardNumber = card.querySelector('.quote-number strong').textContent.toLowerCase();
        const cardCustomer = card.querySelector('.customer-info strong').textContent.toLowerCase();

        const matchStatus = !status || cardStatus === status;
        const matchSearch = !search || cardNumber.includes(search) || cardCustomer.includes(search);

        card.style.display = matchStatus && matchSearch ? 'block' : 'none';
    });
};

// Export quotes summary as PDF
window.exportQuotesSummary = async function() {
    try {
        Toast.info('Teklif raporu oluşturuluyor...');

        const { data: quotes, error } = await quoteService.getAll();
        if (error) throw error;

        const result = await PDFGenerator.generateQuoteSummaryPDF(quotes || []);

        if (result.success) {
            Toast.success(`PDF raporu başarıyla oluşturuldu: ${result.fileName}`);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('PDF raporu oluşturma hatası:', error);
        Toast.error('PDF raporu oluşturulamadı: ' + error.message);
    }
};