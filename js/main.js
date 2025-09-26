// Main Application Router and Controller
import { testConnection, supabase } from './services/supabaseClient.js';
import { loadDashboard } from './pages/dashboard.js';
import { loadPersonnel } from './pages/personnel.js';
import { loadAttendance } from './pages/attendance.js';
import { loadStock } from './pages/stock.js';
import { loadBarcode } from './pages/barcode.js';
import { loadReports } from './pages/reports.js';
import { loadSettings } from './pages/settings.js';
import { loadTasks } from './pages/tasks.js';
import { loadCustomers } from './pages/customers.js';
import { loadQuotes } from './pages/quotes.js';
import { Toast } from './utils/toast.js';

// Router configuration
const routes = {
    'dashboard': loadDashboard,
    'personnel': loadPersonnel,
    'attendance': loadAttendance,
    'stock': loadStock,
    'barcode': loadBarcode,
    'customers': loadCustomers,
    'quotes': loadQuotes,
    'reports': loadReports,
    'tasks': loadTasks,
    'settings': loadSettings
};

// Current page state
let currentPage = 'dashboard';
let currentUser = null;

// Role-based permissions
const rolePermissions = {
    admin: ['dashboard', 'personnel', 'attendance', 'stock', 'barcode', 'customers', 'quotes', 'reports', 'tasks', 'settings'],
    warehouse: ['dashboard', 'stock', 'barcode'],
    accounting: ['dashboard', 'personnel', 'attendance', 'customers', 'quotes', 'reports', 'settings']
};

