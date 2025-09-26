// Attendance (Puantaj) Page
import { attendanceService, employeeService, projectService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

// Helper function to get current user ID
function getCurrentUserId() {
    try {
        const userStr = localStorage.getItem('dinky_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            // Check if ID is a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (user.id && uuidRegex.test(user.id)) {
                // For now, return null since these UUIDs don't exist in users table
                // In production, these should be real user IDs from the database
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error('Getting user ID error:', error);
        return null;
    }
}

// Helper function to get current user role
function getCurrentUserRole() {
    try {
        const userStr = localStorage.getItem('dinky_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.role || null;
        }
        return null;
    } catch (error) {
        console.error('Getting user role error:', error);
        return null;
    }
}

let currentAttendanceData = [];
let modifiedRecords = new Set();

export async function loadAttendance() {
    const content = document.getElementById('mainContent');
    const today = formatter.dateForInput();
    const currentRole = getCurrentUserRole();
    const isAccounting = currentRole === 'accounting';

    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-calendar-check"></i> Günlük Puantaj</h1>
            <div class="page-actions">
                <input type="date" id="attendanceDate" class="form-control" value="${today}" ${isAccounting ? `max="${today}"` : ''}>
                <button class="btn btn-success" onclick="window.saveAttendance()" id="saveBtn" disabled>
                    <i class="fas fa-save"></i> Kaydet
                </button>
            </div>
        </div>
        
        <div class="page-content">
            <div class="info-bar">
                <p><i class="fas fa-info-circle text-info"></i> Değişiklik yaptığınız satırlar vurgulanacaktır. Kaydet butonuna tıklayarak değişiklikleri kaydedebilirsiniz.</p>
                <p><i class="fas fa-clock text-primary"></i> <strong>Çalışma Saatleri:</strong> Tam gün = 9 saat, Yarım gün = 4.5 saat, Serbest Saat = manuel giriş yapılır.</p>
                <p><i class="fas fa-plus-circle text-success"></i> <strong>Ek Mesai:</strong> Normal mesai saatlerinin üzerine yapılan ek çalışma saatleridir (1.5 kat ücret ile hesaplanır).</p>
                ${isAccounting ? `<p><i class="fas fa-exclamation-triangle text-warning"></i> <strong>Muhasebe Kullanıcısı:</strong> Sadece günlük tarih için puantaj girişi yapabilirsiniz.</p>` : ''}
            </div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Durum</th>
                            <th>Proje</th>
                            <th>Ek Mesai</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceTableBody">
                        <tr>
                            <td colspan="4" class="text-center">Yükleniyor...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Setup date change listener with accounting role validation
    document.getElementById('attendanceDate').addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        const currentRole = getCurrentUserRole();

        // Check if accounting user is trying to select past date
        if (currentRole === 'accounting' && selectedDate < today) {
            Toast.error('Muhasebe kullanıcısı olarak sadece günlük tarih için puantaj girişi yapabilirsiniz.');
            e.target.value = today; // Reset to today
            return;
        }

        loadAttendanceData(selectedDate);
    });

    await loadAttendanceData(today);
}

