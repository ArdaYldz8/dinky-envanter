// Attendance (Puantaj) Page
import { attendanceService, employeeService, projectService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

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

let currentAttendanceData = [];
let modifiedRecords = new Set();

export async function loadAttendance() {
    const content = document.getElementById('mainContent');
    const today = formatter.dateForInput();
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-calendar-check"></i> Günlük Puantaj</h1>
            <div class="page-actions">
                <input type="date" id="attendanceDate" class="form-control" value="${today}">
                <button class="btn btn-success" onclick="window.saveAttendance()" id="saveBtn" disabled>
                    <i class="fas fa-save"></i> Kaydet
                </button>
            </div>
        </div>
        
        <div class="page-content">
            <div class="info-bar">
                <p><i class="fas fa-info-circle"></i> Değişiklik yaptığınız satırlar vurgulanacaktır. Kaydet butonuna tıklayarak değişiklikleri kaydedebilirsiniz.</p>
                <p><i class="fas fa-clock"></i> <strong>Ek Mesai:</strong> Normal mesai saatlerinin üzerine yapılan ek çalışma saatleridir. Tam gün = 8 saat, Yarım gün = 4 saat normal mesai.</p>
            </div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Durum</th>
                            <th>Proje</th>
                            <th>Günün Görevi</th>
                            <th>Ek Mesai</th>
                        </tr>
                    </thead>
                    <tbody id="attendanceTableBody">
                        <tr>
                            <td colspan="5" class="text-center">Yükleniyor...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Setup date change listener
    document.getElementById('attendanceDate').addEventListener('change', (e) => {
        loadAttendanceData(e.target.value);
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
            daily_task: attendanceMap[emp.id]?.daily_task || '',
            overtime_hours: attendanceMap[emp.id]?.overtime_hours || 0,
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
                    <select class="form-control attendance-status" data-index="${index}">
                        <option value="Tam Gün" ${record.status === 'Tam Gün' ? 'selected' : ''}>Tam Gün</option>
                        <option value="Yarım Gün" ${record.status === 'Yarım Gün' ? 'selected' : ''}>Yarım Gün</option>
                        <option value="Gelmedi" ${record.status === 'Gelmedi' ? 'selected' : ''}>Gelmedi</option>
                    </select>
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
                    <input type="text" class="form-control daily-task" 
                           data-index="${index}" 
                           placeholder="Günün görevi..." 
                           value="${record.daily_task || ''}"
                           maxlength="510"
                           style="min-width: 200px;">
                </td>
                <td>
                    <input type="number" class="form-control overtime-hours" 
                           data-index="${index}" 
                           placeholder="0" 
                           min="0" 
                           max="12" 
                           step="0.5" 
                           value="${record.overtime_hours || ''}"
                           style="width: 80px; text-align: center;"
                           ${record.status === 'Gelmedi' ? 'disabled' : ''}>
                    <small class="text-muted">ek saat</small>
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
            updateAttendanceRecord(index, 'status', e.target.value);
            
            // Disable/enable overtime input based on status
            const overtimeInput = document.querySelector(`.overtime-hours[data-index="${index}"]`);
            if (overtimeInput) {
                if (e.target.value === 'Gelmedi') {
                    overtimeInput.disabled = true;
                    overtimeInput.value = '';
                    updateAttendanceRecord(index, 'overtime_hours', 0);
                } else {
                    overtimeInput.disabled = false;
                }
            }
        });
    });

    // Project change listeners
    document.querySelectorAll('.attendance-project').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            updateAttendanceRecord(index, 'project_id', e.target.value || null);
        });
    });
    
    // Daily task change listeners
    document.querySelectorAll('.daily-task').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            updateAttendanceRecord(index, 'daily_task', e.target.value || '');
        });
    });
    
    // Overtime hours change listeners
    document.querySelectorAll('.overtime-hours').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const value = parseFloat(e.target.value) || 0;
            updateAttendanceRecord(index, 'overtime_hours', value);
        });
    });
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
            const recordData = {
                employee_id: record.employee_id,
                work_date: record.work_date,
                status: record.status,
                project_id: record.project_id || null,
                daily_task: record.daily_task || null,
                overtime_hours: parseFloat(record.overtime_hours) || 0.00,
                created_by: null // Always null for now since we don't have users in DB
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