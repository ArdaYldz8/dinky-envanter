// Safe DOM Manipulation Utilities
import { escapeHtml, createElement } from './security.js';

/**
 * innerHTML yerine güvenli HTML set etmek için
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML string
 * @param {boolean} trusted - Eğer HTML güvenilir kaynaklardan geliyorsa true
 */
export function setHTML(element, html, trusted = false) {
    if (!element) return;

    if (trusted) {
        // DOMPurify kullanılabilirse daha iyi olur
        element.innerHTML = html;
    } else {
        // Güvensiz HTML'i text olarak set et
        element.textContent = html;
    }
}

/**
 * Güvenli tablo satırı oluşturur
 * @param {Object} data - Satır verisi
 * @param {Array} columns - Kolon tanımları
 * @returns {HTMLTableRowElement}
 */
export function createTableRow(data, columns) {
    const tr = document.createElement('tr');

    columns.forEach(col => {
        const td = document.createElement('td');

        if (col.html && col.trusted) {
            // Güvenilir HTML (örn: butonlar)
            td.innerHTML = col.html(data);
        } else if (col.render) {
            // Custom render fonksiyonu
            const content = col.render(data);
            if (typeof content === 'string') {
                td.textContent = content;
            } else if (content instanceof Node) {
                td.appendChild(content);
            }
        } else {
            // Basit text content
            const value = data[col.field];
            td.textContent = value !== null && value !== undefined ? String(value) : '';
        }

        // CSS class ekleme
        if (col.className) {
            td.className = col.className;
        }

        // Data attributes
        if (col.data) {
            Object.entries(col.data(data)).forEach(([key, value]) => {
                td.dataset[key] = value;
            });
        }

        tr.appendChild(td);
    });

    // Satıra data-id ekle
    if (data.id) {
        tr.dataset.id = data.id;
    }

    return tr;
}

/**
 * Güvenli liste oluşturur
 * @param {Array} items - Liste elemanları
 * @param {Function} renderItem - Her item için render fonksiyonu
 * @param {string} className - Liste class'ı
 * @returns {HTMLUListElement}
 */
export function createList(items, renderItem, className = '') {
    const ul = document.createElement('ul');
    if (className) ul.className = className;

    items.forEach(item => {
        const li = document.createElement('li');
        const content = renderItem(item);

        if (typeof content === 'string') {
            li.textContent = content;
        } else if (content instanceof Node) {
            li.appendChild(content);
        }

        ul.appendChild(li);
    });

    return ul;
}

/**
 * Güvenli form oluşturur
 * @param {Object} config - Form konfigürasyonu
 * @returns {HTMLFormElement}
 */
export function createForm(config) {
    const form = document.createElement('form');

    if (config.className) form.className = config.className;
    if (config.id) form.id = config.id;

    // CSRF token ekle
    if (config.csrf) {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = config.csrf;
        form.appendChild(csrfInput);
    }

    // Form fields
    if (config.fields) {
        config.fields.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';

            // Label
            if (field.label) {
                const label = document.createElement('label');
                label.textContent = field.label;
                if (field.id) label.htmlFor = field.id;
                group.appendChild(label);
            }

            // Input
            const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');

            if (field.type !== 'textarea') {
                input.type = field.type || 'text';
            }

            if (field.id) input.id = field.id;
            if (field.name) input.name = field.name;
            if (field.placeholder) input.placeholder = field.placeholder;
            if (field.required) input.required = true;
            if (field.value) input.value = field.value;
            if (field.className) input.className = field.className;

            // Validation attributes
            if (field.minLength) input.minLength = field.minLength;
            if (field.maxLength) input.maxLength = field.maxLength;
            if (field.pattern) input.pattern = field.pattern;
            if (field.min) input.min = field.min;
            if (field.max) input.max = field.max;

            group.appendChild(input);

            // Error message placeholder
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.style.display = 'none';
            group.appendChild(errorDiv);

            form.appendChild(group);
        });
    }

    // Submit button
    if (config.submitText) {
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = config.submitClass || 'btn btn-primary';
        submitBtn.textContent = config.submitText;
        form.appendChild(submitBtn);
    }

    // Form submit handler
    if (config.onSubmit) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await config.onSubmit(new FormData(form));
        });
    }

    return form;
}

/**
 * Select/Option elementlerini güvenli oluşturur
 * @param {Array} options - Seçenekler
 * @param {Object} config - Select konfigürasyonu
 * @returns {HTMLSelectElement}
 */
export function createSelect(options, config = {}) {
    const select = document.createElement('select');

    if (config.id) select.id = config.id;
    if (config.name) select.name = config.name;
    if (config.className) select.className = config.className;
    if (config.required) select.required = true;

    // Default option
    if (config.placeholder) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = config.placeholder;
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
    }

    // Options
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value || opt;
        option.textContent = opt.label || opt.text || opt;

        if (opt.selected || opt.value === config.value) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    return select;
}

/**
 * Alert/Notification gösterimi için güvenli yöntem
 * @param {string} message - Mesaj
 * @param {string} type - Mesaj tipi (success, error, warning, info)
 * @param {HTMLElement} container - Alert'in ekleneceği container
 */
export function showAlert(message, type = 'info', container = document.body) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;

    // Mesajı güvenli şekilde ekle
    alertDiv.textContent = message;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'alert-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => alertDiv.remove());

    alertDiv.appendChild(closeBtn);
    container.prepend(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

export default {
    setHTML,
    createTableRow,
    createList,
    createForm,
    createSelect,
    showAlert
};