// Formatting Utilities
export const formatter = {
    // Format currency
    currency(value) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(value || 0);
    },

    // Format number
    number(value, decimals = 2) {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value || 0);
    },

    // Format stock numbers (no unnecessary decimals)
    stock(value) {
        const num = parseFloat(value || 0);
        return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '');
    },

    // Format date
    date(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('tr-TR').format(date);
    },

    // Format datetime
    datetime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    // Format date for input
    dateForInput(dateString) {
        if (!dateString) {
            const today = new Date();
            return today.toISOString().split('T')[0];
        }
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    },

    // Format date for display
    dateDisplay(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    },

    // Get month name
    monthName(month) {
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return months[month - 1];
    }
};