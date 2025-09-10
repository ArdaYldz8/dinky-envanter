// Task Management Page
import { taskService, taskPersonnelService, supabase } from '../services/supabaseService.js';
import { Toast } from '../utils/toast.js';

// Global filter state
let selectedPersonnelFilter = '';

export async function loadTasks() {
    console.log('Loading tasks page...');
    
    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('mainContent element not found!');
        return;
    }
    
    content.innerHTML = `
        <div class="task-page">
            <!-- Professional Page Header -->
            <div class="task-page-header">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                    <h1><i class="fas fa-tasks"></i> Görev Yönetimi</h1>
                    
                    <!-- Personnel Filter -->
                    <div class="filter-section">
                        <label for="personelFilter" style="margin-right: 10px; font-weight: 500; color: #495057;">
                            <i class="fas fa-filter"></i> Personel Filtresi:
                        </label>
                        <select id="personelFilter" class="task-form-control" style="width: 200px; display: inline-block;">
                            <option value="">Tüm Personel</option>
                        </select>
                        <button id="clearFilterBtn" class="task-btn task-btn-warning" style="margin-left: 8px; display: none;">
                            <i class="fas fa-times"></i> Temizle
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Task Grid Layout -->
            <div class="task-grid">
                <!-- Left Column -->
                <div class="task-main-content">
                    <!-- New Task Card -->
                    <div class="task-card">
                        <div class="task-card-header">
                            <h5>Yeni Görev Ekle</h5>
                        </div>
                        <div class="task-card-body">
                            <div class="task-form-row">
                                <div class="form-group">
                                    <label>Personel:</label>
                                    <select id="personelSelect" class="task-form-control">
                                        <option value="">Personel seçin...</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Görev:</label>
                                    <input type="text" id="gorevInput" class="task-form-control" placeholder="Görev açıklaması...">
                                </div>
                                <div class="form-group">
                                    <label>&nbsp;</label>
                                    <button id="gorevEkleBtn" class="task-btn task-btn-success">
                                        <i class="fas fa-plus"></i> Ekle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pending Tasks List -->
                    <div class="task-list-container" style="margin-top: 20px;">
                        <div class="task-list-header">
                            <i class="fas fa-clock"></i> Bekleyen Görevler
                        </div>
                        <div id="pendingTasksContainer">
                            <div class="task-loading">
                                <i class="fas fa-spinner"></i>
                                <p>Bekleyen görevler yükleniyor...</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Column -->
                <div class="task-sidebar">
                    <!-- Personnel Management Card -->
                    <div class="task-card">
                        <div class="task-card-header">
                            <h5>Personel Yönetimi</h5>
                        </div>
                        <div class="task-card-body" style="text-align: center;">
                            <button id="personelYonetBtn" class="task-btn task-btn-primary">
                                <i class="fas fa-users"></i> Personel Ayarları
                            </button>
                            <p style="margin-top: 12px; color: #6c757d; font-size: 14px; margin-bottom: 0;">
                                Görev personellerini yönetin
                            </p>
                        </div>
                    </div>

                    <!-- Completed Tasks Widget -->
                    <div class="task-list-container" style="margin-top: 20px;">
                        <div class="task-list-header">
                            <i class="fas fa-check-circle"></i> Tamamlanan Görevler
                        </div>
                        <div id="completedTasksContainer">
                            <div class="task-loading">
                                <i class="fas fa-spinner"></i>
                                <p>Tamamlanan görevler yükleniyor...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Simple Personnel Modal -->
        <div id="personelModal" class="custom-modal" style="display: none;">
            <div class="custom-modal-overlay" onclick="personelModalKapat()"></div>
            <div class="custom-modal-content">
                <div class="custom-modal-header">
                    <h5><i class="fas fa-users"></i> Personel Yönetimi</h5>
                    <button type="button" class="custom-modal-close" onclick="personelModalKapat()">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="custom-modal-body">
                    <!-- Add New Personnel -->
                    <div class="task-card">
                        <div class="task-card-header">
                            <h5>Yeni Personel Ekle</h5>
                        </div>
                        <div class="task-card-body">
                            <div class="task-form-row">
                                <div class="form-group">
                                    <label>Ad Soyad:</label>
                                    <input type="text" id="yeniPersonelAd" class="task-form-control" placeholder="Personel adını girin">
                                </div>
                                <div class="form-group">
                                    <label>Departman:</label>
                                    <input type="text" id="yeniPersonelDepartman" class="task-form-control" placeholder="Departman adı (opsiyonel)">
                                </div>
                                <div class="form-group">
                                    <label>&nbsp;</label>
                                    <button id="personelEkleBtn" class="task-btn task-btn-success">
                                        <i class="fas fa-plus"></i> Ekle
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Personnel List -->
                    <div class="task-card" style="margin-top: 20px;">
                        <div class="task-card-header">
                            <h5>Mevcut Personeller</h5>
                            <button id="orphanedTasksBtn" class="task-btn task-btn-warning" style="font-size: 12px; padding: 4px 8px;">
                                <i class="fas fa-broom"></i> Atanmamış Görevleri Temizle
                            </button>
                        </div>
                        <div class="task-card-body" style="max-height: 400px; overflow-y: auto;">
                            <div id="personelListesi">
                                <div class="task-loading">
                                    <i class="fas fa-spinner"></i>
                                    <p>Personeller yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        // Event listener'ları ekle
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Veri yükle
        console.log('Loading initial data...');
        await loadData();
        
        // Sayfa yüklendiğinde mevcut atanmamış görevleri otomatik temizle
        setTimeout(() => {
            otomatikAtanmamisGorevleriTemizle();
        }, 1000);
        
        console.log('✓ Tasks page loaded successfully');
        
    } catch (error) {
        console.error('Error loading tasks page:', error);
        Toast.error('Görev yönetimi sayfası yüklenirken hata oluştu');
    }
}

function setupEventListeners() {
    console.log('Setting up task page event listeners...');
    
    // Görev ekleme - with error checking
    const gorevEkleBtn = document.getElementById('gorevEkleBtn');
    if (gorevEkleBtn) {
        gorevEkleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Görev ekle button clicked');
            gorevEkle();
        });
        console.log('✓ Görev ekle button listener added');
    } else {
        console.error('✗ gorevEkleBtn element not found');
    }
    
    // Personel modal aç - with error checking
    const personelYonetBtn = document.getElementById('personelYonetBtn');
    if (personelYonetBtn) {
        personelYonetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Personel yönet button clicked');
            personelModalAc();
        });
        console.log('✓ Personel yönet button listener added');
    } else {
        console.error('✗ personelYonetBtn element not found');
    }
    
    // Personel ekleme - with error checking
    const personelEkleBtn = document.getElementById('personelEkleBtn');
    if (personelEkleBtn) {
        personelEkleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Personel ekle button clicked');
            personelEkle();
        });
        console.log('✓ Personel ekle button listener added');
    } else {
        console.error('✗ personelEkleBtn element not found');
    }
    
    // Modal kapatma - with error checking (now using custom modal)
    const modal = document.getElementById('personelModal');
    if (modal) {
        const closeBtn = modal.querySelector('.custom-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Modal close button clicked');
                personelModalKapat();
            });
            console.log('✓ Modal close button listener added');
        } else {
            console.error('✗ Modal close button not found');
        }
    } else {
        console.error('✗ personelModal element not found');
    }
    
    // Personnel filter - with error checking
    const personelFilter = document.getElementById('personelFilter');
    if (personelFilter) {
        personelFilter.addEventListener('change', (e) => {
            console.log('Personnel filter changed:', e.target.value);
            selectedPersonnelFilter = e.target.value;
            applyPersonnelFilter();
        });
        console.log('✓ Personnel filter listener added');
    } else {
        console.error('✗ personelFilter element not found');
    }
    
    // Clear filter button
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clear filter button clicked');
            clearPersonnelFilter();
        });
        console.log('✓ Clear filter button listener added');
    } else {
        console.error('✗ clearFilterBtn element not found');
    }
    
    // Orphaned tasks cleanup button
    const orphanedTasksBtn = document.getElementById('orphanedTasksBtn');
    if (orphanedTasksBtn) {
        orphanedTasksBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Orphaned tasks cleanup button clicked');
            temizleAtanmamisGorevler();
        });
        console.log('✓ Orphaned tasks cleanup button listener added');
    } else {
        console.error('✗ orphanedTasksBtn element not found');
    }
    
    console.log('Event listeners setup completed');
}

async function loadData() {
    await Promise.all([
        personelListesiYukle(),
        personelFilterYukle(),
        bekleyenGorevleriYukle(),
        tamamlananGorevleriYukle()
    ]);
}

// Personel select'ini doldur
async function personelListesiYukle() {
    try {
        const { data: personeller, error } = await taskPersonnelService.getActive();
        
        const select = document.getElementById('personelSelect');
        select.innerHTML = '<option value="">Personel seçin...</option>';
        
        if (personeller) {
            personeller.forEach(personel => {
                const option = document.createElement('option');
                option.value = personel.id;
                option.textContent = `${personel.name}${personel.department ? ' (' + personel.department + ')' : ''}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Personel yükleme hatası:', error);
    }
}