// Check authentication
async function checkAuth() {
    // First check Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        // No Supabase session, redirect to login
        window.location.href = 'login.html';
        return false;
    }

    const userStr = localStorage.getItem('dinky_user');
    if (!userStr) {
        // Supabase session exists but no local user data
        // Set up local user data from Supabase session
        const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.email.split('@')[0], // Use email prefix as name
            role: session.user.user_metadata?.role || 'admin',
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        localStorage.setItem('dinky_user', JSON.stringify(userData));
        currentUser = userData;
    } else {
        try {
            currentUser = JSON.parse(userStr);

            // Check if session is from before password update
            const loginTime = new Date(currentUser.loginTime);
            const passwordUpdateTime = new Date('2025-09-17T20:00:00'); // Password update time

            if (loginTime < passwordUpdateTime) {
                // Force logout for old sessions
                localStorage.removeItem('dinky_user');
                await supabase.auth.signOut();
                alert('Güvenlik güncellemesi nedeniyle oturumunuz sonlandırıldı. Lütfen yeni şifrenizle tekrar giriş yapın.');
                window.location.href = 'login.html';
                return false;
            }

            // Check session timeout (8 hours)
            const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
            const now = new Date();
            const sessionAge = now - loginTime;

            if (sessionAge > SESSION_TIMEOUT) {
                localStorage.removeItem('dinky_user');
                await supabase.auth.signOut();
                alert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
                window.location.href = 'login.html';
                return false;
            }

            // Update last activity time
            currentUser.lastActivity = now.toISOString();
            localStorage.setItem('dinky_user', JSON.stringify(currentUser));
        } catch (e) {
            // Invalid session data
            localStorage.removeItem('dinky_user');
            await supabase.auth.signOut();
            window.location.href = 'login.html';
            return false;
        }
    }
    
    // Update UI with user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <span class="user-name"><i class="fas fa-user"></i> ${currentUser.name}</span>
            <span class="user-role">(${getRoleDisplay(currentUser.role)})</span>
            <button class="btn btn-sm btn-danger" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Çıkış
            </button>
        `;
    }
    
    // Hide unauthorized menu items
    hideUnauthorizedMenus();
    
    return true;
}

// Get role display name
function getRoleDisplay(role) {
    const roleNames = {
        admin: 'Yönetici',
        warehouse: 'Depo',
        accounting: 'Muhasebe'
    };
    return roleNames[role] || role;
}

// Hide unauthorized menu items
function hideUnauthorizedMenus() {
    const allowedPages = rolePermissions[currentUser.role] || [];

    // Hide individual nav items and dropdown items
    document.querySelectorAll('[data-page]').forEach(element => {
        const page = element.dataset.page;
        if (!allowedPages.includes(page)) {
            if (element.classList.contains('dropdown-item')) {
                element.style.display = 'none';
            } else {
                // For regular nav items, hide the parent li
                const parentItem = element.closest('.nav-item');
                if (parentItem) {
                    parentItem.style.display = 'none';
                }
            }
        } else {
            if (element.classList.contains('dropdown-item')) {
                element.style.display = '';
            } else {
                const parentItem = element.closest('.nav-item');
                if (parentItem) {
                    parentItem.style.display = '';
                }
            }
        }
    });

    // Hide empty dropdowns
    document.querySelectorAll('.nav-item').forEach(item => {
        const dropdown = item.querySelector('.dropdown-menu');
        if (dropdown) {
            const visibleItems = dropdown.querySelectorAll('.dropdown-item:not([style*="display: none"])');
            if (visibleItems.length === 0) {
                item.style.display = 'none';
            }
        }
    });
}

// Check page permission
function hasPagePermission(page) {
    if (!currentUser) return false;
    const allowedPages = rolePermissions[currentUser.role] || [];
    return allowedPages.includes(page);
}

// Activity logging function
async function logActivity(actionType, tableName, recordId, oldValues, newValues, description) {
    try {
        if (!currentUser) return;
        
        await supabase.rpc('log_activity', {
            p_user_id: currentUser.id,
            p_user_name: currentUser.name,
            p_user_role: currentUser.role,
            p_action_type: actionType,
            p_table_name: tableName,
            p_record_id: recordId,
            p_old_values: oldValues,
            p_new_values: newValues,
            p_description: description
        });
    } catch (error) {
        console.error('Activity logging error:', error);
    }
}

// Logout function with activity logging
window.logout = async function() {
    if (confirm('Çıkmak istediğinizden emin misiniz?')) {
        // Logout activity logging removed - not needed

        localStorage.removeItem('dinky_user');
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Dinky Metal ERP...');



    // Check authentication first
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }
    
    // Test Supabase connection
    const isConnected = await testConnection();
    if (!isConnected) {
        Toast.error('Veritabanı bağlantısı kurulamadı. Lütfen sayfayı yenileyin.');
        return;
    }
    
    // Setup navigation
    setupNavigation();
    
    // Load initial page
    await navigateTo('dashboard');
    
    // Setup hash change listener for browser back/forward
    window.addEventListener('hashchange', handleHashChange);
});

// Setup navigation click handlers
function setupNavigation() {
    // Handle dropdown toggles
    document.querySelectorAll('.nav-link.has-dropdown').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdown = this.nextElementSibling;
            const isOpen = dropdown.classList.contains('show');

            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
                menu.previousElementSibling.classList.remove('open');
            });

            // Toggle current dropdown
            if (!isOpen) {
                dropdown.classList.add('show');
                this.classList.add('open');
            } else {
                dropdown.classList.remove('show');
                this.classList.remove('open');
            }
        });
    });

    // Handle sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');
    const sidebar = document.getElementById('sidebar');

    // Toggle from inside sidebar
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.add('collapsed');
            // Save preference
            localStorage.setItem('sidebarCollapsed', 'true');
        });
    }

    // Expand button when collapsed
    if (sidebarExpandBtn) {
        sidebarExpandBtn.addEventListener('click', function() {
            sidebar.classList.remove('collapsed');
            // Save preference
            localStorage.setItem('sidebarCollapsed', 'false');
        });
    }

    // Restore sidebar state
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    // Handle regular nav links and dropdown items
    const navLinks = document.querySelectorAll('.nav-link:not(.has-dropdown), .dropdown-item');

    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                // If it's a dropdown item, also highlight parent
                if (link.classList.contains('dropdown-item')) {
                    const parentDropdown = link.closest('.nav-item');
                    if (parentDropdown) {
                        const parentButton = parentDropdown.querySelector('.nav-link.has-dropdown');
                        if (parentButton) {
                            // Mark parent as active but don't add active class to dropdown button
                            document.querySelectorAll('.nav-link.has-dropdown').forEach(btn => {
                                btn.classList.remove('active');
                            });
                        }
                    }
                }
                await navigateTo(page);
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-item')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
                menu.previousElementSibling.classList.remove('open');
            });
        }
    });
}

// Navigate to page
async function navigateTo(page) {
    if (!routes[page]) {
        console.error('Page not found:', page);
        return;
    }
    
    // Check page permission
    if (!hasPagePermission(page)) {
        Toast.error('Bu sayfaya erişim yetkiniz bulunmuyor');
        return;
    }
    
    // Clear dashboard interval if leaving dashboard
    if (currentPage === 'dashboard' && page !== 'dashboard') {
        if (window.dashboardRefreshInterval) {
            clearInterval(window.dashboardRefreshInterval);
            window.dashboardRefreshInterval = null;
        }
    }
    
    // Update current page
    currentPage = page;
    
    // Update URL hash
    window.location.hash = page;
    
    // Update active nav link
    document.querySelectorAll('.nav-link, .dropdown-item').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
            // If it's a dropdown item, also mark parent as active
            if (link.classList.contains('dropdown-item')) {
                const parentItem = link.closest('.nav-item');
                if (parentItem) {
                    const parentLink = parentItem.querySelector('.nav-link.has-dropdown');
                    if (parentLink) {
                        parentLink.classList.add('active');
                    }
                }
            }
        } else {
            link.classList.remove('active');
        }
    });
    
    // Clear main content and show loading
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Yükleniyor...</p>
        </div>
    `;
    
    try {
        // Load page content
        await routes[page]();
    } catch (error) {
        console.error('Page loading error:', error);
        mainContent.innerHTML = `
            <div class="error-page">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Sayfa Yüklenemedi</h2>
                <p>Bir hata oluştu. Lütfen sayfayı yenileyin.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Sayfayı Yenile
                </button>
            </div>
        `;
    }
}

// Handle browser hash changes
function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash && routes[hash] && hash !== currentPage) {
        navigateTo(hash);
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Toast.error('Beklenmeyen bir hata oluştu');
});

// Prevent form resubmission on refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}