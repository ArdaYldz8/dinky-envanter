// User Context Utility
// Kullanıcı bilgilerini almak için utility fonksiyonlar

export function getCurrentUser() {
    const userStr = localStorage.getItem('dinky_user');
    return userStr ? JSON.parse(userStr) : null;
}

export function getCurrentUserInfo() {
    const user = getCurrentUser();
    if (!user) {
        return {
            id: null,
            name: 'Sistem',
            role: 'system'
        };
    }
    
    // Debug user data
    console.log('Current user data:', user);
    
    return {
        id: user.id,
        name: user.name || user.full_name || user.email || 'Kullanıcı',
        role: user.role || 'user'
    };
}

export function isLoggedIn() {
    return getCurrentUser() !== null;
}

export function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

export function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : 'guest';
}