// Görevleri yükle ve göster
// Bekleyen görevleri yükle ve göster
async function bekleyenGorevleriYukle() {
    try {
        console.log('Fetching pending tasks...');
        
        const { data: gorevler, error } = await taskService.getTasksWithPersonnel();
        
        const container = document.getElementById('pendingTasksContainer');
        
        // Sadece bekleyen görevleri filtrele
        let bekleyenGorevler = gorevler ? gorevler.filter(gorev => !gorev.is_completed) : [];
        
        // Personel filtresini uygula
        if (selectedPersonnelFilter) {
            bekleyenGorevler = bekleyenGorevler.filter(gorev => gorev.assigned_to_id === selectedPersonnelFilter);
        }
        
        if (bekleyenGorevler.length === 0) {
            const emptyMessage = selectedPersonnelFilter ? 
                'Bu personelin bekleyen görevi yok' : 
                'Tüm görevler tamamlanmış!';
            
            container.innerHTML = `
                <div class="task-empty-state">
                    <i class="fas fa-clock"></i>
                    <h5>Bekleyen görev yok</h5>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        bekleyenGorevler.forEach(gorev => {
            const personelAd = gorev.task_personnel?.name || 'Atanmamış';
            const departman = gorev.task_personnel?.department || '';
            const tarih = new Date(gorev.created_at).toLocaleDateString('tr-TR');
            
            html += `
                <div class="task-item pending">
                    <div class="task-title">${gorev.title}</div>
                    <div class="task-meta">
                        <div class="task-assignee">
                            <i class="fas fa-user"></i>
                            <span>${personelAd}${departman ? ' (' + departman + ')' : ''}</span>
                        </div>
                        <div class="task-status-badge task-status-pending">
                            Bekliyor
                        </div>
                        <div style="color: #64748b;">
                            <i class="fas fa-calendar-alt"></i> ${tarih}
                        </div>
                        <button class="task-btn task-btn-success" style="margin-left: auto;"
                                onclick="gorevDurumDegistir('${gorev.id}', true)">
                            <i class="fas fa-check"></i> Tamamla
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Bekleyen görevler yüklenirken hata:', error);
        Toast.error('Bekleyen görevler yüklenemedi');
    }
}

// Tamamlanan görevleri yükle ve göster
async function tamamlananGorevleriYukle() {
    try {
        console.log('Fetching completed tasks...');
        
        const { data: gorevler, error } = await taskService.getTasksWithPersonnel();
        
        const container = document.getElementById('completedTasksContainer');
        
        // Sadece tamamlanan görevleri filtrele
        let tamamlananGorevler = gorevler ? gorevler.filter(gorev => gorev.is_completed) : [];
        
        // Personel filtresini uygula
        if (selectedPersonnelFilter) {
            tamamlananGorevler = tamamlananGorevler.filter(gorev => gorev.assigned_to_id === selectedPersonnelFilter);
        }
        
        if (tamamlananGorevler.length === 0) {
            const emptyMessage = selectedPersonnelFilter ? 
                'Bu personelin tamamlanan görevi yok' : 
                'Henüz görev tamamlanmamış';
            
            container.innerHTML = `
                <div class="task-empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h5>Tamamlanan görev yok</h5>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        tamamlananGorevler.slice(0, 5).forEach(gorev => { // Son 5 tamamlanan görev
            const personelAd = gorev.task_personnel?.name || 'Atanmamış';
            const departman = gorev.task_personnel?.department || '';
            const tarih = new Date(gorev.completed_at || gorev.created_at).toLocaleDateString('tr-TR');
            
            html += `
                <div class="task-item completed">
                    <div class="task-title">${gorev.title}</div>
                    <div class="task-meta">
                        <div class="task-assignee">
                            <i class="fas fa-user"></i>
                            <span>${personelAd}${departman ? ' (' + departman + ')' : ''}</span>
                        </div>
                        <div class="task-status-badge task-status-completed">
                            Tamamlandı
                        </div>
                        <div style="color: #64748b;">
                            <i class="fas fa-check"></i> ${tarih}
                        </div>
                        <button class="task-btn task-btn-warning" style="margin-left: auto;"
                                onclick="gorevDurumDegistir('${gorev.id}', false)">
                            <i class="fas fa-undo"></i> Geri Al
                        </button>
                    </div>
                </div>
            `;
        });
        
        // Eğer 5'den fazla tamamlanan görev varsa, toplam sayısını göster
        if (tamamlananGorevler.length > 5) {
            html += `
                <div style="text-align: center; padding: 10px; color: #6c757d; font-size: 14px; border-top: 1px solid #f1f3f4;">
                    <i class="fas fa-info-circle"></i> Toplam ${tamamlananGorevler.length} tamamlanan görev (Son 5 tanesi gösteriliyor)
                </div>
            `;
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Tamamlanan görevler yüklenirken hata:', error);
        Toast.error('Tamamlanan görevler yüklenemedi');
    }
}

// Görev ekleme
async function gorevEkle() {
    const personelId = document.getElementById('personelSelect').value;
    const gorevText = document.getElementById('gorevInput').value.trim();
    
    if (!personelId) {
        Toast.warning('Lütfen personel seçin');
        return;
    }
    
    if (!gorevText) {
        Toast.warning('Lütfen görev açıklaması girin');
        return;
    }
    
    try {
        const { error } = await taskService.addTask({
            title: gorevText,
            assigned_to_id: personelId
        });
        
        if (error) throw error;
        
        Toast.success('Görev eklendi');
        
        // Formu temizle
        document.getElementById('gorevInput').value = '';
        document.getElementById('personelSelect').value = '';
        
        // Listeleri yenile
        await Promise.all([
            bekleyenGorevleriYukle(),
            tamamlananGorevleriYukle()
        ]);
        
    } catch (error) {
        console.error('Görev ekleme hatası:', error);
        Toast.error('Görev eklenemedi');
    }
}

// Görev durumunu değiştir
window.gorevDurumDegistir = async function(gorevId, tamamlandi) {
    try {
        const { error } = await taskService.updateTaskStatus(gorevId, tamamlandi);
        
        if (error) throw error;
        
        Toast.success(tamamlandi ? 'Görev tamamlandı' : 'Görev tekrar açıldı');
        
        await Promise.all([
            bekleyenGorevleriYukle(),
            tamamlananGorevleriYukle()
        ]);
        
    } catch (error) {
        console.error('Görev güncelleme hatası:', error);
        Toast.error('Görev güncellenemedi');
    }
};

// Personel modal aç
function personelModalAc() {
    console.log('Opening personnel modal...');
    const modal = document.getElementById('personelModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        console.log('✓ Personnel modal opened');
        
        // Personel listesini yükle
        modalPersonelListesiYukle();
    } else {
        console.error('Personnel modal not found');
    }
}

// Personel modal kapat
window.personelModalKapat = function() {
    console.log('Closing personnel modal...');
    const modal = document.getElementById('personelModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        console.log('✓ Personnel modal closed');
    } else {
        console.error('Personnel modal not found');
    }
};

// Modal içindeki personel listesini yükle
async function modalPersonelListesiYukle() {
    try {
        const { data: personeller, error } = await taskPersonnelService.getAll();
        
        const container = document.getElementById('personelListesi');
        
        if (!personeller || personeller.length === 0) {
            container.innerHTML = `
                <div class="task-empty-state">
                    <i class="fas fa-users"></i>
                    <h5>Henüz personel bulunmuyor</h5>
                    <p>Yukarıdaki formu kullanarak personel ekleyin</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        personeller.forEach(personel => {
            const durum = personel.is_active ? 'Aktif' : 'Pasif';
            const statusClass = personel.is_active ? 'completed' : 'pending';
            const toggleText = personel.is_active ? 'Pasifleştir' : 'Aktifleştir';
            const toggleClass = personel.is_active ? 'task-btn-warning' : 'task-btn-success';
            const toggleIcon = personel.is_active ? 'pause' : 'play';
            
            html += `
                <div class="personnel-card">
                    <div class="personnel-name">${personel.name}</div>
                    <div class="personnel-department">${personel.department || 'Departman belirtilmemiş'}</div>
                    <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="task-status-badge task-status-${statusClass}">
                            ${durum}
                        </div>
                        <div class="personnel-actions">
                            <button class="task-btn ${toggleClass}" 
                                    onclick="personelDurumDegistir('${personel.id}', ${!personel.is_active})">
                                <i class="fas fa-${toggleIcon}"></i> ${toggleText}
                            </button>
                            <button class="task-btn task-btn-danger" 
                                    onclick="personelSil('${personel.id}')">
                                <i class="fas fa-trash"></i> Sil
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Personel listesi yükleme hatası:', error);
    }
}

// Personel ekleme
async function personelEkle() {
    const ad = document.getElementById('yeniPersonelAd').value.trim();
    const departman = document.getElementById('yeniPersonelDepartman').value.trim();
    
    if (!ad) {
        Toast.warning('Lütfen personel adını girin');
        return;
    }
    
    try {
        const { error } = await taskPersonnelService.add({
            name: ad,
            department: departman || null
        });
        
        if (error) throw error;
        
        Toast.success('Personel eklendi');
        
        // Formu temizle
        document.getElementById('yeniPersonelAd').value = '';
        document.getElementById('yeniPersonelDepartman').value = '';
        
        // Listeleri yenile
        await Promise.all([
            modalPersonelListesiYukle(),
            personelListesiYukle(),
            personelFilterYukle()
        ]);
        
    } catch (error) {
        console.error('Personel ekleme hatası:', error);
        Toast.error('Personel eklenemedi');
    }
}

// Personel durumunu değiştir
window.personelDurumDegistir = async function(personelId, aktif) {
    try {
        const { error } = await taskPersonnelService.update(personelId, { is_active: aktif });
        
        if (error) throw error;
        
        Toast.success(aktif ? 'Personel aktifleştirildi' : 'Personel pasifleştirildi');
        
        await Promise.all([
            modalPersonelListesiYukle(),
            personelListesiYukle(),
            personelFilterYukle()
        ]);
        
    } catch (error) {
        console.error('Personel güncelleme hatası:', error);
        Toast.error('İşlem başarısız');
    }
};

// Personel sil - CASCADE DELETE
window.personelSil = async function(personelId) {
    try {
        const { data: gorevler } = await taskService.getTasksWithPersonnel();
        const personelGorevleri = gorevler ? gorevler.filter(g => g.assigned_to_id === personelId) : [];
        
        let confirmMessage = 'Bu personeli silmek istediğinizden emin misiniz?';
        if (personelGorevleri.length > 0) {
            confirmMessage = `Bu personelin ${personelGorevleri.length} adet görevi var. Personel ve görevleri birlikte silinecek. Devam etmek istediğinizden emin misiniz?\n\nSilinecek görevler:\n${personelGorevleri.slice(0, 3).map(g => `- ${g.title}`).join('\n')}${personelGorevleri.length > 3 ? '\n... ve ' + (personelGorevleri.length - 3) + ' tane daha' : ''}`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Önce personelin görevlerini sil
        if (personelGorevleri.length > 0) {
            console.log(`Deleting ${personelGorevleri.length} tasks for personnel...`);
            for (const gorev of personelGorevleri) {
                try {
                    await supabase
                        .from('tasks')
                        .delete()
                        .eq('id', gorev.id);
                } catch (err) {
                    console.error('Error deleting task:', gorev.id, err);
                }
            }
        }
        
        // Sonra personeli sil
        const { error } = await taskPersonnelService.delete(personelId);
        
        if (error) throw error;
        
        Toast.success(`Personel ve ${personelGorevleri.length} görevi silindi`);
        
        await Promise.all([
            modalPersonelListesiYukle(),
            personelListesiYukle(),
            personelFilterYukle(),
            bekleyenGorevleriYukle(),
            tamamlananGorevleriYukle()
        ]);
        
    } catch (error) {
        console.error('Personel silme hatası:', error);
        Toast.error('Personel silinemedi');
    }
};

// Personel filter dropdown'ını doldur
async function personelFilterYukle() {
    try {
        const { data: personeller, error } = await taskPersonnelService.getActive();
        
        const filter = document.getElementById('personelFilter');
        if (!filter) return;
        
        // İlk option'ı koru, diğerlerini ekle
        filter.innerHTML = '<option value="">Tüm Personel</option>';
        
        if (personeller) {
            personeller.forEach(personel => {
                const option = document.createElement('option');
                option.value = personel.id;
                option.textContent = `${personel.name}${personel.department ? ' (' + personel.department + ')' : ''}`;
                filter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Personel filter yüklenirken hata:', error);
    }
}

// Personel filtresini uygula
async function applyPersonnelFilter() {
    console.log('Applying personnel filter:', selectedPersonnelFilter);
    
    // Clear/Show filter button'ı göster/gizle
    const clearBtn = document.getElementById('clearFilterBtn');
    if (clearBtn) {
        clearBtn.style.display = selectedPersonnelFilter ? 'inline-flex' : 'none';
    }
    
    // Görev listelerini filtreli olarak yeniden yükle
    await Promise.all([
        bekleyenGorevleriYukle(),
        tamamlananGorevleriYukle()
    ]);
}

// Personel filtresini temizle
async function clearPersonnelFilter() {
    console.log('Clearing personnel filter');
    
    selectedPersonnelFilter = '';
    
    // Filter dropdown'ını sıfırla
    const filter = document.getElementById('personelFilter');
    if (filter) {
        filter.value = '';
    }
    
    // Clear button'ı gizle
    const clearBtn = document.getElementById('clearFilterBtn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // Görev listelerini yeniden yükle
    await Promise.all([
        bekleyenGorevleriYukle(),
        tamamlananGorevleriYukle()
    ]);
}

// Atanmamış görevleri temizle
async function temizleAtanmamisGorevler() {
    try {
        const { data: gorevler } = await taskService.getTasksWithPersonnel();
        const atanmamisGorevler = gorevler ? gorevler.filter(g => !g.assigned_to_id || g.task_personnel === null) : [];
        
        if (atanmamisGorevler.length === 0) {
            Toast.info('Atanmamış görev bulunmuyor');
            return;
        }
        
        const confirmMessage = `${atanmamisGorevler.length} adet atanmamış görev var. Bu görevleri silmek istediğinizden emin misiniz?\n\nSilinecek görevler:\n${atanmamisGorevler.slice(0, 5).map(g => `- ${g.title}`).join('\n')}${atanmamisGorevler.length > 5 ? '\n... ve ' + (atanmamisGorevler.length - 5) + ' tane daha' : ''}`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Atanmamış görevleri sil
        console.log(`Deleting ${atanmamisGorevler.length} orphaned tasks...`);
        let deletedCount = 0;
        
        for (const gorev of atanmamisGorevler) {
            try {
                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', gorev.id);
                    
                if (!error) {
                    deletedCount++;
                }
            } catch (err) {
                console.error('Error deleting task:', gorev.id, err);
            }
        }
        
        if (deletedCount > 0) {
            Toast.success(`${deletedCount} atanmamış görev silindi`);
            
            // Görev listelerini yenile
            await Promise.all([
                bekleyenGorevleriYukle(),
                tamamlananGorevleriYukle()
            ]);
        } else {
            Toast.error('Görevler silinemedi');
        }
        
    } catch (error) {
        console.error('Atanmamış görev temizleme hatası:', error);
        Toast.error('Temizlik işlemi başarısız');
    }
}

// Otomatik atanmamış görev temizleme (sessiz)
async function otomatikAtanmamisGorevleriTemizle() {
    try {
        console.log('Checking for orphaned tasks...');
        const { data: gorevler } = await taskService.getTasksWithPersonnel();
        const atanmamisGorevler = gorevler ? gorevler.filter(g => !g.assigned_to_id || g.task_personnel === null) : [];
        
        if (atanmamisGorevler.length === 0) {
            console.log('No orphaned tasks found');
            return;
        }
        
        console.log(`Found ${atanmamisGorevler.length} orphaned tasks, cleaning up...`);
        
        // Atanmamış görevleri sessizce sil
        let deletedCount = 0;
        
        for (const gorev of atanmamisGorevler) {
            try {
                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', gorev.id);
                    
                if (!error) {
                    deletedCount++;
                }
            } catch (err) {
                console.error('Error deleting orphaned task:', gorev.id, err);
            }
        }
        
        if (deletedCount > 0) {
            console.log(`Automatically cleaned ${deletedCount} orphaned tasks`);
            Toast.info(`${deletedCount} atanmamış görev temizlendi`);
            
            // Görev listelerini yenile
            await Promise.all([
                bekleyenGorevleriYukle(),
                tamamlananGorevleriYukle()
            ]);
        }
        
    } catch (error) {
        console.error('Otomatik temizlik hatası:', error);
    }
}