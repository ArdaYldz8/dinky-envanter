// Barcode Scanner Component
// Uses QuaggaJS library for barcode scanning

export class BarcodeScanner {
    constructor(options = {}) {
        this.options = {
            targetElementId: 'barcode-scanner',
            onDetected: null,
            onError: null,
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#barcode-scanner'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment" // Use back camera
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: 2,
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "i2of5_reader"
                ]
            },
            ...options
        };
        this.isScanning = false;
    }

    async init() {
        // Load QuaggaJS library dynamically
        if (!window.Quagga) {
            await this.loadQuaggaLibrary();
        }
        
        this.setupScanner();
    }

    async loadQuaggaLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupScanner() {
        const config = {
            inputStream: this.options.inputStream,
            locator: this.options.locator,
            numOfWorkers: this.options.numOfWorkers,
            decoder: this.options.decoder,
            locate: true
        };

        // Initialize Quagga
        window.Quagga.init(config, (err) => {
            if (err) {
                console.error('Barcode scanner initialization error:', err);
                if (this.options.onError) {
                    this.options.onError(err);
                }
                return;
            }
            console.log('Barcode scanner initialized');
        });

        // Set up barcode detection handler
        window.Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            console.log('Barcode detected:', code);
            
            if (this.options.onDetected) {
                this.options.onDetected(code);
            }
        });
    }

    start() {
        if (!this.isScanning) {
            window.Quagga.start();
            this.isScanning = true;
        }
    }

    stop() {
        if (this.isScanning) {
            window.Quagga.stop();
            this.isScanning = false;
        }
    }

    destroy() {
        this.stop();
        if (window.Quagga) {
            window.Quagga.offDetected();
        }
    }
}

// Manual barcode input component
export class ManualBarcodeInput {
    constructor(inputElement, onSubmit) {
        this.inputElement = inputElement;
        this.onSubmit = onSubmit;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for Enter key or barcode scanner input
        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = this.inputElement.value.trim();
                if (barcode) {
                    this.onSubmit(barcode);
                    this.clear();
                }
            }
        });

        // Auto-submit after a pause (for barcode scanners that act like keyboards)
        let timeout;
        this.inputElement.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const barcode = this.inputElement.value.trim();
                if (barcode && barcode.length > 8) { // Minimum barcode length
                    this.onSubmit(barcode);
                    this.clear();
                }
            }, 100); // Wait 100ms after last input
        });
    }

    clear() {
        this.inputElement.value = '';
    }

    focus() {
        this.inputElement.focus();
    }
}

// Barcode generator/display utility
export class BarcodeDisplay {
    static generateBarcode(text, elementId, options = {}) {
        // Use JsBarcode library for generating barcode images
        if (window.JsBarcode) {
            window.JsBarcode(`#${elementId}`, text, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 12,
                ...options
            });
        }
    }

    static async loadJsBarcodeLibrary() {
        if (!window.JsBarcode) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }
}