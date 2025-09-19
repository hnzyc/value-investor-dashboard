// Loading State Manager
class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }

    show(element, message = 'Loading...') {
        if (!element) return;

        const loadingId = this.generateId();

        // Store original content
        const originalContent = element.innerHTML;
        this.loadingStates.set(loadingId, { element, originalContent });

        // Create loading HTML
        const loadingHTML = `
            <div class="flex items-center justify-center space-x-2 py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span class="text-gray-400">${message}</span>
            </div>
        `;

        element.innerHTML = loadingHTML;
        return loadingId;
    }

    hide(loadingId) {
        const state = this.loadingStates.get(loadingId);
        if (state) {
            state.element.innerHTML = state.originalContent;
            this.loadingStates.delete(loadingId);
        }
    }

    showButton(button, message = 'Loading...') {
        if (!button) return;

        const loadingId = this.generateId();
        const originalContent = button.innerHTML;
        const originalDisabled = button.disabled;

        this.loadingStates.set(loadingId, {
            element: button,
            originalContent,
            originalDisabled
        });

        button.disabled = true;
        button.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>${message}</span>
            </div>
        `;

        return loadingId;
    }

    hideButton(loadingId) {
        const state = this.loadingStates.get(loadingId);
        if (state) {
            state.element.innerHTML = state.originalContent;
            state.element.disabled = state.originalDisabled || false;
            this.loadingStates.delete(loadingId);
        }
    }

    generateId() {
        return `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export const loading = new LoadingManager();