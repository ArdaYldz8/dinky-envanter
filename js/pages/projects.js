// Project Management Page
// Proje Yönetim Sayfası

import { projectService } from '../services/projectService.js';
import { supabaseService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

class ProjectsPage {
    constructor() {
        this.currentUser = null;
        this.projects = [];
        this.filteredProjects = [];
        this.filters = {
            status: '',
            priority: '',
            search: '',
            dateFrom: '',
            dateTo: ''
        };
        this.viewMode = 'grid'; // 'grid' or 'table'
    }

    async init() {
        this.currentUser = await supabaseService.getCurrentUser();
        await this.loadProjects();
        this.setupEventListeners();
    }

    render() {
        return `
            <div class="projects-container">
                <!-- Header Section -->
                <div class="projects-header">
                    <div class="projects-title">
                        <h1><i class="fas fa-project-diagram"></i> Proje Yönetimi</h1>
                        <p class="projects-subtitle">Tüm projelerinizi takip edin ve yönetin</p>
                    </div>
                    <div class="projects-actions">
                        <div class="projects-stats" id="projectsStats">
                            <div class="stat-item">
                                <span class="stat-number" id="totalProjects">-</span>
                                <span class="stat-label">Toplam Proje</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="activeProjects">-</span>
                                <span class="stat-label">Aktif Proje</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="completedProjects">-</span>
                                <span class="stat-label">Tamamlanan</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="delayedProjects">-</span>
                                <span class="stat-label">Geciken</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" id="newProjectBtn">
                            <i class="fas fa-plus"></i>
                            Yeni Proje
                        </button>
                    </div>
                </div>

                <!-- Filters and View Controls -->
                <div class="projects-controls">
                    <div class="filters-section">
                        <div class="filter-group">
                            <label>Arama</label>
                            <div class="search-input">
                                <i class="fas fa-search"></i>
                                <input type="text" id="searchInput" placeholder="Proje ara...">
                            </div>
                        </div>
                        <div class="filter-group">
                            <label>Durum</label>
                            <select id="statusFilter">
                                <option value="">Tüm Durumlar</option>
                                <option value="Planlanıyor">Planlanıyor</option>
                                <option value="Başlatıldı">Başlatıldı</option>
                                <option value="Devam Ediyor">Devam Ediyor</option>
                                <option value="Beklemede">Beklemede</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                                <option value="İptal Edildi">İptal Edildi</option>
                                <option value="Ertelendi">Ertelendi</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Öncelik</label>
                            <select id="priorityFilter">
                                <option value="">Tüm Öncelikler</option>
                                <option value="Düşük">Düşük</option>
                                <option value="Orta">Orta</option>
                                <option value="Yüksek">Yüksek</option>
                                <option value="Kritik">Kritik</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Başlangıç</label>
                            <input type="date" id="dateFromFilter">
                        </div>
                        <div class="filter-group">
                            <label>Bitiş</label>
                            <input type="date" id="dateToFilter">
                        </div>
                        <div class="filter-actions">
                            <button class="btn btn-secondary btn-sm" id="clearFiltersBtn">
                                <i class="fas fa-times"></i>
                                Temizle
                            </button>
                        </div>
                    </div>

                    <div class="view-controls">
                        <div class="view-toggle">
                            <button class="view-btn active" data-view="grid" id="gridViewBtn">
                                <i class="fas fa-th-large"></i>
                            </button>
                            <button class="view-btn" data-view="table" id="tableViewBtn">
                                <i class="fas fa-table"></i>
                            </button>
                        </div>
                        <div class="sort-controls">
                            <select id="sortSelect">
                                <option value="created_at_desc">En Yeni</option>
                                <option value="created_at_asc">En Eski</option>
                                <option value="project_name_asc">İsim (A-Z)</option>
                                <option value="project_name_desc">İsim (Z-A)</option>
                                <option value="priority_desc">Öncelik ↓</option>
                                <option value="progress_desc">İlerleme ↓</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Projects Content -->
                <div class="projects-content">
                    <!-- Grid View -->
                    <div class="projects-grid" id="projectsGrid" style="display: block;">
                        <!-- Project cards will be loaded here -->
                    </div>

                    <!-- Table View -->
                    <div class="projects-table-container" id="projectsTable" style="display: none;">
                        <table class="projects-table">
                            <thead>
                                <tr>
                                    <th>Proje</th>
                                    <th>Müşteri</th>
                                    <th>Durum</th>
                                    <th>İlerleme</th>
                                    <th>Öncelik</th>
                                    <th>Tarih</th>
                                    <th>Bütçe</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody id="projectsTableBody">
                                <!-- Project rows will be loaded here -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="loading-state" style="display: none;">
                        <div class="spinner"></div>
                        <p>Projeler yükleniyor...</p>
                    </div>

                    <!-- Empty State -->
                    <div id="emptyState" class="empty-state" style="display: none;">
                        <i class="fas fa-project-diagram"></i>
                        <h3>Henüz proje yok</h3>
                        <p>İlk projenizi oluşturmak için "Yeni Proje" butonuna tıklayın.</p>
                        <button class="btn btn-primary" onclick="document.getElementById('newProjectBtn').click()">
                            <i class="fas fa-plus"></i>
                            Yeni Proje Oluştur
                        </button>
                    </div>
                </div>
            </div>

            <!-- New Project Modal -->
            <div class="modal" id="newProjectModal">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus"></i> Yeni Proje Oluştur</h3>
                        <button class="modal-close" id="closeNewProjectModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="newProjectForm" class="project-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Proje Kodu *</label>
                                    <input type="text" id="projectCode" required placeholder="Örn: H.K.2024.001">
                                    <small>Benzersiz proje kodu (otomatik oluşturulmadıysa)</small>
                                </div>
                                <div class="form-group">
                                    <label>Proje Adı *</label>
                                    <input type="text" id="projectName" required placeholder="Proje adını girin">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Proje Açıklaması</label>
                                <textarea id="projectDescription" rows="3" placeholder="Projenin detaylı açıklaması..."></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Müşteri</label>
                                    <select id="customerId">
                                        <option value="">Müşteri seçin...</option>
                                        <!-- Customers will be loaded here -->
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Proje Yöneticisi</label>
                                    <select id="projectManagerId">
                                        <option value="">Yönetici seçin...</option>
                                        <!-- Employees will be loaded here -->
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Durum</label>
                                    <select id="projectStatus">
                                        <option value="Planlanıyor">Planlanıyor</option>
                                        <option value="Başlatıldı">Başlatıldı</option>
                                        <option value="Devam Ediyor">Devam Ediyor</option>
                                        <option value="Beklemede">Beklemede</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Öncelik</label>
                                    <select id="projectPriority">
                                        <option value="Düşük">Düşük</option>
                                        <option value="Orta" selected>Orta</option>
                                        <option value="Yüksek">Yüksek</option>
                                        <option value="Kritik">Kritik</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Planlanan Başlangıç</label>
                                    <input type="date" id="plannedStartDate">
                                </div>
                                <div class="form-group">
                                    <label>Planlanan Bitiş</label>
                                    <input type="date" id="plannedEndDate">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Tahmini Bütçe</label>
                                    <input type="number" id="estimatedBudget" step="0.01" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label>Para Birimi</label>
                                    <select id="currency">
                                        <option value="TRY" selected>TRY (₺)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="cancelNewProject">
                                    İptal
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i>
                                    Proje Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Project Detail Modal -->
            <div class="modal" id="projectDetailModal">
                <div class="modal-content modal-xl">
                    <div class="modal-header">
                        <h3 id="projectDetailTitle">
                            <i class="fas fa-project-diagram"></i>
                            Proje Detayları
                        </h3>
                        <button class="modal-close" id="closeProjectDetailModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="projectDetailContent">
                        <!-- Project details will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // New project button
        document.getElementById('newProjectBtn').addEventListener('click', () => {
            this.showNewProjectModal();
        });

        // Modal close buttons
        document.getElementById('closeNewProjectModal').addEventListener('click', () => {
            this.hideNewProjectModal();
        });

        document.getElementById('closeProjectDetailModal').addEventListener('click', () => {
            this.hideProjectDetailModal();
        });

        // New project form
        document.getElementById('newProjectForm').addEventListener('submit', (e) => {
            this.handleNewProjectSubmit(e);
        });

        document.getElementById('cancelNewProject').addEventListener('click', () => {
            this.hideNewProjectModal();
        });

        // Filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        document.getElementById('dateFromFilter').addEventListener('change', (e) => {
            this.filters.dateFrom = e.target.value;
            this.applyFilters();
        });

        document.getElementById('dateToFilter').addEventListener('change', (e) => {
            this.filters.dateTo = e.target.value;
            this.applyFilters();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // View toggle
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.setViewMode('grid');
        });

        document.getElementById('tableViewBtn').addEventListener('click', () => {
            this.setViewMode('table');
        });

        // Sort
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortProjects(e.target.value);
        });

        // Auto-generate project code
        document.getElementById('projectCode').addEventListener('focus', (e) => {
            if (!e.target.value) {
                e.target.value = projectService.generateProjectCode();
            }
        });
    }

    async loadProjects() {
        this.showLoading(true);

        try {
            const result = await projectService.getAllProjects();
            if (result.success) {
                this.projects = result.data || [];
                this.filteredProjects = [...this.projects];
                this.renderProjects();
                await this.loadProjectStats();
            } else {
                Toast.error('Projeler yüklenirken hata oluştu: ' + result.error);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Projeler yüklenirken hata:', error);
            Toast.error('Projeler yüklenirken beklenmeyen bir hata oluştu');
            this.showEmptyState();
        }

        this.showLoading(false);
    }

    async loadProjectStats() {
        try {
            const result = await projectService.getProjectStats();
            if (result.success) {
                const stats = result.data;
                document.getElementById('totalProjects').textContent = stats.total;
                document.getElementById('activeProjects').textContent = stats.active;
                document.getElementById('completedProjects').textContent = stats.completed;
                document.getElementById('delayedProjects').textContent = stats.delayed;
            }
        } catch (error) {
            console.error('Proje istatistikleri yüklenirken hata:', error);
        }
    }

    renderProjects() {
        if (this.filteredProjects.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        if (this.viewMode === 'grid') {
            this.renderProjectsGrid();
        } else {
            this.renderProjectsTable();
        }
    }

    renderProjectsGrid() {
        const container = document.getElementById('projectsGrid');

        container.innerHTML = this.filteredProjects.map(project => `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-card-header">
                    <div class="project-info">
                        <h3 class="project-name" title="${project.project_name}">
                            ${project.project_name}
                        </h3>
                        <span class="project-code">${project.project_code || 'N/A'}</span>
                    </div>
                    <div class="project-status">
                        <span class="status-badge status-${project.status?.toLowerCase().replace(/\s+/g, '-')}"
                              style="background-color: ${projectService.getStatusColor(project.status)}">
                            ${project.status || 'Bilinmiyor'}
                        </span>
                    </div>
                </div>

                <div class="project-card-body">
                    <div class="project-description">
                        ${project.description || 'Açıklama bulunmuyor'}
                    </div>

                    <div class="project-progress">
                        <div class="progress-info">
                            <span>İlerleme</span>
                            <span>${project.overall_progress || 0}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${project.overall_progress || 0}%"></div>
                        </div>
                    </div>

                    <div class="project-meta">
                        <div class="meta-item">
                            <i class="fas fa-user"></i>
                            <span>${project.customers?.company_name || project.customers?.customer_name || 'Müşteri yok'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${project.planned_end_date ? formatter.date(project.planned_end_date) : 'Tarih yok'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${project.estimated_budget ? formatter.currency(project.estimated_budget) : 'Bütçe yok'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="priority-badge priority-${project.priority?.toLowerCase()}"
                                  style="background-color: ${projectService.getPriorityColor(project.priority)}">
                                ${project.priority || 'Orta'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="project-card-footer">
                    <button class="btn btn-sm btn-primary" onclick="window.projectsPage.viewProject('${project.id}')">
                        <i class="fas fa-eye"></i>
                        Detaylar
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.projectsPage.editProject('${project.id}')">
                        <i class="fas fa-edit"></i>
                        Düzenle
                    </button>
                    <div class="card-actions-dropdown">
                        <button class="btn btn-sm btn-ghost" onclick="window.projectsPage.toggleCardActions('${project.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu" id="actions-${project.id}">
                            <a href="#" onclick="window.projectsPage.duplicateProject('${project.id}')">
                                <i class="fas fa-copy"></i> Kopyala
                            </a>
                            <a href="#" onclick="window.projectsPage.archiveProject('${project.id}')">
                                <i class="fas fa-archive"></i> Arşivle
                            </a>
                            <a href="#" onclick="window.projectsPage.deleteProject('${project.id}')" class="danger">
                                <i class="fas fa-trash"></i> Sil
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Make project cards clickable
        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('.dropdown-menu')) return;

                const projectId = card.dataset.projectId;
                this.viewProject(projectId);
            });
        });
    }

    renderProjectsTable() {
        const tbody = document.getElementById('projectsTableBody');

        tbody.innerHTML = this.filteredProjects.map(project => `
            <tr data-project-id="${project.id}" class="project-row">
                <td>
                    <div class="project-info">
                        <strong>${project.project_name}</strong>
                        <small>${project.project_code || 'N/A'}</small>
                    </div>
                </td>
                <td>${project.customers?.company_name || project.customers?.customer_name || '-'}</td>
                <td>
                    <span class="status-badge status-${project.status?.toLowerCase().replace(/\s+/g, '-')}"
                          style="background-color: ${projectService.getStatusColor(project.status)}">
                        ${project.status || 'Bilinmiyor'}
                    </span>
                </td>
                <td>
                    <div class="progress-mini">
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${project.overall_progress || 0}%"></div>
                        </div>
                        <span>${project.overall_progress || 0}%</span>
                    </div>
                </td>
                <td>
                    <span class="priority-badge priority-${project.priority?.toLowerCase()}"
                          style="background-color: ${projectService.getPriorityColor(project.priority)}">
                        ${project.priority || 'Orta'}
                    </span>
                </td>
                <td>${project.planned_end_date ? formatter.date(project.planned_end_date) : '-'}</td>
                <td>${project.estimated_budget ? formatter.currency(project.estimated_budget) : '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.projectsPage.viewProject('${project.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.projectsPage.editProject('${project.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.projectsPage.deleteProject('${project.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Make table rows clickable
        tbody.querySelectorAll('.project-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;

                const projectId = row.dataset.projectId;
                this.viewProject(projectId);
            });
        });
    }

    applyFilters() {
        this.filteredProjects = this.projects.filter(project => {
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchMatch =
                    project.project_name?.toLowerCase().includes(searchTerm) ||
                    project.project_code?.toLowerCase().includes(searchTerm) ||
                    project.description?.toLowerCase().includes(searchTerm);

                if (!searchMatch) return false;
            }

            // Status filter
            if (this.filters.status && project.status !== this.filters.status) {
                return false;
            }

            // Priority filter
            if (this.filters.priority && project.priority !== this.filters.priority) {
                return false;
            }

            // Date filters
            if (this.filters.dateFrom && project.planned_start_date) {
                if (project.planned_start_date < this.filters.dateFrom) {
                    return false;
                }
            }

            if (this.filters.dateTo && project.planned_end_date) {
                if (project.planned_end_date > this.filters.dateTo) {
                    return false;
                }
            }

            return true;
        });

        this.renderProjects();
    }

    clearFilters() {
        this.filters = {
            status: '',
            priority: '',
            search: '',
            dateFrom: '',
            dateTo: ''
        };

        // Clear form inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';

        this.filteredProjects = [...this.projects];
        this.renderProjects();
    }

    sortProjects(sortBy) {
        const [field, direction] = sortBy.split('_');

        this.filteredProjects.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Handle different data types
            if (field === 'project_name') {
                aVal = aVal?.toLowerCase() || '';
                bVal = bVal?.toLowerCase() || '';
            } else if (field === 'created_at') {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
            } else if (field === 'priority') {
                const priorityOrder = { 'Kritik': 4, 'Yüksek': 3, 'Orta': 2, 'Düşük': 1 };
                aVal = priorityOrder[aVal] || 0;
                bVal = priorityOrder[bVal] || 0;
            } else if (field === 'progress') {
                aVal = a.overall_progress || 0;
                bVal = b.overall_progress || 0;
            }

            if (direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });

        this.renderProjects();
    }

    setViewMode(mode) {
        this.viewMode = mode;

        // Update UI
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${mode}"]`).classList.add('active');

        // Show/hide view containers
        document.getElementById('projectsGrid').style.display = mode === 'grid' ? 'block' : 'none';
        document.getElementById('projectsTable').style.display = mode === 'table' ? 'block' : 'none';

        this.renderProjects();
    }

    showLoading(show) {
        document.getElementById('loadingState').style.display = show ? 'block' : 'none';
    }

    showEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('projectsGrid').style.display = 'none';
        document.getElementById('projectsTable').style.display = 'none';
    }

    hideEmptyState() {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('projectsGrid').style.display = this.viewMode === 'grid' ? 'block' : 'none';
        document.getElementById('projectsTable').style.display = this.viewMode === 'table' ? 'block' : 'none';
    }

    async showNewProjectModal() {
        // Load customers and employees
        await this.loadFormData();

        document.getElementById('newProjectModal').classList.add('active');
    }

    hideNewProjectModal() {
        document.getElementById('newProjectModal').classList.remove('active');
        document.getElementById('newProjectForm').reset();
    }

    async loadFormData() {
        try {
            // Load customers
            const customersResult = await supabaseService.customers.getAll();
            if (customersResult.success) {
                const customerSelect = document.getElementById('customerId');
                customerSelect.innerHTML = '<option value="">Müşteri seçin...</option>' +
                    customersResult.data.map(customer =>
                        `<option value="${customer.id}">${customer.company_name || customer.customer_name}</option>`
                    ).join('');
            }

            // Load employees
            const employeesResult = await supabaseService.employees.getAll();
            if (employeesResult.success) {
                const managerSelect = document.getElementById('projectManagerId');
                managerSelect.innerHTML = '<option value="">Yönetici seçin...</option>' +
                    employeesResult.data.map(employee =>
                        `<option value="${employee.id}">${employee.full_name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Form verileri yüklenirken hata:', error);
        }
    }

    async handleNewProjectSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const projectData = {
            project_code: document.getElementById('projectCode').value,
            project_name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            customer_id: document.getElementById('customerId').value || null,
            project_manager_id: document.getElementById('projectManagerId').value || null,
            status: document.getElementById('projectStatus').value,
            priority: document.getElementById('projectPriority').value,
            planned_start_date: document.getElementById('plannedStartDate').value || null,
            planned_end_date: document.getElementById('plannedEndDate').value || null,
            estimated_budget: parseFloat(document.getElementById('estimatedBudget').value) || null,
            currency: document.getElementById('currency').value,
            created_by: this.currentUser?.id || null
        };

        try {
            const result = await projectService.createProject(projectData);

            if (result.success) {
                Toast.success('Proje başarıyla oluşturuldu!');
                this.hideNewProjectModal();
                await this.loadProjects();
            } else {
                Toast.error('Proje oluşturulurken hata: ' + result.error);
            }
        } catch (error) {
            console.error('Proje oluşturma hatası:', error);
            Toast.error('Beklenmeyen bir hata oluştu');
        }
    }

    // Project actions
    async viewProject(projectId) {
        // TODO: Show project detail modal
        console.log('View project:', projectId);
        Toast.info('Proje detay sayfası yakında eklenecek');
    }

    async editProject(projectId) {
        // TODO: Open edit modal with project data
        console.log('Edit project:', projectId);
        Toast.info('Proje düzenleme yakında eklenecek');
    }

    async duplicateProject(projectId) {
        // TODO: Duplicate project
        console.log('Duplicate project:', projectId);
        Toast.info('Proje kopyalama yakında eklenecek');
    }

    async archiveProject(projectId) {
        // TODO: Archive project
        console.log('Archive project:', projectId);
        Toast.info('Proje arşivleme yakında eklenecek');
    }

    async deleteProject(projectId) {
        if (!confirm('Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            return;
        }

        try {
            const result = await projectService.deleteProject(projectId);

            if (result.success) {
                Toast.success('Proje başarıyla silindi');
                await this.loadProjects();
            } else {
                Toast.error('Proje silinirken hata: ' + result.error);
            }
        } catch (error) {
            console.error('Proje silme hatası:', error);
            Toast.error('Beklenmeyen bir hata oluştu');
        }
    }

    toggleCardActions(projectId) {
        const dropdown = document.getElementById(`actions-${projectId}`);
        dropdown.classList.toggle('active');

        // Close other dropdowns
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            if (menu.id !== `actions-${projectId}`) {
                menu.classList.remove('active');
            }
        });
    }

    hideProjectDetailModal() {
        document.getElementById('projectDetailModal').classList.remove('active');
    }
}

// Global export for access from HTML onclick handlers
export function loadProjects() {
    const projectsPage = new ProjectsPage();

    // Set global reference
    window.projectsPage = projectsPage;

    // Render page
    document.getElementById('mainContent').innerHTML = projectsPage.render();

    // Initialize after DOM is ready
    setTimeout(() => {
        projectsPage.init();
    }, 100);
}