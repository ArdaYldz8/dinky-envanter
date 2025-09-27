// Quality Control Page
// Kalite Kontrol Sayfası

import { qualityControlService } from '../services/qualityControlService.js';
import { supabaseService } from '../services/supabaseService.js';

class QualityControlPage {
    constructor() {
        this.currentUser = null;
        this.issues = [];
        this.filters = {
            status: '',
            priority: '',
            assignedTo: '',
            dateFrom: '',
            dateTo: ''
        };
    }

    async init() {
        this.currentUser = await supabaseService.getCurrentUser();
        await this.loadIssues();
        await this.loadDashboardStats();
        this.setupEventListeners();
    }

    render() {
        return `
            <div class="quality-control-container">
                <!-- Header Section -->
                <div class="qc-header">
                    <div class="qc-title">
                        <i class="fas fa-shield-alt"></i>
                        Kalite Kontrol Sistemi
                    </div>
                    <div class="qc-stats" id="qcStats">
                        <div class="stat-item">
                            <span class="stat-number" id="totalIssues">-</span>
                            <span class="stat-label">Toplam Hata</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="openIssues">-</span>
                            <span class="stat-label">Açık Hatalar</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="todayIssues">-</span>
                            <span class="stat-label">Bugünkü</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number" id="avgFixTime">-</span>
                            <span class="stat-label">Ort. Çözüm (dk)</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="qc-actions">
                    <button class="qc-btn primary" id="newIssueBtn">
                        <i class="fas fa-plus"></i>
                        Yeni Hata Bildirimi
                    </button>
                    <button class="qc-btn secondary" id="myIssuesBtn">
                        <i class="fas fa-user"></i>
                        Benim Görevlerim
                    </button>
                    <button class="qc-btn secondary" id="reportsBtn">
                        <i class="fas fa-chart-bar"></i>
                        Raporlar
                    </button>
                    <button class="qc-btn secondary" id="refreshBtn">
                        <i class="fas fa-sync-alt"></i>
                        Yenile
                    </button>
                </div>

                <!-- Filters -->
                <div class="qc-filters">
                    <div class="filters-row">
                        <div class="filter-group">
                            <label>Durum</label>
                            <select class="filter-select" id="statusFilter">
                                <option value="">Tüm Durumlar</option>
                                <option value="reported">Bildirildi</option>
                                <option value="assigned">Atandı</option>
                                <option value="in_progress">Devam Ediyor</option>
                                <option value="fixed">Düzeltildi</option>
                                <option value="review">İncelemede</option>
                                <option value="approved">Onaylandı</option>
                                <option value="rejected">Reddedildi</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Öncelik</label>
                            <select class="filter-select" id="priorityFilter">
                                <option value="">Tüm Öncelikler</option>
                                <option value="low">Düşük</option>
                                <option value="medium">Orta</option>
                                <option value="high">Yüksek</option>
                                <option value="critical">Kritik</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Başlangıç Tarihi</label>
                            <input type="date" class="filter-input" id="dateFromFilter">
                        </div>
                        <div class="filter-group">
                            <label>Bitiş Tarihi</label>
                            <input type="date" class="filter-input" id="dateToFilter">
                        </div>
                        <div class="filter-group">
                            <label>&nbsp;</label>
                            <button class="qc-btn secondary" id="clearFiltersBtn">
                                <i class="fas fa-times"></i>
                                Filtreleri Temizle
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Issues Grid -->
                <div class="issues-grid" id="issuesGrid">
                    <!-- Issues will be loaded here -->
                </div>

                <!-- Loading State -->
                <div id="loadingState" style="display: none; text-align: center; padding: 40px;">
                    <div class="spinner"></div>
                    Hatalar yükleniyor...
                </div>

                <!-- Empty State -->
                <div id="emptyState" style="display: none; text-align: center; padding: 60px;">
                    <i class="fas fa-search" style="font-size: 48px; color: #9CA3AF; margin-bottom: 20px;"></i>
                    <h3 style="color: #6B7280; margin-bottom: 10px;">Henüz hata bildirimi yok</h3>
                    <p style="color: #9CA3AF;">İlk hata bildiriminizi oluşturmak için "Yeni Hata Bildirimi" butonuna tıklayın.</p>
                </div>
            </div>

            <!-- New Issue Modal -->
            <div class="qc-modal" id="newIssueModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Yeni Hata Bildirimi</h3>
                        <button class="modal-close" id="closeNewIssueModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form class="qc-form" id="newIssueForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Hata Başlığı *</label>
                                    <input type="text" class="form-input" id="issueTitle" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Öncelik Seviyesi</label>
                                    <select class="form-select" id="issuePriority">
                                        <option value="low">Düşük</option>
                                        <option value="medium" selected>Orta</option>
                                        <option value="high">Yüksek</option>
                                        <option value="critical">Kritik</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Lokasyon</label>
                                    <input type="text" class="form-input" id="issueLocation" placeholder="Örn: A Blok 3. Kat">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Sorumlu Usta</label>
                                    <select class="form-select" id="assignedWorker">
                                        <option value="">Seçiniz...</option>
                                        <!-- Workers will be loaded here -->
                                    </select>
                                </div>
                            </div>
                            <div class="form-group full-width">
                                <label class="form-label">Hata Açıklaması *</label>
                                <textarea class="form-textarea" id="issueDescription" required
                                    placeholder="Hatanın detaylı açıklamasını yazın..."></textarea>
                            </div>
                            <div class="form-group full-width">
                                <label class="form-label">Çözüm Notları</label>
                                <textarea class="form-textarea" id="reporterNotes"
                                    placeholder="Nasıl düzeltilmesi gerektiğine dair notlarınız..."></textarea>
                            </div>
                            <div class="form-group full-width">
                                <label class="form-label">Hata Fotoğrafı *</label>
                                <div class="photo-upload-area" id="photoUploadArea">
                                    <div class="upload-icon">
                                        <i class="fas fa-camera"></i>
                                    </div>
                                    <div class="upload-text">Fotoğraf yüklemek için tıklayın</div>
                                    <div class="upload-hint">JPG, PNG, GIF - Max 5MB</div>
                                </div>
                                <input type="file" id="photoInput" accept="image/*" required>
                                <div id="photoPreview" style="margin-top: 15px; display: none;">
                                    <img id="previewImage" style="max-width: 200px; border-radius: 8px;">
                                </div>
                            </div>
                            <div class="form-row" style="margin-top: 30px;">
                                <button type="button" class="qc-btn secondary" id="cancelNewIssue">
                                    İptal
                                </button>
                                <button type="submit" class="qc-btn primary" id="submitNewIssue">
                                    <i class="fas fa-save"></i>
                                    Hata Bildirimini Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Issue Detail Modal -->
            <div class="qc-modal" id="issueDetailModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="issueDetailTitle">Hata Detayları</h3>
                        <button class="modal-close" id="closeIssueDetailModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="issueDetailContent">
                        <!-- Issue details will be loaded here -->
                    </div>
                </div>
            </div>

            <!-- Worker Assignment Modal -->
            <div class="qc-modal" id="workerAssignmentModal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>İşçi Atama</h3>
                        <button class="modal-close" id="closeWorkerAssignmentModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="workerAssignmentForm">
                            <div class="form-group">
                                <label for="workerSelect">İşçi Seçin:</label>
                                <select id="workerSelect" class="form-control" required>
                                    <option value="">İşçi seçin...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="assignmentNotes">Atama Notları (Opsiyonel):</label>
                                <textarea id="assignmentNotes" class="form-control" rows="3" placeholder="Bu görevle ilgili özel talimatlar..."></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" id="cancelWorkerAssignment">İptal</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-user-plus"></i> İşçi Ata
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Edit Issue Modal -->
            <div class="qc-modal" id="editIssueModal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>Hata Düzenle</h3>
                        <button class="modal-close" id="closeEditIssueModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="editIssueForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editIssueTitle">Hata Başlığı:</label>
                                    <input type="text" id="editIssueTitle" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label for="editIssuePriority">Öncelik:</label>
                                    <select id="editIssuePriority" class="form-control" required>
                                        <option value="low">Düşük</option>
                                        <option value="medium">Orta</option>
                                        <option value="high">Yüksek</option>
                                        <option value="critical">Kritik</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="editIssueDescription">Açıklama:</label>
                                <textarea id="editIssueDescription" class="form-control" rows="4" required></textarea>
                            </div>
                            <div class="form-group">
                                <label for="editIssueLocation">Konum:</label>
                                <input type="text" id="editIssueLocation" class="form-control" placeholder="Hata nerede tespit edildi?">
                            </div>
                            <div class="form-group">
                                <label for="editEstimatedTime">Tahmini Çözüm Süresi (dakika):</label>
                                <input type="number" id="editEstimatedTime" class="form-control" min="1" max="1440">
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" id="cancelEditIssue">İptal</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Güncelle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Filter event listeners
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('priorityFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());

        // Action button listeners
        document.getElementById('newIssueBtn').addEventListener('click', () => this.openNewIssueModal());
        document.getElementById('myIssuesBtn').addEventListener('click', () => this.showMyIssues());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadIssues());

        // Modal listeners
        document.getElementById('cancelNewIssue').addEventListener('click', () => this.closeNewIssueModal());
        document.getElementById('newIssueForm').addEventListener('submit', (e) => this.handleNewIssueSubmit(e));

        // Photo upload listeners
        document.getElementById('photoUploadArea').addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhotoSelect(e));

        // Drag and drop for photo upload
        const uploadArea = document.getElementById('photoUploadArea');
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
                document.getElementById('photoInput').files = files;
                this.handlePhotoSelect({ target: { files } });
            }
        });

        // Modal close buttons
        document.getElementById('closeNewIssueModal').addEventListener('click', () => {
            this.closeNewIssueModal();
        });

        document.getElementById('closeIssueDetailModal').addEventListener('click', () => {
            this.closeDetailModal();
        });

        // Modal backdrop clicks
        document.getElementById('newIssueModal').addEventListener('click', (e) => {
            if (e.target.id === 'newIssueModal') {
                this.closeNewIssueModal();
            }
        });

        document.getElementById('issueDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'issueDetailModal') {
                this.closeDetailModal();
            }
        });

        // Worker Assignment Modal
        document.getElementById('closeWorkerAssignmentModal').addEventListener('click', () => {
            this.closeWorkerAssignmentModal();
        });
        document.getElementById('cancelWorkerAssignment').addEventListener('click', () => {
            this.closeWorkerAssignmentModal();
        });
        document.getElementById('workerAssignmentForm').addEventListener('submit', (e) => {
            this.handleWorkerAssignment(e);
        });
        document.getElementById('workerAssignmentModal').addEventListener('click', (e) => {
            if (e.target.id === 'workerAssignmentModal') {
                this.closeWorkerAssignmentModal();
            }
        });

        // Edit Issue Modal
        document.getElementById('closeEditIssueModal').addEventListener('click', () => {
            this.closeEditIssueModal();
        });
        document.getElementById('cancelEditIssue').addEventListener('click', () => {
            this.closeEditIssueModal();
        });
        document.getElementById('editIssueForm').addEventListener('submit', (e) => {
            this.handleEditIssue(e);
        });
        document.getElementById('editIssueModal').addEventListener('click', (e) => {
            if (e.target.id === 'editIssueModal') {
                this.closeEditIssueModal();
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('newIssueModal').classList.contains('active')) {
                    this.closeNewIssueModal();
                }
                if (document.getElementById('issueDetailModal').classList.contains('active')) {
                    this.closeDetailModal();
                }
                if (document.getElementById('workerAssignmentModal').classList.contains('active')) {
                    this.closeWorkerAssignmentModal();
                }
                if (document.getElementById('editIssueModal').classList.contains('active')) {
                    this.closeEditIssueModal();
                }
            }
        });
    }

    async loadDashboardStats() {
        try {
            const result = await qualityControlService.getDashboardStats();
            if (result.success) {
                document.getElementById('totalIssues').textContent = result.data.totalIssues;
                document.getElementById('openIssues').textContent = result.data.openIssues;
                document.getElementById('todayIssues').textContent = result.data.todayIssues;
                document.getElementById('avgFixTime').textContent = result.data.avgFixTime;
            }
        } catch (error) {
            console.error('İstatistik yükleme hatası:', error);
        }
    }

    async loadIssues() {
        try {
            document.getElementById('loadingState').style.display = 'block';
            document.getElementById('issuesGrid').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';

            const result = await qualityControlService.getIssues(this.filters);

            if (result.success) {
                this.issues = result.data;
                this.renderIssues();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Hatalar yüklenirken hata:', error);
            alert('Hatalar yüklenirken bir sorun oluştu: ' + error.message);
        } finally {
            document.getElementById('loadingState').style.display = 'none';
        }
    }

    renderIssues() {
        const container = document.getElementById('issuesGrid');

        if (this.issues.length === 0) {
            container.style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        document.getElementById('emptyState').style.display = 'none';

        container.innerHTML = this.issues.map(issue => this.renderIssueCard(issue)).join('');

        // Add click listeners to cards
        container.querySelectorAll('.issue-card').forEach(card => {
            card.addEventListener('click', () => {
                const issueId = card.dataset.issueId;
                this.openIssueDetail(issueId);
            });
        });
    }

    renderIssueCard(issue) {
        const statusText = this.getStatusText(issue.status);
        const priorityText = this.getPriorityText(issue.priority_level);
        const createdDate = new Date(issue.created_at).toLocaleDateString('tr-TR');

        return `
            <div class="issue-card" data-issue-id="${issue.id}">
                <div class="issue-card-header">
                    <h4 class="issue-title">${issue.issue_title}</h4>
                    <span class="issue-priority priority-${issue.priority_level}">${priorityText}</span>
                </div>
                <div class="issue-card-body">
                    <p class="issue-description">${issue.issue_description}</p>
                    <div class="issue-meta">
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            ${issue.issue_location || 'Belirtilmemiş'}
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            ${createdDate}
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-user"></i>
                            ${issue.reporter?.full_name || 'Bilinmiyor'}
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-tools"></i>
                            ${issue.assigned_worker?.full_name || 'Atanmamış'}
                        </div>
                    </div>
                    <div class="issue-status status-${issue.status}">${statusText}</div>
                    <div class="issue-photos">
                        ${issue.before_photo_url ? `<div class="photo-preview"><img src="${issue.before_photo_url}" alt="Öncesi"></div>` : '<div class="photo-placeholder"><i class="fas fa-camera"></i></div>'}
                        ${issue.after_photo_url ? `<div class="photo-preview"><img src="${issue.after_photo_url}" alt="Sonrası"></div>` : '<div class="photo-placeholder"><i class="fas fa-camera-retro"></i></div>'}
                    </div>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'reported': 'Bildirildi',
            'assigned': 'Atandı',
            'in_progress': 'Devam Ediyor',
            'fixed': 'Düzeltildi',
            'review': 'İncelemede',
            'approved': 'Onaylandı',
            'rejected': 'Reddedildi'
        };
        return statusMap[status] || status;
    }

    getPriorityText(priority) {
        const priorityMap = {
            'low': 'Düşük',
            'medium': 'Orta',
            'high': 'Yüksek',
            'critical': 'Kritik'
        };
        return priorityMap[priority] || priority;
    }

    applyFilters() {
        this.filters = {
            status: document.getElementById('statusFilter').value,
            priority: document.getElementById('priorityFilter').value,
            dateFrom: document.getElementById('dateFromFilter').value,
            dateTo: document.getElementById('dateToFilter').value
        };
        this.loadIssues();
    }

    clearFilters() {
        document.getElementById('statusFilter').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';
        this.filters = {};
        this.loadIssues();
    }

    showMyIssues() {
        if (this.currentUser) {
            this.filters = { assignedTo: this.currentUser.id };
            this.loadIssues();
        }
    }

    openNewIssueModal() {
        this.loadWorkers(); // Load workers for dropdown
        document.getElementById('newIssueModal').classList.add('active');
    }

    closeNewIssueModal() {
        document.getElementById('newIssueModal').classList.remove('active');
        document.getElementById('newIssueForm').reset();
        document.getElementById('photoPreview').style.display = 'none';
    }

    async loadWorkers() {
        try {
            const result = await supabaseService.getEmployees();
            const workers = result.data || result || [];
            const select = document.getElementById('assignedWorker');
            select.innerHTML = '<option value="">Seçiniz...</option>';

            workers.forEach(worker => {
                const option = document.createElement('option');
                option.value = worker.id;
                option.textContent = `${worker.full_name} - ${worker.department || 'Genel'}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Çalışanlar yüklenirken hata:', error);
        }
    }

    handlePhotoSelect(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('Dosya boyutu 5MB\'dan büyük olamaz.');
                return;
            }

            if (!file.type.startsWith('image/')) {
                alert('Lütfen geçerli bir resim dosyası seçin.');
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('previewImage').src = e.target.result;
                document.getElementById('photoPreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    async handleNewIssueSubmit(e) {
        e.preventDefault();

        try {
            const submitBtn = document.getElementById('submitNewIssue');
            submitBtn.innerHTML = '<div class="spinner"></div> Oluşturuluyor...';
            submitBtn.disabled = true;

            // Get form data
            const formData = {
                title: document.getElementById('issueTitle').value,
                description: document.getElementById('issueDescription').value,
                location: document.getElementById('issueLocation').value,
                priority: document.getElementById('issuePriority').value,
                reporterId: this.currentUser.id,
                reporterNotes: document.getElementById('reporterNotes').value,
                assignedTo: document.getElementById('assignedWorker').value || null,
                supervisorId: this.currentUser.id // Assuming current user is supervisor
            };

            // Upload photo first
            const photoFile = document.getElementById('photoInput').files[0];
            if (photoFile) {
                const uploadResult = await qualityControlService.uploadPhoto(photoFile);
                if (uploadResult.success) {
                    formData.beforePhotoUrl = uploadResult.url;
                } else {
                    throw new Error('Fotoğraf yükleme hatası: ' + uploadResult.error);
                }
            }

            // Create issue
            const result = await qualityControlService.createIssue(formData);

            if (result.success) {
                alert('Hata bildirimi başarıyla oluşturuldu!');
                this.closeNewIssueModal();
                this.loadIssues();
                this.loadDashboardStats();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Hata bildirimi oluşturulurken hata:', error);
            alert('Hata bildirimi oluşturulurken bir sorun oluştu: ' + error.message);
        } finally {
            const submitBtn = document.getElementById('submitNewIssue');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Hata Bildirimini Oluştur';
            submitBtn.disabled = false;
        }
    }

    async openIssueDetail(issueId) {
        try {
            console.log('Opening issue detail for ID:', issueId);

            if (!issueId || issueId === 'null' || issueId === 'undefined') {
                throw new Error('Geçersiz hata ID\'si');
            }

            const result = await qualityControlService.getIssueById(issueId);
            if (result.success) {
                this.renderIssueDetail(result.data);
                document.getElementById('issueDetailModal').classList.add('active');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Hata detayı yüklenirken hata:', error);
            alert('Hata detayları yüklenirken bir sorun oluştu: ' + error.message);
        }
    }

    async renderIssueDetail(issue) {
        try {
            document.getElementById('issueDetailTitle').textContent = issue.issue_title;

            // Load comments for this issue
            const commentsResult = await qualityControlService.getIssueComments(issue.id);
            const comments = commentsResult.success ? commentsResult.data : [];

            const statusColor = this.getStatusColor(issue.status);
            const priorityColor = this.getPriorityColor(issue.priority_level);

            document.getElementById('issueDetailContent').innerHTML = `
                <div class="issue-detail-content">
                    <!-- Status and Priority Section -->
                    <div class="detail-section">
                        <div class="detail-row">
                            <div class="detail-item">
                                <label>Durum:</label>
                                <span class="status-badge" style="background-color: ${statusColor}">
                                    ${this.getStatusText(issue.status)}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>Öncelik:</label>
                                <span class="priority-badge" style="background-color: ${priorityColor}">
                                    ${this.getPriorityText(issue.priority_level)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Description Section -->
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Açıklama</h4>
                        <p class="issue-description">${issue.issue_description}</p>
                        ${issue.issue_location ? `<p><strong>Konum:</strong> ${issue.issue_location}</p>` : ''}
                    </div>

                    <!-- Photos Section -->
                    <div class="detail-section">
                        <h4><i class="fas fa-camera"></i> Fotoğraflar</h4>
                        <div class="photos-container">
                            ${issue.before_photo_url ? `
                                <div class="photo-item">
                                    <h5>Hata Fotoğrafı (Önce)</h5>
                                    <img src="${issue.before_photo_url}" alt="Before Photo" class="issue-photo" onclick="this.classList.toggle('enlarged')">
                                </div>
                            ` : '<p>Hata fotoğrafı bulunmuyor</p>'}

                            ${issue.after_photo_url ? `
                                <div class="photo-item">
                                    <h5>Çözüm Fotoğrafı (Sonra)</h5>
                                    <img src="${issue.after_photo_url}" alt="After Photo" class="issue-photo" onclick="this.classList.toggle('enlarged')">
                                </div>
                            ` : (issue.status === 'fixed' || issue.status === 'review' || issue.status === 'approved' ? '<p>Çözüm fotoğrafı bekleniyor</p>' : '')}
                        </div>
                    </div>

                    <!-- People Section -->
                    <div class="detail-section">
                        <h4><i class="fas fa-users"></i> Kişiler</h4>
                        <div class="people-grid">
                            <div class="person-item">
                                <label>Bildiren:</label>
                                <span>${issue.reporter?.full_name || 'Bilinmiyor'}</span>
                                <small>(${issue.reporter?.department || 'Departman bilinmiyor'})</small>
                            </div>
                            ${issue.assigned_worker ? `
                                <div class="person-item">
                                    <label>Atanan İşçi:</label>
                                    <span>${issue.assigned_worker.full_name}</span>
                                    <small>(${issue.assigned_worker.department || 'Departman bilinmiyor'})</small>
                                </div>
                            ` : ''}
                            ${issue.supervisor ? `
                                <div class="person-item">
                                    <label>Denetmen:</label>
                                    <span>${issue.supervisor.full_name}</span>
                                    <small>(${issue.supervisor.department || 'Departman bilinmiyor'})</small>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Timing Section -->
                    <div class="detail-section">
                        <h4><i class="fas fa-clock"></i> Zamanlar</h4>
                        <div class="timing-grid">
                            <div class="timing-item">
                                <label>Oluşturulma:</label>
                                <span>${new Date(issue.created_at).toLocaleString('tr-TR')}</span>
                            </div>
                            ${issue.started_at ? `
                                <div class="timing-item">
                                    <label>İşe Başlama:</label>
                                    <span>${new Date(issue.started_at).toLocaleString('tr-TR')}</span>
                                </div>
                            ` : ''}
                            ${issue.completed_at ? `
                                <div class="timing-item">
                                    <label>Tamamlanma:</label>
                                    <span>${new Date(issue.completed_at).toLocaleString('tr-TR')}</span>
                                </div>
                            ` : ''}
                            ${issue.estimated_fix_time ? `
                                <div class="timing-item">
                                    <label>Tahmini Süre:</label>
                                    <span>${issue.estimated_fix_time} dakika</span>
                                </div>
                            ` : ''}
                            ${issue.actual_fix_time ? `
                                <div class="timing-item">
                                    <label>Gerçek Süre:</label>
                                    <span>${issue.actual_fix_time} dakika</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Comments Section -->
                    <div class="detail-section">
                        <h4><i class="fas fa-comments"></i> Yorumlar (${comments.length})</h4>
                        <div class="comments-container">
                            ${comments.length > 0 ? comments.map(comment => `
                                <div class="comment-item">
                                    <div class="comment-header">
                                        <strong>${comment.employees?.full_name || 'Bilinmiyor'}</strong>
                                        <small>${new Date(comment.created_at).toLocaleString('tr-TR')}</small>
                                        <span class="comment-type">${this.getCommentTypeText(comment.comment_type)}</span>
                                    </div>
                                    <div class="comment-text">${comment.comment_text}</div>
                                </div>
                            `).join('') : '<p>Henüz yorum bulunmuyor</p>'}
                        </div>

                        <!-- Add Comment Form -->
                        <div class="add-comment-form">
                            <textarea id="newCommentText" placeholder="Yorum ekleyin..." rows="3"></textarea>
                            <div class="comment-actions">
                                <select id="commentType">
                                    <option value="general">Genel Yorum</option>
                                    <option value="progress">İlerleme Raporu</option>
                                    <option value="solution">Çözüm Açıklaması</option>
                                    <option value="review">İnceleme Notu</option>
                                </select>
                                <button type="button" onclick="window.currentQCPage.addComment('${issue.id}')" class="btn btn-primary">
                                    <i class="fas fa-plus"></i> Yorum Ekle
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons Section -->
                    <div class="detail-section">
                        <h4><i class="fas fa-cogs"></i> İşlemler</h4>
                        <div class="action-buttons">
                            ${this.generateActionButtons(issue)}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Hata detayı render edilirken hata:', error);
            document.getElementById('issueDetailContent').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Hata detayları yüklenirken bir sorun oluştu.</p>
                </div>
            `;
        }
    }

    // Helper methods for detail modal
    getStatusColor(status) {
        const colors = {
            'reported': '#f39c12',      // Orange
            'assigned': '#3498db',      // Blue
            'in_progress': '#9b59b6',   // Purple
            'fixed': '#2ecc71',         // Green
            'review': '#e67e22',        // Dark Orange
            'approved': '#27ae60',      // Dark Green
            'rejected': '#e74c3c'       // Red
        };
        return colors[status] || '#95a5a6';
    }

    getPriorityColor(priority) {
        const colors = {
            'low': '#27ae60',        // Green
            'medium': '#f39c12',     // Orange
            'high': '#e67e22',       // Dark Orange
            'critical': '#e74c3c'    // Red
        };
        return colors[priority] || '#95a5a6';
    }

    getCommentTypeText(type) {
        const types = {
            'general': 'Genel',
            'progress': 'İlerleme',
            'solution': 'Çözüm',
            'review': 'İnceleme'
        };
        return types[type] || type;
    }

    generateActionButtons(issue) {
        const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
        if (!currentUser) return '';

        const buttons = [];

        // Status-based actions
        switch (issue.status) {
            case 'reported':
                if (currentUser.role === 'admin' || currentUser.id === issue.supervisor_id) {
                    buttons.push(`
                        <button type="button" onclick="window.currentQCPage.assignWorker('${issue.id}')" class="btn btn-primary">
                            <i class="fas fa-user-plus"></i> İşçi Ata
                        </button>
                    `);
                }
                break;

            case 'assigned':
                if (currentUser.id === issue.assigned_to) {
                    buttons.push(`
                        <button type="button" onclick="window.currentQCPage.startWork('${issue.id}')" class="btn btn-success">
                            <i class="fas fa-play"></i> İşe Başla
                        </button>
                    `);
                }
                break;

            case 'in_progress':
                if (currentUser.id === issue.assigned_to) {
                    buttons.push(`
                        <button type="button" onclick="window.currentQCPage.uploadAfterPhoto('${issue.id}')" class="btn btn-success">
                            <i class="fas fa-camera"></i> Çözüm Fotoğrafı Yükle
                        </button>
                    `);
                }
                break;

            case 'fixed':
                if (currentUser.role === 'admin' || currentUser.id === issue.supervisor_id) {
                    buttons.push(`
                        <button type="button" onclick="window.currentQCPage.reviewIssue('${issue.id}', 'approved')" class="btn btn-success">
                            <i class="fas fa-check"></i> Onayla
                        </button>
                        <button type="button" onclick="window.currentQCPage.reviewIssue('${issue.id}', 'rejected')" class="btn btn-danger">
                            <i class="fas fa-times"></i> Reddet
                        </button>
                    `);
                }
                break;

            case 'review':
                if (currentUser.role === 'admin' || currentUser.id === issue.supervisor_id) {
                    buttons.push(`
                        <button type="button" onclick="window.currentQCPage.finalizeReview('${issue.id}', 'approved')" class="btn btn-success">
                            <i class="fas fa-check-double"></i> Nihai Onay
                        </button>
                        <button type="button" onclick="window.currentQCPage.finalizeReview('${issue.id}', 'rejected')" class="btn btn-danger">
                            <i class="fas fa-ban"></i> Nihai Red
                        </button>
                    `);
                }
                break;
        }

        // Universal actions for authorized users
        if (currentUser.role === 'admin' || currentUser.id === issue.reporter_id || currentUser.id === issue.assigned_to || currentUser.id === issue.supervisor_id) {
            buttons.push(`
                <button type="button" onclick="window.currentQCPage.editIssue('${issue.id}')" class="btn btn-secondary">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
            `);
        }

        if (currentUser.role === 'admin') {
            buttons.push(`
                <button type="button" onclick="window.currentQCPage.deleteIssue('${issue.id}')" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Sil
                </button>
            `);
        }

        return buttons.join('');
    }

    // Action methods
    async addComment(issueId) {
        const commentText = document.getElementById('newCommentText').value.trim();
        const commentType = document.getElementById('commentType').value;

        if (!commentText) {
            alert('Yorum metni boş olamaz!');
            return;
        }

        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.addComment(issueId, currentUser.id, commentText, commentType);

            if (result.success) {
                // Refresh the detail view
                const issueResult = await qualityControlService.getIssueById(issueId);
                if (issueResult.success) {
                    this.renderIssueDetail(issueResult.data);
                }
            } else {
                alert('Yorum eklenirken hata oluştu: ' + result.error);
            }
        } catch (error) {
            console.error('Yorum ekleme hatası:', error);
            alert('Yorum eklenirken bir sorun oluştu.');
        }
    }

    async assignWorker(issueId) {
        try {
            console.log('Assigning worker to issue ID:', issueId);

            if (!issueId || issueId === 'null' || issueId === 'undefined') {
                throw new Error('Geçersiz hata ID\'si');
            }

            // Store the issue ID for later use
            this.currentAssignmentIssueId = issueId;

            // Load employees for dropdown
            const employeesResult = await qualityControlService.getEmployees();
            if (!employeesResult.success) {
                throw new Error('Çalışan listesi yüklenemedi: ' + employeesResult.error);
            }

            // Populate dropdown
            const workerSelect = document.getElementById('workerSelect');
            workerSelect.innerHTML = '<option value="">İşçi seçin...</option>';

            employeesResult.data.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = `${employee.full_name} - ${employee.department || 'Departman Yok'}`;
                workerSelect.appendChild(option);
            });

            // Clear previous notes
            document.getElementById('assignmentNotes').value = '';

            // Show modal
            document.getElementById('workerAssignmentModal').classList.add('active');

        } catch (error) {
            console.error('İşçi atama modal açma hatası:', error);
            alert('İşçi atama işlemi başlatılamadı: ' + error.message);
        }
    }

    async handleWorkerAssignment(e) {
        e.preventDefault();

        const workerId = document.getElementById('workerSelect').value;
        const notes = document.getElementById('assignmentNotes').value;

        if (!workerId) {
            alert('Lütfen bir işçi seçin!');
            return;
        }

        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.assignWorkerToIssue(
                this.currentAssignmentIssueId,
                workerId,
                currentUser.id
            );

            if (result.success) {
                // Add notes as comment if provided
                if (notes) {
                    await qualityControlService.addComment(
                        this.currentAssignmentIssueId,
                        currentUser.id,
                        notes,
                        'general'
                    );
                }

                alert('İşçi başarıyla atandı!');
                this.closeWorkerAssignmentModal();
                this.loadIssues();

                // Close detail modal if open
                if (document.getElementById('issueDetailModal').classList.contains('active')) {
                    this.closeDetailModal();
                }
            } else {
                alert('İşçi ataması sırasında hata: ' + result.error);
            }
        } catch (error) {
            console.error('İşçi atama hatası:', error);
            alert('İşçi ataması sırasında bir sorun oluştu.');
        }
    }

    closeWorkerAssignmentModal() {
        document.getElementById('workerAssignmentModal').classList.remove('active');
        this.currentAssignmentIssueId = null;
    }

    async startWork(issueId) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.updateIssueStatus(issueId, 'in_progress', currentUser.id, 'İşe başlandı');

            if (result.success) {
                this.loadIssues();
                this.closeDetailModal();
            } else {
                alert('İş başlatma sırasında hata: ' + result.error);
            }
        } catch (error) {
            console.error('İş başlatma hatası:', error);
            alert('İş başlatma sırasında bir sorun oluştu.');
        }
    }

    async uploadAfterPhoto(issueId) {
        // Create file input for photo upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
                const uploadResult = await qualityControlService.uploadPhoto(file);

                if (uploadResult.success) {
                    const result = await qualityControlService.addAfterPhoto(issueId, uploadResult.url, currentUser.id);

                    if (result.success) {
                        this.loadIssues();
                        this.closeDetailModal();
                    } else {
                        alert('Fotoğraf ekleme hatası: ' + result.error);
                    }
                } else {
                    alert('Fotoğraf yükleme hatası: ' + uploadResult.error);
                }
            } catch (error) {
                console.error('Fotoğraf yükleme hatası:', error);
                alert('Fotoğraf yükleme sırasında bir sorun oluştu.');
            }
        };

        fileInput.click();
    }

    async reviewIssue(issueId, action) {
        const reason = prompt(`${action === 'approved' ? 'Onay' : 'Red'} sebebi:`);
        if (reason === null) return;

        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.updateIssueStatus(issueId, action === 'approved' ? 'review' : 'rejected', currentUser.id, reason);

            if (result.success) {
                this.loadIssues();
                this.closeDetailModal();
            } else {
                alert('İnceleme güncellemesi sırasında hata: ' + result.error);
            }
        } catch (error) {
            console.error('İnceleme hatası:', error);
            alert('İnceleme sırasında bir sorun oluştu.');
        }
    }

    async finalizeReview(issueId, action) {
        const reason = prompt(`Nihai ${action === 'approved' ? 'onay' : 'red'} sebebi:`);
        if (reason === null) return;

        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.updateIssueStatus(issueId, action, currentUser.id, reason);

            if (result.success) {
                this.loadIssues();
                this.closeDetailModal();
            } else {
                alert('Nihai inceleme güncellemesi sırasında hata: ' + result.error);
            }
        } catch (error) {
            console.error('Nihai inceleme hatası:', error);
            alert('Nihai inceleme sırasında bir sorun oluştu.');
        }
    }

    async editIssue(issueId) {
        try {
            console.log('Editing issue with ID:', issueId);

            if (!issueId || issueId === 'null' || issueId === 'undefined') {
                throw new Error('Geçersiz hata ID\'si');
            }

            // Get issue details first
            const result = await qualityControlService.getIssueById(issueId);
            if (!result.success) {
                throw new Error('Hata detayları yüklenemedi: ' + result.error);
            }

            const issue = result.data;
            this.currentEditIssueId = issueId;

            // Populate form with current values
            document.getElementById('editIssueTitle').value = issue.issue_title;
            document.getElementById('editIssueDescription').value = issue.issue_description;
            document.getElementById('editIssueLocation').value = issue.issue_location || '';
            document.getElementById('editIssuePriority').value = issue.priority_level;
            document.getElementById('editEstimatedTime').value = issue.estimated_fix_time || '';

            // Show modal
            document.getElementById('editIssueModal').classList.add('active');

        } catch (error) {
            console.error('Düzenleme modal açma hatası:', error);
            alert('Düzenleme işlemi başlatılamadı: ' + error.message);
        }
    }

    async handleEditIssue(e) {
        e.preventDefault();

        const updateData = {
            issue_title: document.getElementById('editIssueTitle').value,
            issue_description: document.getElementById('editIssueDescription').value,
            issue_location: document.getElementById('editIssueLocation').value,
            priority_level: document.getElementById('editIssuePriority').value,
            estimated_fix_time: document.getElementById('editEstimatedTime').value || null
        };

        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.updateIssue(
                this.currentEditIssueId,
                updateData,
                currentUser.id
            );

            if (result.success) {
                alert('Hata başarıyla güncellendi!');
                this.closeEditIssueModal();
                this.loadIssues();

                // Close detail modal if open and refresh its content
                if (document.getElementById('issueDetailModal').classList.contains('active')) {
                    const updatedResult = await qualityControlService.getIssueById(this.currentEditIssueId);
                    if (updatedResult.success) {
                        this.renderIssueDetail(updatedResult.data);
                    }
                }
            } else {
                alert('Güncelleme sırasında hata: ' + result.error);
            }
        } catch (error) {
            console.error('Hata güncelleme hatası:', error);
            alert('Güncelleme sırasında bir sorun oluştu.');
        }
    }

    closeEditIssueModal() {
        document.getElementById('editIssueModal').classList.remove('active');
        this.currentEditIssueId = null;
    }

    async deleteIssue(issueId) {
        if (!confirm('Bu hata kaydını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!')) return;

        try {
            const currentUser = JSON.parse(localStorage.getItem('dinky_user'));
            const result = await qualityControlService.deleteIssue(issueId, currentUser.id);

            if (result.success) {
                alert('Hata kaydı başarıyla silindi!');
                this.loadIssues();

                // Close detail modal if open
                if (document.getElementById('issueDetailModal').classList.contains('active')) {
                    this.closeDetailModal();
                }
            } else {
                alert('Silme sırasında hata: ' + result.error);
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('Silme sırasında bir sorun oluştu.');
        }
    }

    closeDetailModal() {
        document.getElementById('issueDetailModal').classList.remove('active');
    }
}

// Export for use in main app
export { QualityControlPage };