async function loadAttendanceData(date) {
    try {
        // Get all active employees
        const { data: employees, error: empError } = await employeeService.getActive();
        if (empError) throw empError;

        // Get attendance records for the date
        const { data: attendance, error: attError } = await attendanceService.getByDate(date);
        if (attError) {
            console.error('Attendance error:', attError);
            // Continue with empty attendance if there's an error
        }

        // Get projects
        const { data: projects, error: projError } = await projectService.getActive();
        if (projError) throw projError;

        // Create attendance map
        const attendanceMap = {};
        if (attendance) {
            attendance.forEach(record => {
                attendanceMap[record.employee_id] = record;
            });
        }

        // Build attendance data
        currentAttendanceData = employees.map(emp => ({
            employee_id: emp.id,
            employee_name: emp.full_name,
            work_date: date,
            status: attendanceMap[emp.id]?.status || 'Tam Gün',
            project_id: attendanceMap[emp.id]?.project_id || null,
            overtime_hours: attendanceMap[emp.id]?.overtime_hours || 0,
            overtime_note: attendanceMap[emp.id]?.overtime_note || '',
            custom_hours: attendanceMap[emp.id]?.custom_hours || 0,
            record_id: attendanceMap[emp.id]?.id || null,
            isModified: false
        }));

        // Render table
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) {
            console.error('attendanceTableBody element not found');
            return;
        }
        tbody.innerHTML = currentAttendanceData.map((record, index) => `
            <tr data-index="${index}" class="${record.isModified ? 'modified-row' : ''}">
                <td><strong>${record.employee_name}</strong></td>
                <td>
                    <div class="status-container">
                        <select class="form-control attendance-status" data-index="${index}">
                            <option value="Tam Gün" ${record.status === 'Tam Gün' ? 'selected' : ''}>
                                <i class="fas fa-clock"></i> Tam Gün (9 saat)
                            </option>
                            <option value="Yarım Gün" ${record.status === 'Yarım Gün' ? 'selected' : ''}>
                                <i class="fas fa-clock-o"></i> Yarım Gün (4.5 saat)
                            </option>
                            <option value="Serbest Saat" ${record.status === 'Serbest Saat' ? 'selected' : ''}>
                                <i class="fas fa-edit"></i> Serbest Saat
                            </option>
                            <option value="Gelmedi" ${record.status === 'Gelmedi' ? 'selected' : ''}>
                                <i class="fas fa-times"></i> Gelmedi
                            </option>
                        </select>
                        ${record.status === 'Serbest Saat' ? `
                            <div style="position: relative;">
                                <input type="number" class="form-control custom-hours"
                                       data-index="${index}"
                                       placeholder="Saat girişi"
                                       min="0.5"
                                       max="12"
                                       step="0.5"
                                       value="${record.custom_hours || ''}"
                                       title="Çalışılan saat sayısını girin (0.5 - 12 arası)">
                                <small class="text-muted" style="font-size: 11px; margin-top: 2px; display: block;">
                                    <i class="fas fa-info-circle"></i>
                                    0.5 saat artışlarla girin (örn: 3.5)
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <select class="form-control attendance-project" data-index="${index}">
                        <option value="">Proje Seçiniz</option>
                        ${projects.map(proj => `
                            <option value="${proj.id}" ${record.project_id === proj.id ? 'selected' : ''}>
                                ${proj.project_name}
                            </option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <div class="overtime-container" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <input type="number" class="form-control overtime-hours"
                                   data-index="${index}"
                                   placeholder="0"
                                   min="0"
                                   max="12"
                                   step="0.5"
                                   value="${record.overtime_hours || ''}"
                                   style="width: 70px; text-align: center; margin-bottom: 2px;"
                                   ${record.status === 'Gelmedi' ? 'disabled' : ''}>
                            <small class="text-muted" style="font-size: 10px;">saat</small>
                        </div>
                        <div class="btn-group-vertical" style="gap: 2px;">
                            <button class="btn btn-xs btn-outline-info"
                                    onclick="window.addOvertimeNote(${index})"
                                    title="Ek mesai notu ekle/düzenle"
                                    style="font-size: 10px; padding: 2px 6px;"
                                    ${!record.overtime_hours || record.overtime_hours == 0 ? 'disabled' : ''}>
                                <i class="fas fa-sticky-note"></i>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        // Setup change listeners
        setupAttendanceListeners();
        
        // Reset modified records
        modifiedRecords.clear();
        document.getElementById('saveBtn').disabled = true;

    } catch (error) {
        console.error('Puantaj yüklenirken hata:', error);
        Toast.error('Puantaj verileri yüklenirken hata oluştu');
    }
}

function setupAttendanceListeners() {
    // Status change listeners
    document.querySelectorAll('.attendance-status').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const newStatus = e.target.value;
            updateAttendanceRecord(index, 'status', newStatus);

            // Handle overtime input based on status
            const overtimeInput = document.querySelector(`.overtime-hours[data-index="${index}"]`);
            if (overtimeInput) {
                if (newStatus === 'Gelmedi') {
                    overtimeInput.disabled = true;
                    overtimeInput.value = '';
                    updateAttendanceRecord(index, 'overtime_hours', 0);
                } else {
                    overtimeInput.disabled = false;
                }
            }

            // Re-render the row to show/hide custom hours input for "Serbest Saat"
            refreshAttendanceRow(index);
        });
    });

    // Project change listeners
    document.querySelectorAll('.attendance-project').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            updateAttendanceRecord(index, 'project_id', e.target.value || null);
        });
    });
    
    // Overtime hours change listeners
    document.querySelectorAll('.overtime-hours').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = parseFloat(e.target.value) || 0;
            updateAttendanceRecord(index, 'overtime_hours', value);
            updateOvertimeButtons(index);
        });
    });

    // Custom hours change listeners
    document.querySelectorAll('.custom-hours').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = parseFloat(e.target.value) || 0;
            updateAttendanceRecord(index, 'custom_hours', value);
        });
    });
}

function refreshAttendanceRow(index) {
    const record = currentAttendanceData[index];
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    // Get projects data
    projectService.getActive().then(({ data: projects }) => {
        // Update the status cell with custom hours input if needed
        const statusCell = row.cells[1];
        statusCell.innerHTML = `
            <div class="status-container">
                <select class="form-control attendance-status" data-index="${index}">
                    <option value="Tam Gün" ${record.status === 'Tam Gün' ? 'selected' : ''}>
                        <i class="fas fa-clock"></i> Tam Gün (9 saat)
                    </option>
                    <option value="Yarım Gün" ${record.status === 'Yarım Gün' ? 'selected' : ''}>
                        <i class="fas fa-clock-o"></i> Yarım Gün (4.5 saat)
                    </option>
                    <option value="Serbest Saat" ${record.status === 'Serbest Saat' ? 'selected' : ''}>
                        <i class="fas fa-edit"></i> Serbest Saat
                    </option>
                    <option value="Gelmedi" ${record.status === 'Gelmedi' ? 'selected' : ''}>
                        <i class="fas fa-times"></i> Gelmedi
                    </option>
                </select>
                ${record.status === 'Serbest Saat' ? `
                    <div style="position: relative;">
                        <input type="number" class="form-control custom-hours"
                               data-index="${index}"
                               placeholder="Saat girişi"
                               min="0.5"
                               max="12"
                               step="0.5"
                               value="${record.custom_hours || ''}"
                               title="Çalışılan saat sayısını girin (0.5 - 12 arası)">
                        <small class="text-muted" style="font-size: 11px; margin-top: 2px; display: block;">
                            <i class="fas fa-info-circle"></i>
                            0.5 saat artışlarla girin (örn: 3.5)
                        </small>
                    </div>
                ` : ''}
            </div>
        `;

        // Update overtime input disable state
        const overtimeInput = row.querySelector('.overtime-hours');
        if (overtimeInput) {
            if (record.status === 'Gelmedi') {
                overtimeInput.disabled = true;
                overtimeInput.value = '';
                updateAttendanceRecord(index, 'overtime_hours', 0);
            } else {
                overtimeInput.disabled = false;
            }
        }

        // Re-setup listeners for this row
        setupRowListeners(index);
    });
}

function setupRowListeners(index) {
    // Status change listener for this row
    const statusSelect = document.querySelector(`.attendance-status[data-index="${index}"]`);
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            const newStatus = e.target.value;
            updateAttendanceRecord(index, 'status', newStatus);

            // Handle overtime input
            const overtimeInput = document.querySelector(`.overtime-hours[data-index="${index}"]`);
            if (overtimeInput) {
                if (newStatus === 'Gelmedi') {
                    overtimeInput.disabled = true;
                    overtimeInput.value = '';
                    updateAttendanceRecord(index, 'overtime_hours', 0);
                } else {
                    overtimeInput.disabled = false;
                }
            }

            // Re-render the row
            refreshAttendanceRow(index);
        });
    }

    // Custom hours listener for this row
    const customHoursInput = document.querySelector(`.custom-hours[data-index="${index}"]`);
    if (customHoursInput) {
        customHoursInput.addEventListener('change', (e) => {
            const value = parseFloat(e.target.value) || 0;
            updateAttendanceRecord(index, 'custom_hours', value);
        });
    }
}

function updateAttendanceRecord(index, field, value) {
    currentAttendanceData[index][field] = value;
    currentAttendanceData[index].isModified = true;
    modifiedRecords.add(index);
    
    // Update row styling
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (row) row.classList.add('modified-row');
    
    // Enable save button
    document.getElementById('saveBtn').disabled = false;
}

// Quick action buttons
window.setAttendanceQuick = function(index, status) {
    updateAttendanceRecord(index, 'status', status);
    document.querySelector(`tr[data-index="${index}"] .attendance-status`).value = status;
};

// Save attendance
window.saveAttendance = async function() {
    if (modifiedRecords.size === 0) {
        Toast.info('Değişiklik yapılmadı');
        return;
    }

    try {
        const recordsToSave = [];
        
        modifiedRecords.forEach(index => {
            const record = currentAttendanceData[index];

            // Validation
            if (!record.employee_id || !record.work_date || !record.status) {
                console.error('Invalid record data:', record);
                return;
            }

            const recordData = {
                employee_id: record.employee_id,
                work_date: record.work_date,
                status: record.status,
                project_id: record.project_id || null,
                overtime_hours: parseFloat(record.overtime_hours) || 0.00,
                overtime_note: record.overtime_note || '',
                custom_hours: record.status === 'Serbest Saat' ? parseFloat(record.custom_hours) || 0.00 : 0.00
            };

            // Only include ID if it exists (for updates)
            if (record.record_id && record.record_id !== 'new') {
                recordData.id = record.record_id;
            }

            recordsToSave.push(recordData);
        });

        const { error } = await attendanceService.upsert(recordsToSave);
        if (error) throw error;

        Toast.success(`${recordsToSave.length} kayıt güncellendi`);
        
        // Reload data
        const date = document.getElementById('attendanceDate').value;
        await loadAttendanceData(date);
        
    } catch (error) {
        console.error('Puantaj kaydedilirken hata:', error);
        Toast.error('Puantaj kaydedilirken hata oluştu');
    }
};

// Update overtime buttons enabled/disabled state
function updateOvertimeButtons(index) {
    const record = currentAttendanceData[index];
    const hasOvertime = record.overtime_hours && record.overtime_hours > 0;

    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    const noteBtn = row.querySelector('.btn-outline-info');
    const editBtn = row.querySelector('.btn-outline-warning');

    if (noteBtn) noteBtn.disabled = !hasOvertime;
    if (editBtn) editBtn.disabled = !hasOvertime;
}

// Overtime note functionality
function addOvertimeNote(index) {
    try {
        console.log('addOvertimeNote called with index:', index);

        if (!currentAttendanceData || !currentAttendanceData[index]) {
            console.error('No attendance data for index:', index);
            Toast.error('Kayıt bulunamadı');
            return;
        }

        const record = currentAttendanceData[index];
        console.log('Record:', record);

        if (!record.overtime_hours || record.overtime_hours == 0) {
            Toast.error('Ek mesai saati olmayan personel için not eklenemez');
            return;
        }

    const modal = new Modal({
        title: `${record.employee_name} - Ek Mesai Notu`,
        content: `
            <div class="form-group">
                <label>Ek Mesai Saati:</label>
                <p class="font-weight-bold text-primary">${record.overtime_hours} saat</p>
            </div>
            <div class="form-group">
                <label for="overtimeNote">Not:</label>
                <textarea id="overtimeNote" class="form-control" rows="4"
                          placeholder="Ek mesai ile ilgili not ekleyin...">${record.overtime_note || ''}</textarea>
            </div>
        `,
        buttons: [
            {
                text: 'İptal',
                class: 'btn-secondary',
                click: (modal) => modal.close()
            },
            {
                text: 'Kaydet',
                class: 'btn-primary',
                click: (modal) => {
                    try {
                        const noteElement = modal.element.querySelector('#overtimeNote');
                        if (!noteElement) {
                            console.error('Note textarea not found');
                            Toast.error('Not alanı bulunamadı');
                            return;
                        }
                        const note = noteElement.value.trim();
                        console.log('Saving note:', note);
                        updateAttendanceRecord(index, 'overtime_note', note);
                        Toast.success('Ek mesai notu güncellendi');
                        modal.close();
                    } catch (error) {
                        console.error('Error saving note:', error);
                        Toast.error('Not kaydedilirken hata oluştu');
                    }
                }
            }
        ]
    });

    modal.show();
    } catch (error) {
        console.error('Error in addOvertimeNote:', error);
        Toast.error('Not ekleme işleminde hata oluştu');
    }
}

// Export to window for global access
window.addOvertimeNote = addOvertimeNote;


