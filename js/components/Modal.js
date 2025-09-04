// Modal Component
export class Modal {
    constructor(options = {}) {
        this.options = {
            title: 'Modal',
            content: '',
            size: 'medium', // small, medium, large
            closeButton: true,
            backdrop: true,
            ...options
        };
        this.modal = null;
        this.onClose = null;
    }

    create() {
        const container = document.getElementById('modalContainer');
        if (!container) return;

        // Create modal HTML
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog modal-${this.options.size}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.options.title}</h3>
                        ${this.options.closeButton ? '<button class="modal-close">&times;</button>' : ''}
                    </div>
                    <div class="modal-body">
                        ${this.options.content}
                    </div>
                </div>
            </div>
        `;

        container.appendChild(this.modal);
        this.attachEvents();
        
        // Show animation
        setTimeout(() => this.modal.classList.add('show'), 10);
        
        return this;
    }

    attachEvents() {
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Backdrop click
        if (this.options.backdrop) {
            const backdrop = this.modal.querySelector('.modal-backdrop');
            backdrop.addEventListener('click', () => this.close());
        }

        // Escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    setContent(content) {
        const body = this.modal.querySelector('.modal-body');
        if (body) body.innerHTML = content;
        return this;
    }

    show() {
        this.create();
        return this;
    }

    close() {
        if (!this.modal) return;
        
        this.modal.classList.remove('show');
        document.removeEventListener('keydown', this.escapeHandler);
        
        setTimeout(() => {
            this.modal.remove();
            if (this.onClose) this.onClose();
        }, 300);
    }

    static confirm(message, title = 'Onaylama') {
        return new Promise((resolve) => {
            const modal = new Modal({
                title,
                content: `
                    <p>${message}</p>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="modalCancel">İptal</button>
                        <button class="btn btn-primary" id="modalConfirm">Onayla</button>
                    </div>
                `,
                size: 'small'
            });

            modal.show();

            const confirmBtn = modal.modal.querySelector('#modalConfirm');
            const cancelBtn = modal.modal.querySelector('#modalCancel');

            confirmBtn.addEventListener('click', () => {
                modal.close();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                modal.close();
                resolve(false);
            });
        });
    }
}