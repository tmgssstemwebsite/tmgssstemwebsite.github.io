
// state-saver.js - Modular state saving and restoration for web applications
// Copy this entire script and save as state-saver.js

/**
 * State Saver Module
 * A modular JavaScript library to extract, save, and restore webpage state
 */
class StateSaver {
    constructor(options = {}) {
        this.options = {
            position: options.position || 'bottom-right',
            primaryColor: options.primaryColor || '#5D5CDE',
            zIndex: options.zIndex || 9999,
            filename: options.filename || 'page-state.json',
            ...options
        };
        
        this.isOpen = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.results = null;
        this.isCompactMode = options.compactMode || false;
        this.reactMode = options.reactMode || false;

        // Track detected frameworks
        this.detectedFrameworks = {
            react: typeof React !== 'undefined' || window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot]'),
            vue: typeof Vue !== 'undefined' || document.querySelector('[data-v-]'),
            angular: typeof angular !== 'undefined' || document.querySelector('[ng-]') || window.ng
        };
        
        if (this.detectedFrameworks.react) {
            console.log('React detected - enabling React compatibility mode');
            this.reactMode = true;
        }

        this.init();
    }
    
    init() {
        this.injectStyles();
        this.createFloatingButton();
        this.createPopupContainer();
        this.setupEventListeners();
    }
    
    injectStyles() {
        // Create the style element
        const style = document.createElement('style');
        style.id = 'state-saver-styles';
        
        // Define the CSS
        style.textContent = `
            .ss-float-btn {
                position: fixed;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background-color: ${this.options.primaryColor};
                color: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                user-select: none;
                z-index: ${this.options.zIndex};
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .ss-float-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            }
            
            .ss-icon {
                width: 24px;
                height: 24px;
                fill: white;
            }
            
            .ss-popup {
                position: fixed;
                background-color: white;
                width: 360px;
                max-width: 90vw;
                max-height: 80vh;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: ${this.options.zIndex - 1};
                overflow: hidden;
                display: none;
                flex-direction: column;
            }
            
            .ss-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                background-color: ${this.options.primaryColor};
                color: white;
                cursor: move;
            }
            
            .ss-title {
                font-weight: bold;
                font-size: 16px;
                user-select: none;
            }
            
            .ss-close {
                width: 20px;
                height: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ss-content {
                padding: 16px;
                overflow-y: auto;
                flex: 1;
            }
            
            .ss-section {
                margin-bottom: 20px;
            }
            
            .ss-section-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: #333;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .ss-checkbox {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .ss-checkbox input {
                margin-right: 8px;
            }
            
            .ss-button {
                background-color: ${this.options.primaryColor};
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            .ss-button:hover {
                background-color: ${this.lightenDarkenColor(this.options.primaryColor, -20)};
            }
            
            .ss-button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            
            .ss-secondary-button {
                background-color: #f0f0f0;
                color: #333;
            }
            
            .ss-secondary-button:hover {
                background-color: #e0e0e0;
            }
            
            .ss-textarea {
                width: 100%;
                min-height: 120px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                resize: vertical;
                font-family: monospace;
                font-size: 12px;
            }
            
            .ss-results-container {
                border: 1px solid #ddd;
                border-radius: 4px;
                max-height: 200px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 12px;
                margin-top: 12px;
            }
            
            .ss-json-viewer {
                padding: 12px;
            }
            
            .ss-json-key {
                color: #881280;
            }
            
            .ss-json-string {
                color: #1A1AA6;
            }
            
            .ss-json-number {
                color: #1f7b1f;
            }
            
            .ss-json-boolean {
                color: #0000ff;
            }
            
            .ss-json-null {
                color: #808080;
            }
            
            .ss-toggle {
                cursor: pointer;
                user-select: none;
            }
            
            .ss-status {
                font-size: 12px;
                margin-top: 8px;
                min-height: 16px;
            }
            
            .ss-buttons-row {
                display: flex;
                gap: 8px;
                margin-top: 16px;
                flex-wrap: wrap;
            }
            
            .ss-footer {
                padding: 12px 16px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background-color: #f9f9f9;
            }
            
            .ss-file-input {
                position: absolute;
                width: 0.1px;
                height: 0.1px;
                opacity: 0;
                overflow: hidden;
                z-index: -1;
            }
            
            .ss-file-label {
                display: inline-block;
                padding: 8px 16px;
                background-color: #f0f0f0;
                color: #333;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            .ss-file-label:hover {
                background-color: #e0e0e0;
            }
            
            .ss-file-label-text {
                margin-left: 5px;
            }
            
            .ss-tabs {
                display: flex;
                border-bottom: 1px solid #ddd;
                margin-bottom: 16px;
            }
            
            .ss-tab {
                padding: 8px 16px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
            }
            
            .ss-tab.active {
                border-bottom-color: ${this.options.primaryColor};
                color: ${this.options.primaryColor};
            }
            
            .ss-tab-content {
                display: none;
            }
            
            .ss-tab-content.active {
                display: block;
            }
            
            .ss-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                background-color: #e8e8e8;
                color: #555;
            }
            
            .ss-badge-react {
                background-color: #61dafb;
                color: #222;
            }
            
            .ss-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 16px;
                background-color: #4caf50;
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: ${this.options.zIndex + 1};
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.3s, transform 0.3s;
            }
            
            .ss-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .ss-notification.error {
                background-color: #f44336;
            }
            
            @media (prefers-color-scheme: dark) {
                .ss-popup {
                    background-color: #222;
                    color: #f0f0f0;
                }
                
                .ss-section-title {
                    color: #f0f0f0;
                }
                
                .ss-secondary-button {
                    background-color: #444;
                    color: #f0f0f0;
                }
                
                .ss-secondary-button:hover {
                    background-color: #555;
                }
                
                .ss-button:disabled {
                    background-color: #555;
                    color: #aaa;
                }
                
                .ss-textarea {
                    background-color: #333;
                    color: #f0f0f0;
                    border-color: #555;
                }
                
                .ss-results-container {
                    border-color: #555;
                    background-color: #333;
                }
                
                .ss-footer {
                    background-color: #2a2a2a;
                    border-color: #444;
                }
                
                .ss-file-label {
                    background-color: #444;
                    color: #f0f0f0;
                }
                
                .ss-file-label:hover {
                    background-color: #555;
                }
                
                .ss-tabs {
                    border-color: #444;
                }
                
                .ss-badge {
                    background-color: #444;
                    color: #ddd;
                }
                
                .ss-json-key {
                    color: #cf6ccf;
                }
                
                .ss-json-string {
                    color: #6e6ed8;
                }
                
                .ss-json-number {
                    color: #4caf50;
                }
                
                .ss-json-boolean {
                    color: #2196f3;
                }
            }
        `;
        
        // Append to document
        document.head.appendChild(style);
    }
    
    lightenDarkenColor(col, amt) {
        let usePound = false;
        
        if (col[0] === "#") {
            col = col.slice(1);
            usePound = true;
        }
     
        let num = parseInt(col, 16);
     
        let r = (num >> 16) + amt;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
     
        let b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
     
        let g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
     
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
    
    createFloatingButton() {
        // Create button element
        const button = document.createElement('div');
        button.className = 'ss-float-btn';
        button.id = 'ss-float-btn';
        
        // Set position based on options
        switch (this.options.position) {
            case 'top-left':
                button.style.top = '20px';
                button.style.left = '20px';
                break;
            case 'top-right':
                button.style.top = '20px';
                button.style.right = '20px';
                break;
            case 'bottom-left':
                button.style.bottom = '20px';
                button.style.left = '20px';
                break;
            case 'bottom-right':
            default:
                button.style.bottom = '20px';
                button.style.right = '20px';
                break;
        }
        
        // Add icon
        button.innerHTML = `
            <svg class="ss-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
            </svg>
        `;
        
        // Add to document
        document.body.appendChild(button);
    }
    
    createPopupContainer() {
        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'ss-popup';
        popup.id = 'ss-popup';
        
        // Set initial position based on floating button position
        const floatBtn = document.getElementById('ss-float-btn');
        const rect = floatBtn.getBoundingClientRect();
        
        switch (this.options.position) {
            case 'top-left':
                popup.style.top = `${rect.bottom + 10}px`;
                popup.style.left = `${rect.left}px`;
                break;
            case 'top-right':
                popup.style.top = `${rect.bottom + 10}px`;
                popup.style.right = `${window.innerWidth - rect.right}px`;
                break;
            case 'bottom-left':
                popup.style.bottom = `${window.innerHeight - rect.top + 10}px`;
                popup.style.left = `${rect.left}px`;
                break;
            case 'bottom-right':
            default:
                popup.style.bottom = `${window.innerHeight - rect.top + 10}px`;
                popup.style.right = `${window.innerWidth - rect.right}px`;
                break;
        }
        
        // Add tabs menu first
        const tabsMenu = `
            <div class="ss-tabs">
                <div class="ss-tab active" data-tab="save">Save State</div>
                <div class="ss-tab" data-tab="restore">Restore State</div>
            </div>
        `;
        
        // Prepare framework badge
        let frameworkBadge = '';
        if (this.detectedFrameworks.react) {
            frameworkBadge = '<span class="ss-badge ss-badge-react">React</span>';
        } else if (this.detectedFrameworks.vue) {
            frameworkBadge = '<span class="ss-badge ss-badge-vue">Vue</span>';
        } else if (this.detectedFrameworks.angular) {
            frameworkBadge = '<span class="ss-badge ss-badge-angular">Angular</span>';
        }
        
        // Add popup content
        popup.innerHTML = `
            <div class="ss-header" id="ss-header">
                <div class="ss-title">Page State Saver ${frameworkBadge}</div>
                <div class="ss-close" id="ss-close">✕</div>
            </div>
            <div class="ss-content">
                ${tabsMenu}
                
                <!-- Save State Tab -->
                <div class="ss-tab-content active" data-tab-content="save">
                    <div class="ss-section">
                        <div class="ss-section-title">Scan Options</div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-scan-global" checked>
                            <label for="ss-scan-global">Global Variables</label>
                        </div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-scan-dom" checked>
                            <label for="ss-scan-dom">DOM Elements</label>
                        </div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-scan-forms" checked>
                            <label for="ss-scan-forms">Form Data</label>
                        </div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-scan-localstorage">
                            <label for="ss-scan-localstorage">localStorage (if available)</label>
                        </div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-exclude-internal" checked>
                            <label for="ss-exclude-internal">Exclude Internal Variables</label>
                        </div>
                        <div class="ss-buttons-row">
                            <button id="ss-scan-btn" class="ss-button">Scan Page</button>
                        </div>
                    </div>
                    
                    <div class="ss-section">
                        <div class="ss-section-title">Custom Variables</div>
                        <textarea id="ss-custom-vars" class="ss-textarea" placeholder="Enter variable names one per line or JSON structure"></textarea>
                        <div class="ss-buttons-row">
                            <button id="ss-add-vars-btn" class="ss-button ss-secondary-button">Add Variables</button>
                        </div>
                    </div>
                    
                    <div class="ss-section">
                        <div class="ss-section-title">Results</div>
                        <div class="ss-status" id="ss-status">Click "Scan Page" to begin</div>
                        <div class="ss-results-container">
                            <div id="ss-json-viewer" class="ss-json-viewer">
                                <div class="ss-json-null">No data yet</div>
                            </div>
                        </div>
                        <div class="ss-buttons-row">
                            <button id="ss-copy-btn" class="ss-button">Copy JSON</button>
                            <button id="ss-export-btn" class="ss-button">File</button>
                            <button id="ss-beautify-btn" class="ss-button ss-secondary-button">Toggle Format</button>
                        </div>
                    </div>
                </div>
                
                <!-- Restore State Tab -->
                <div class="ss-tab-content" data-tab-content="restore">
                    <div class="ss-section">
                        <div class="ss-section-title">Import State</div>
                        <p>Upload a previously exported JSON file to restore page state.</p>
                        
                        <div class="ss-buttons-row">
                            <input type="file" id="ss-file-input" class="ss-file-input" accept=".json,application/json">
                            <label for="ss-file-input" class="ss-file-label">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <span class="ss-file-label-text">Choose File</span>
                            </label>
                        </div>
                        
                        <div id="ss-file-info" class="ss-status"></div>
                    </div>
                    
                    <div class="ss-section">
                        <div class="ss-section-title">Paste JSON</div>
                        <textarea id="ss-restore-json" class="ss-textarea" placeholder="Or paste JSON here to restore state"></textarea>
                        <div class="ss-buttons-row">
                            <button id="ss-parse-json-btn" class="ss-button">Parse JSON</button>
                        </div>
                    </div>
                    
                    <div class="ss-section">
                        <div class="ss-section-title">Restore Options</div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-restore-global" checked>
                            <label for="ss-restore-global">Global Variables</label>
                        </div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-restore-forms" checked>
                            <label for="ss-restore-forms">Form Values</label>
                        </div>
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-restore-localstorage">
                            <label for="ss-restore-localstorage">localStorage</label>
                        </div>
                        ${this.reactMode ? `
                        <div class="ss-checkbox">
                            <input type="checkbox" id="ss-restore-react" checked>
                            <label for="ss-restore-react">React State (may need refresh)</label>
                        </div>` : ''}
                        <div class="ss-status" id="ss-restore-status"></div>
                        <div class="ss-buttons-row">
                            <button id="ss-restore-btn" class="ss-button" disabled>Restore State</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ss-footer">
                <div class="ss-version">v1.1.0</div>
                <button id="ss-close-btn" class="ss-button ss-secondary-button">Close</button>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(popup);
    }
    
    setupEventListeners() {
        // Open/close popup
        document.getElementById('ss-float-btn').addEventListener('click', () => this.togglePopup());
        document.getElementById('ss-close').addEventListener('click', () => this.closePopup());
        document.getElementById('ss-close-btn').addEventListener('click', () => this.closePopup());
        
        // Scan button
        document.getElementById('ss-scan-btn').addEventListener('click', () => this.scanPage());
        
        // Copy button
        document.getElementById('ss-copy-btn').addEventListener('click', () => this.copyToClipboard());
        
        // button
        document.getElementById('ss-export-btn').addEventListener('click', () => this.exportToFile());
        
        // Format toggle
        document.getElementById('ss-beautify-btn').addEventListener('click', () => this.toggleFormat());
        
        // Add custom variables
        document.getElementById('ss-add-vars-btn').addEventListener('click', () => this.addCustomVariables());
        
        // Tab switching
        document.querySelectorAll('.ss-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // File input handler
        document.getElementById('ss-file-input').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Parse JSON button
        document.getElementById('ss-parse-json-btn').addEventListener('click', () => this.parseImportedJson());
        
        // Restore button
        document.getElementById('ss-restore-btn').addEventListener('click', () => this.restoreState());
        
        // Setup drag functionality for the popup
        this.setupDragHandling();
    }
    
    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.ss-tab').forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.ss-tab-content').forEach(content => {
            if (content.getAttribute('data-tab-content') === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
    
    setupDragHandling() {
        const header = document.getElementById('ss-header');
        const popup = document.getElementById('ss-popup');
        
        header.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = popup.getBoundingClientRect();
            
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            popup.style.transition = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            popup.style.right = 'auto';
            popup.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            popup.style.transition = 'opacity 0.3s ease';
        });
    }
    
    togglePopup() {
        const popup = document.getElementById('ss-popup');
        
        if (this.isOpen) {
            this.closePopup();
        } else {
            popup.style.display = 'flex';
            this.isOpen = true;
        }
    }
    
    closePopup() {
        const popup = document.getElementById('ss-popup');
        popup.style.display = 'none';
        this.isOpen = false;
    }
    
    scanPage() {
        const statusEl = document.getElementById('ss-status');
        statusEl.textContent = 'Scanning page...';
        statusEl.style.color = this.options.primaryColor;
        
        // Get scan options
        const scanGlobal = document.getElementById('ss-scan-global').checked;
        const scanDom = document.getElementById('ss-scan-dom').checked;
        const scanForms = document.getElementById('ss-scan-forms').checked;
        const scanLocalStorage = document.getElementById('ss-scan-localstorage').checked;
        const excludeInternal = document.getElementById('ss-exclude-internal').checked;
        
        // Perform scan (with a slight delay for UI feedback)
        setTimeout(() => {
            try {
                this.results = {};
                
                // Scan global variables
                if (scanGlobal) {
                    this.results.globalVariables = this.scanGlobalVariables(excludeInternal);
                }
                
                // Scan DOM elements
                if (scanDom) {
                    this.results.domElements = this.scanDomElements();
                }
                
                // Scan forms
                if (scanForms) {
                    this.results.formData = this.scanForms();
                }
                
                // Scan localStorage
                if (scanLocalStorage && window.localStorage) {
                    this.results.localStorage = this.scanLocalStorage();
                }
                
                // Add metadata
                this.results.metadata = {
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    framework: Object.keys(this.detectedFrameworks).find(key => this.detectedFrameworks[key]) || 'none'
                };
                
                // Display results
                this.displayResults();
                
                statusEl.textContent = 'Scan complete!';
                statusEl.style.color = 'green';
                
                // Enable buttons
                document.getElementById('ss-copy-btn').removeAttribute('disabled');
                document.getElementById('ss-export-btn').removeAttribute('disabled');
            } catch (error) {
                console.error('Error scanning page:', error);
                statusEl.textContent = `Error: ${error.message}`;
                statusEl.style.color = 'red';
            }
        }, 500);
    }
    
    scanGlobalVariables(excludeInternal = true) {
        const globals = {};
        const internalProps = [
            'StateSaver', 'initStateSaver', 
            'window', 'document', 'location', 'history', 
            'localStorage', 'sessionStorage', 'console', 
            'navigator', 'alert', 'confirm', 'prompt',
            'parseInt', 'parseFloat', 'setTimeout', 'setInterval'
        ];
        
        // Get all properties of the window object
        for (const prop in window) {
            // Skip internal properties based on naming patterns
            if (excludeInternal && (
                internalProps.includes(prop) || 
                prop.startsWith('Web') || 
                prop.startsWith('HTML') || 
                prop.startsWith('CSS') || 
                prop.startsWith('_') || 
                typeof window[prop] === 'function' ||
                // Skip React internals
                prop.startsWith('__REACT') ||
                prop === 'React' ||
                prop === 'ReactDOM'
            )) {
                continue;
            }
            
            try {
                const value = window[prop];
                
                // Skip functions unless we want to include their names
                if (typeof value === 'function') continue;
                
                // Skip DOM nodes
                if (value instanceof Node) continue;
                
                // Skip internal browser objects
                if (value && typeof value === 'object' && value.constructor && 
                    (value.constructor.name.startsWith('HTML') || 
                     value.constructor.name.startsWith('CSS') ||
                     value.constructor.name.includes('Event'))) {
                    continue;
                }
                
                // Try to convert to a simple value for JSON
                try {
                    globals[prop] = this.simplifyForJson(value);
                } catch (e) {
                    globals[prop] = `[Could not stringify: ${typeof value}]`;
                }
            } catch (e) {
                // Skip properties that can't be accessed
                continue;
            }
        }
        
        return globals;
    }
    
    scanDomElements() {
        const elements = {};
        
        // Get elements with IDs
        const elementsWithId = document.querySelectorAll('[id]');
        elementsWithId.forEach(el => {
            const id = el.id;
            if (id && id !== 'ss-popup' && id !== 'ss-float-btn' && !id.startsWith('ss-')) {
                elements[id] = {
                    tag: el.tagName.toLowerCase(),
                    type: el.type || null,
                    classes: Array.from(el.classList).filter(c => !c.startsWith('ss-')),
                    attributes: this.getElementAttributes(el)
                };
            }
        });
        
        return elements;
    }
    
    getElementAttributes(element) {
        const attributes = {};
        
        for (const attr of element.attributes) {
            if (attr.name !== 'id' && attr.name !== 'class' && !attr.name.startsWith('ss-')) {
                attributes[attr.name] = attr.value;
            }
        }
        
        return attributes;
    }
    
    scanForms() {
        const formData = {};
        const forms = document.querySelectorAll('form');
        
        forms.forEach((form, formIndex) => {
            const formId = form.id || form.name || `form_${formIndex}`;
            formData[formId] = {};
            
            // Get all form elements
            const elements = form.elements;
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                
                // Skip buttons and fieldsets
                if (element.tagName === 'BUTTON' || element.tagName === 'FIELDSET') {
                    continue;
                }
                
                const name = element.name || element.id || `element_${i}`;
                
                // Handle different input types
                if (element.type === 'checkbox' || element.type === 'radio') {
                    if (element.checked) {
                        if (element.type === 'radio') {
                            formData[formId][name] = element.value;
                        } else {
                            // For checkboxes, create an array if multiple checkboxes have the same name
                            if (!formData[formId][name]) {
                                formData[formId][name] = [];
                            }
                            formData[formId][name].push(element.value);
                        }
                    }
                } else if (element.type === 'select-multiple') {
                    formData[formId][name] = Array.from(element.selectedOptions).map(option => option.value);
                } else {
                    formData[formId][name] = element.value;
                }
            }
        });
        
        return formData;
    }
    
    scanLocalStorage() {
        const storage = {};
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                try {
                    // Try to parse as JSON
                    storage[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    // Store as string if not valid JSON
                    storage[key] = localStorage.getItem(key);
                }
            }
        } catch (e) {
            console.error('Error accessing localStorage:', e);
        }
        
        return storage;
    }
    
    simplifyForJson(value, depth = 0, maxDepth = 3) {
        if (depth > maxDepth) {
            return '[Object]'; // Prevent deep recursion
        }
        
        if (value === null || value === undefined) {
            return value;
        }
        
        const type = typeof value;
        
        if (type === 'function') {
            return '[Function]';
        }
        
        if (type === 'symbol') {
            return value.toString();
        }
        
        if (type !== 'object') {
            return value;
        }
        
        if (value instanceof Date) {
            return value.toISOString();
        }
        
        if (value instanceof RegExp) {
            return value.toString();
        }
        
        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack
            };
        }
        
        if (Array.isArray(value)) {
            return value.map(item => this.simplifyForJson(item, depth + 1, maxDepth));
        }
        
        if (value instanceof Map) {
            const obj = {};
            value.forEach((val, key) => {
                obj[String(key)] = this.simplifyForJson(val, depth + 1, maxDepth);
            });
            return obj;
        }
        
        if (value instanceof Set) {
            return Array.from(value).map(item => this.simplifyForJson(item, depth + 1, maxDepth));
        }
        
        if (value instanceof Node) {
            return '[DOM Node]';
        }
        
        // Regular object
        const obj = {};
        for (const key in value) {
            try {
                obj[key] = this.simplifyForJson(value[key], depth + 1, maxDepth);
            } catch (e) {
                obj[key] = '[Cannot access property]';
            }
        }
        return obj;
    }
    
    displayResults() {
        if (!this.results) return;
        
        const jsonViewer = document.getElementById('ss-json-viewer');
        
        // Format and display the JSON
        const formatted = this.formatJson(this.results);
        jsonViewer.innerHTML = formatted;
        
        // Add event listeners to toggles
        document.querySelectorAll('.ss-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const content = this.nextElementSibling;
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    this.textContent = '▼';
                } else {
                    content.style.display = 'none';
                    this.textContent = '►';
                }
            });
        });
    }
    
    formatJson(obj, level = 0) {
        const indent = '  '.repeat(level);
        
        if (obj === null) {
            return `<span class="ss-json-null">null</span>`;
        }
        
        if (obj === undefined) {
            return `<span class="ss-json-null">undefined</span>`;
        }
        
        const type = typeof obj;
        
        if (type === 'boolean') {
            return `<span class="ss-json-boolean">${obj}</span>`;
        }
        
        if (type === 'number') {
            return `<span class="ss-json-number">${obj}</span>`;
        }
        
        if (type === 'string') {
            return `<span class="ss-json-string">"${this.escapeHtml(obj)}"</span>`;
        }
        
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return `<span class="ss-json-null">[]</span>`;
            }
            
            let html = `<span class="ss-toggle">▼</span> [<div style="padding-left: 20px; display: block;">`;
            
            obj.forEach((item, index) => {
                html += `${this.formatJson(item, level + 1)}${index < obj.length - 1 ? ',' : ''}<br>`;
            });
            
            html += `</div>${indent}]`;
            return html;
        }
        
        if (type === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) {
                return `<span class="ss-json-null">{}</span>`;
            }
            
            let html = `<span class="ss-toggle">▼</span> {<div style="padding-left: 20px; display: block;">`;
            
            keys.forEach((key, index) => {
                html += `<span class="ss-json-key">"${this.escapeHtml(key)}"</span>: ${this.formatJson(obj[key], level + 1)}${index < keys.length - 1 ? ',' : ''}<br>`;
            });
            
            html += `</div>${indent}}`;
            return html;
        }
        
        return `<span>${this.escapeHtml(String(obj))}</span>`;
    }
    
    toggleFormat() {
        if (!this.results) return;
        
        const jsonViewer = document.getElementById('ss-json-viewer');
        const isRaw = jsonViewer.querySelector('pre');
        
        if (isRaw) {
            // Switch to formatted view
            this.displayResults();
        } else {
            // Switch to raw JSON view
            const jsonString = JSON.stringify(this.results, null, 2);
            jsonViewer.innerHTML = `<pre>${this.escapeHtml(jsonString)}</pre>`;
        }
    }
    
    copyToClipboard() {
        if (!this.results) return;
        
        const jsonString = JSON.stringify(this.results, null, 2);
        
        // Create a temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        textarea.style.position = 'fixed';  // Avoid scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            const statusEl = document.getElementById('ss-status');
            
            if (successful) {
                statusEl.textContent = 'Copied to clipboard!';
                statusEl.style.color = 'green';
                
                // Reset status after 2 seconds
                setTimeout(() => {
                    statusEl.textContent = 'Results ready';
                    statusEl.style.color = '';
                }, 2000);
            } else {
                statusEl.textContent = 'Copy failed';
                statusEl.style.color = 'red';
            }
        } catch (err) {
            console.error('Error copying text: ', err);
        }
        
        document.body.removeChild(textarea);
    }
    
    // the state to a downloadable JSON file
    exportToFile() {
        if (!this.results) {
            this.showNotification('No data to export', true);
            return;
        }
        
        const jsonString = JSON.stringify(this.results, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        try {
            // Create a downloadable link
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = this.options.filename || 'page-state.json';
            
            // Add to document, click it, and remove
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(downloadLink.href);
                this.showNotification('File exported successfully');
            }, 100);
        } catch (error) {
            console.error('Error exporting file:', error);
            this.showNotification('Error exporting file: ' + error.message, true);
        }
    }
    
    // Handle file upload
    handleFileUpload(event) {
        const fileInput = event.target;
        const statusEl = document.getElementById('ss-file-info');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            statusEl.textContent = 'No file selected';
            return;
        }
        
        const file = fileInput.files[0];
        
        // Check if it's a JSON file
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            statusEl.textContent = 'Please select a JSON file';
            statusEl.style.color = 'red';
            return;
        }
        
        statusEl.textContent = `File selected: ${file.name}`;
        
        // Read the file
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonContent = e.target.result;
                const jsonData = JSON.parse(jsonContent);
                
                // Store the parsed data
                this.importedData = jsonData;
                
                // Update status
                statusEl.textContent = `File loaded: ${file.name} (${Object.keys(jsonData).length} sections)`;
                statusEl.style.color = 'green';
                
                // Enable restore button
                document.getElementById('ss-restore-btn').removeAttribute('disabled');
                
            } catch (error) {
                console.error('Error parsing JSON file:', error);
                statusEl.textContent = `Error: ${error.message}`;
                statusEl.style.color = 'red';
            }
        };
        
        reader.onerror = () => {
            statusEl.textContent = 'Error reading file';
            statusEl.style.color = 'red';
        };
        
        reader.readAsText(file);
    }
    
    // Parse imported JSON from textarea
    parseImportedJson() {
        const textarea = document.getElementById('ss-restore-json');
        const jsonStr = textarea.value.trim();
        const statusEl = document.getElementById('ss-restore-status');
        
        if (!jsonStr) {
            statusEl.textContent = 'Please enter JSON to parse';
            statusEl.style.color = 'red';
            return;
        }
        
        try {
            const jsonData = JSON.parse(jsonStr);
            
            // Store the parsed data
            this.importedData = jsonData;
            
            // Update status
            statusEl.textContent = `JSON parsed successfully (${Object.keys(jsonData).length} sections)`;
            statusEl.style.color = 'green';
            
            // Enable restore button
            document.getElementById('ss-restore-btn').removeAttribute('disabled');
            
        } catch (error) {
            console.error('Error parsing JSON:', error);
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.style.color = 'red';
        }
    }
    
    // Restore state from imported data
    restoreState() {
        if (!this.importedData) {
            this.showNotification('No data to restore', true);
            return;
        }
        
        const statusEl = document.getElementById('ss-restore-status');
        statusEl.textContent = 'Restoring state...';
        statusEl.style.color = this.options.primaryColor;
        
        // Get restore options
        const restoreGlobal = document.getElementById('ss-restore-global').checked;
        const restoreForms = document.getElementById('ss-restore-forms').checked;
        const restoreLocalStorage = document.getElementById('ss-restore-localstorage').checked;
        const restoreReact = this.reactMode && document.getElementById('ss-restore-react')?.checked;
        
        setTimeout(() => {
            try {
                let restoredItems = 0;
                
                // Restore global variables
                if (restoreGlobal && this.importedData.globalVariables) {
                    const restored = this.restoreGlobalVariables(this.importedData.globalVariables);
                    restoredItems += restored;
                }
                
                // Restore form values
                if (restoreForms && this.importedData.formData) {
                    const restored = this.restoreFormData(this.importedData.formData);
                    restoredItems += restored;
                }
                
                // Restore localStorage
                if (restoreLocalStorage && this.importedData.localStorage) {
                    const restored = this.restoreLocalStorage(this.importedData.localStorage);
                    restoredItems += restored;
                }
                
                // Attempt to update React state
                if (restoreReact && this.reactMode) {
                    this.attemptReactStateRestoration();
                }
                
                // Show success notification
                this.showNotification(`Restored ${restoredItems} items successfully`);
                
                // Update status
                statusEl.textContent = `Restored ${restoredItems} items successfully`;
                statusEl.style.color = 'green';
                
            } catch (error) {
                console.error('Error restoring state:', error);
                statusEl.textContent = `Error: ${error.message}`;
                statusEl.style.color = 'red';
                this.showNotification('Error restoring state: ' + error.message, true);
            }
        }, 500);
    }
    
    // Restore global variables
    restoreGlobalVariables(variables) {
        let count = 0;
        
        for (const key in variables) {
            if (key && key !== 'window' && key !== 'document') {
                try {
                    window[key] = variables[key];
                    count++;
                } catch (e) {
                    console.warn(`Could not restore global variable ${key}:`, e);
                }
            }
        }
        
        return count;
    }
    
    // Restore form data
    restoreFormData(formData) {
        let count = 0;
        
        for (const formId in formData) {
            // Find the form by ID or index
            let form = document.getElementById(formId);
            
            // If formId is like form_0, try to get by index
            if (!form && formId.startsWith('form_')) {
                const index = parseInt(formId.replace('form_', ''));
                const forms = document.getElementsByTagName('form');
                if (forms.length > index) {
                    form = forms[index];
                }
            }
            
            // If form found, restore its values
            if (form) {
                const values = formData[formId];
                
                for (const name in values) {
                    let elements = form.elements[name];
                    
                    // If not found by name, try by id
                    if (!elements) {
                        elements = document.getElementById(name);
                    }
                    
                    // Skip if element not found
                    if (!elements) continue;
                    
                    // Convert to array for consistent handling
                    if (!Array.isArray(elements)) {
                        elements = [elements];
                    }
                    
                    // Handle multiple elements (like radio buttons)
                    for (let i = 0; i < elements.length; i++) {
                        const element = elements[i];
                        
                        // Handle different input types
                        if (element.type === 'checkbox') {
                            const value = values[name];
                            if (Array.isArray(value)) {
                                element.checked = value.includes(element.value);
                            } else {
                                element.checked = !!value;
                            }
                            count++;
                        } else if (element.type === 'radio') {
                            element.checked = element.value === values[name];
                            if (element.checked) count++;
                        } else if (element.tagName === 'SELECT' && element.multiple) {
                            const options = element.options;
                            const selectedValues = Array.isArray(values[name]) ? values[name] : [values[name]];
                            
                            for (let j = 0; j < options.length; j++) {
                                options[j].selected = selectedValues.includes(options[j].value);
                            }
                            count++;
                        } else {
                            element.value = values[name];
                            count++;
                        }
                        
                        // Trigger change event
                        const event = new Event('change', { bubbles: true });
                        element.dispatchEvent(event);
                        
                        // For text inputs, also trigger input event
                        if (element.type === 'text' || element.type === 'textarea') {
                            const inputEvent = new Event('input', { bubbles: true });
                            element.dispatchEvent(inputEvent);
                        }
                    }
                }
            }
        }
        
        return count;
    }
    
    // Restore localStorage
    restoreLocalStorage(storageData) {
        let count = 0;
        
        try {
            for (const key in storageData) {
                const value = storageData[key];
                
                if (typeof value === 'string') {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
                count++;
            }
        } catch (e) {
            console.error('Error restoring localStorage:', e);
        }
        
        return count;
    }
    
    // Attempt to update React components' state
    attemptReactStateRestoration() {
        // This is a best-effort approach that won't work in all React apps
        // Add warning that the user may need to refresh the page
        const statusEl = document.getElementById('ss-restore-status');
        statusEl.textContent += ' (React state may require page refresh)';
        
        // If React DevTools extension is available, we could use that
        // Otherwise, we'll use a simple approach to trigger React updates
        const reactRoot = document.querySelector('[data-reactroot]');
        
        if (reactRoot) {
            try {
                // Try to find important form elements and trigger events
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    // Dispatch events on the form
                    const changeEvent = new Event('change', { bubbles: true });
                    form.dispatchEvent(changeEvent);
                    
                    // Trigger submit event but prevent actual submission
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                });
                
                // Find all inputs and trigger events
                const inputs = document.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    const changeEvent = new Event('change', { bubbles: true });
                    input.dispatchEvent(changeEvent);
                    
                    const blurEvent = new Event('blur', { bubbles: true });
                    input.dispatchEvent(blurEvent);
                    
                    if (input.type !== 'checkbox' && input.type !== 'radio') {
                        const inputEvent = new Event('input', { bubbles: true });
                        input.dispatchEvent(inputEvent);
                    }
                });
            } catch (e) {
                console.warn('Error triggering React updates:', e);
            }
        }
    }
    
    // Show a notification
    showNotification(message, isError = false) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.ss-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'ss-notification' + (isError ? ' error' : '');
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    addCustomVariables() {
        const textarea = document.getElementById('ss-custom-vars');
        const text = textarea.value.trim();
        const statusEl = document.getElementById('ss-status');
        
        if (!text) {
            statusEl.textContent = 'Please enter variable names or JSON';
            statusEl.style.color = 'red';
            return;
        }
        
        try {
            // Try to parse as JSON
            if (text.startsWith('{') || text.startsWith('[')) {
                const json = JSON.parse(text);
                this.results = json;
                this.displayResults();
                
                statusEl.textContent = 'JSON data imported!';
                statusEl.style.color = 'green';
                return;
            }
            
            // Otherwise, treat as a list of variable names
            const variableNames = text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            if (!this.results) {
                this.results = {};
            }
            
            if (!this.results.customVariables) {
                this.results.customVariables = {};
            }
            
            // Extract values from window object
            variableNames.forEach(name => {
                try {
                    this.results.customVariables[name] = this.simplifyForJson(window[name]);
                } catch (e) {
                    this.results.customVariables[name] = null;
                }
            });
            
            this.displayResults();
            
            statusEl.textContent = `Added ${variableNames.length} custom variables`;
            statusEl.style.color = 'green';
        } catch (e) {
            statusEl.textContent = `Error: ${e.message}`;
            statusEl.style.color = 'red';
        }
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

/**
 * Initialize the State Saver with options
 * @param {Object} options - Configuration options
 */
function initStateSaver(options = {}) {
    if (window.stateSaver) {
        // Already initialized
        return window.stateSaver;
    }
    
    // Create new instance
    window.stateSaver = new StateSaver(options);
    return window.stateSaver;
}

initStateSaver({
    position: 'bottom-right',
    primaryColor: '#5D5CDE',
    filename: 'webpage-state.json'
});
            
console.log('State Saver initialized successfully');