// Personnel Management Page
import { employeeService, transactionService, attendanceService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

export async function loadPersonnel() {
    const content = document.getElementById('mainContent');
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-users"></i> Personel Yönetimi</h1>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="window.openEmployeeModal()">
                    <i class="fas fa-plus"></i> Yeni Personel
                </button>
                <button class="btn btn-secondary" onclick="window.openTransactionModal()">
                    <i class="fas fa-money-bill"></i> Avans/Kesinti Ekle
                </button>
            </div>
        </div>
        
        <div class="page-content">
            <div class="search-bar">
                <input type="text" id="employeeSearch" placeholder="Personel ara..." class="form-control">
            </div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Personel Adı</th>
                            <th>Günlük Ücret</th>
                            <th>İşe Başlama</th>
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="employeeTableBody">
                        <tr>
                            <td colspan="5" class="text-center">Yükleniyor...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadEmployees();
    setupEmployeeSearch();
}

async function loadEmployees() {
    try {
        const { data: employees, error } = await employeeService.getAll();
        
        if (error) throw error;
        
        const tbody = document.getElementById('employeeTableBody');
        
        if (employees && employees.length > 0) {
            tbody.innerHTML = employees.map(emp => `
                <tr data-id="${emp.id}">
                    <td>
                        <strong>${emp.full_name}</strong>
                    </td>
                    <td>${formatter.currency(emp.daily_wage)}</td>
                    <td>${formatter.date(emp.start_date)}</td>
                    <td>
                        <span class="badge ${emp.is_active ? 'badge-success' : 'badge-secondary'}">
                            ${emp.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="window.viewEmployeeDetails('${emp.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="window.editEmployee('${emp.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.toggleEmployee('${emp.id}', ${emp.is_active})">
                            <i class="fas fa-${emp.is_active ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteEmployee('${emp.id}')" style="margin-left: 5px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Personel bulunamadı.</td></tr>';
        }
    } catch (error) {
        console.error('Personel yüklenirken hata:', error);
        Toast.error('Personel listesi yüklenirken bir hata oluştu');
    }
}

function setupEmployeeSearch() {
    const searchInput = document.getElementById('employeeSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#employeeTableBody tr');
        
        rows.forEach(row => {
            const name = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
            row.style.display = name.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Employee Modal
window.openEmployeeModal = function(employeeId = null) {
    const isEdit = !!employeeId;
    const modal = new Modal({
        title: isEdit ? 'Personel Düzenle' : 'Yeni Personel Ekle',
        content: `
            <form id="employeeForm">
                <div class="form-group">
                    <label>Ad Soyad <span class="required">*</span></label>
                    <input type="text" id="fullName" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>Günlük Ücret (₺) <span class="required">*</span></label>
                    <input type="number" id="dailyWage" class="form-control" min="0" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label>İşe Başlama Tarihi <span class="required">*</span></label>
                    <input type="date" id="startDate" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="isActive" checked> Aktif
                    </label>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                        İptal
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </form>
        `,
        size: 'medium'
    });

    modal.show();

    const form = document.getElementById('employeeForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEmployee(employeeId, modal);
    });

    if (isEdit) {
        loadEmployeeData(employeeId);
    } else {
        document.getElementById('startDate').value = formatter.dateForInput();
    }
};

async function loadEmployeeData(employeeId) {
    try {
        const { data: employee, error } = await employeeService.getById(employeeId);
        if (error) throw error;
        
        document.getElementById('fullName').value = employee.full_name;
        document.getElementById('dailyWage').value = employee.daily_wage;
        document.getElementById('startDate').value = formatter.dateForInput(employee.start_date);
        document.getElementById('isActive').checked = employee.is_active;
    } catch (error) {
        Toast.error('Personel bilgileri yüklenirken hata oluştu');
    }
}

async function saveEmployee(employeeId, modal) {
    try {
        const employeeData = {
            full_name: document.getElementById('fullName').value,
            daily_wage: parseFloat(document.getElementById('dailyWage').value),
            start_date: document.getElementById('startDate').value,
            is_active: document.getElementById('isActive').checked
        };

        let result;
        if (employeeId) {
            result = await employeeService.update(employeeId, employeeData);
        } else {
            result = await employeeService.create(employeeData);
        }

        if (result.error) throw result.error;

        Toast.success(employeeId ? 'Personel güncellendi' : 'Personel eklendi');
        modal.close();
        await loadEmployees();
    } catch (error) {
        console.error('Personel kaydedilirken hata:', error);
        Toast.error('Personel kaydedilirken bir hata oluştu');
    }
}

// Transaction Modal (Advance/Deduction)
window.openTransactionModal = function() {
    const modal = new Modal({
        title: 'Avans/Kesinti Ekle',
        content: `
            <form id="transactionForm">
                <div class="form-group">
                    <label>Personel <span class="required">*</span></label>
                    <select id="employeeId" class="form-control" required>
                        <option value="">Seçiniz...</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>İşlem Tipi <span class="required">*</span></label>
                    <select id="transactionType" class="form-control" required>
                        <option value="Avans">Avans</option>
                        <option value="Kesinti">Kesinti</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tutar (₺) <span class="required">*</span></label>
                    <input type="number" id="amount" class="form-control" min="0" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label>Tarih <span class="required">*</span></label>
                    <input type="date" id="transactionDate" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea id="description" class="form-control" rows="2"></textarea>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                        İptal
                    </button>
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                </div>
            </form>
        `,
        size: 'medium'
    });

    modal.show();
    loadEmployeeOptions();
    document.getElementById('transactionDate').value = formatter.dateForInput();

    const form = document.getElementById('transactionForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTransaction(modal);
    });
};

async function loadEmployeeOptions() {
    try {
        const { data: employees, error } = await employeeService.getActive();
        if (error) throw error;
        
        const select = document.getElementById('employeeId');
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.full_name;
            select.appendChild(option);
        });
    } catch (error) {
        Toast.error('Personel listesi yüklenirken hata oluştu');
    }
}

async function saveTransaction(modal) {
    try {
        const transactionData = {
            employee_id: document.getElementById('employeeId').value,
            type: document.getElementById('transactionType').value,
            amount: parseFloat(document.getElementById('amount').value),
            transaction_date: document.getElementById('transactionDate').value,
            description: document.getElementById('description').value || null
        };

        const { error } = await transactionService.create(transactionData);
        if (error) throw error;

        Toast.success('İşlem kaydedildi');
        modal.close();
    } catch (error) {
        console.error('İşlem kaydedilirken hata:', error);
        Toast.error('İşlem kaydedilirken bir hata oluştu');
    }
}

// View Employee Details
window.viewEmployeeDetails = async function(employeeId) {
    try {
        const { data: employee, error: empError } = await employeeService.getById(employeeId);
        if (empError) throw empError;

        // Get last 30 days of attendance
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data: attendance, error: attError } = await attendanceService.getByEmployee(employeeId, startDate, endDate);
        const { data: transactions, error: transError } = await transactionService.getByEmployee(employeeId, startDate, endDate);

        const modal = new Modal({
            title: `${employee.full_name} - Detay`,
            content: `
                <div class="employee-details">
                    <div class="detail-section">
                        <h4>Personel Bilgileri</h4>
                        <p><strong>Günlük Ücret:</strong> ${formatter.currency(employee.daily_wage)}</p>
                        <p><strong>İşe Başlama:</strong> ${formatter.date(employee.start_date)}</p>
                        <p><strong>Durum:</strong> <span class="badge ${employee.is_active ? 'badge-success' : 'badge-secondary'}">${employee.is_active ? 'Aktif' : 'Pasif'}</span></p>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Son 30 Günlük Puantaj</h4>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Durum</th>
                                        <th>Proje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${attendance && attendance.length > 0 ? 
                                        attendance.slice(0, 10).map(att => `
                                            <tr>
                                                <td>${formatter.date(att.work_date)}</td>
                                                <td><span class="badge ${att.status === 'Gelmedi' ? 'badge-danger' : 'badge-success'}">${att.status}</span></td>
                                                <td>${att.projects?.project_name || '-'}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="3">Kayıt yok</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Son İşlemler</h4>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Tip</th>
                                        <th>Tutar</th>
                                        <th>Açıklama</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactions && transactions.length > 0 ?
                                        transactions.slice(0, 10).map(trans => `
                                            <tr>
                                                <td>${formatter.date(trans.transaction_date)}</td>
                                                <td><span class="badge ${trans.type === 'Avans' ? 'badge-warning' : 'badge-danger'}">${trans.type}</span></td>
                                                <td>${formatter.currency(trans.amount)}</td>
                                                <td>${trans.description || '-'}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="4">İşlem yok</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `,
            size: 'large'
        });

        modal.show();
    } catch (error) {
        console.error('Personel detayları yüklenirken hata:', error);
        Toast.error('Personel detayları yüklenirken hata oluştu');
    }
};

// Edit Employee
window.editEmployee = function(employeeId) {
    window.openEmployeeModal(employeeId);
};

// Toggle Employee Status
window.toggleEmployee = async function(employeeId, currentStatus) {
    const confirmed = await Modal.confirm(
        currentStatus ? 'Bu personeli pasif yapmak istediğinizden emin misiniz?' : 'Bu personeli aktif yapmak istediğinizden emin misiniz?',
        'Durum Değiştir'
    );

    if (confirmed) {
        try {
            const { error } = await employeeService.update(employeeId, { is_active: !currentStatus });
            if (error) throw error;
            
            Toast.success('Personel durumu güncellendi');
            await loadEmployees();
        } catch (error) {
            Toast.error('Durum güncellenirken hata oluştu');
        }
    }
};

// Delete Employee
window.deleteEmployee = async function(employeeId) {
    const confirmed = await Modal.confirm(
        'Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
        'Personel Sil'
    );

    if (confirmed) {
        try {
            const { error } = await employeeService.delete(employeeId);
            if (error) throw error;
            
            Toast.success('Personel silindi');
            await loadEmployees();
        } catch (error) {
            Toast.error('Personel silinirken hata oluştu. Personel kayıtları mevcut olabilir.');
        }
    }
};