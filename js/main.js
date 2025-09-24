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
import { Toast } from './utils/toast.js';
import { initCSRFProtection } from './middleware/csrfMiddleware.js';

// Router configuration
const routes = {
    'dashboard': loadDashboard,
    'personnel': loadPersonnel,
    'attendance': loadAttendance,
    'stock': loadStock,
    'barcode': loadBarcode,
    'customers': loadCustomers,
    'reports': loadReports,
    'tasks': loadTasks,
    'settings': loadSettings
};

// Current page state
let currentPage = 'dashboard';
let currentUser = null;

// Role-based permissions
const rolePermissions = {
    admin: ['dashboard', 'personnel', 'attendance', 'stock', 'barcode', 'customers', 'reports', 'tasks', 'settings'],
    warehouse: ['dashboard', 'stock', 'barcode'],
    accounting: ['dashboard', 'personnel', 'attendance', 'customers', 'reports', 'settings']
};

// Check authentication
function checkAuth() {
    const userStr = localStorage.getItem('dinky_user');
    if (!userStr) {
        window.location.href = 'login.html';
        return false;
    }

    try {
        currentUser = JSON.parse(userStr);

        // Check if session is from before password update
        const loginTime = new Date(currentUser.loginTime);
        const passwordUpdateTime = new Date('2025-09-17T20:00:00'); // Password update time

        if (loginTime < passwordUpdateTime) {
            // Force logout for old sessions
            localStorage.removeItem('dinky_user');
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
        window.location.href = 'login.html';
        return false;
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
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const link = item.querySelector('a[data-page]');
        if (link) {
            const page = link.dataset.page;
            if (!allowedPages.includes(page)) {
                item.style.display = 'none';
            } else {
                item.style.display = '';
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
        window.location.href = 'login.html';
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Dinky Metal ERP...');

    // Initialize CSRF protection
    initCSRFProtection();
    console.log('✅ CSRF protection initialized');

    // Check authentication first
    if (!checkAuth()) {
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
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            await navigateTo(page);
        });
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
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
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