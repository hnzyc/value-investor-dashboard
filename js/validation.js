// Form Validation Module
class FormValidator {
    constructor() {
        this.validators = new Map();
        this.errors = new Map();
    }

    addField(fieldElement, rules) {
        const fieldName = fieldElement.id || fieldElement.name;
        this.validators.set(fieldName, { element: fieldElement, rules });

        // Add real-time validation
        fieldElement.addEventListener('blur', () => this.validateField(fieldName));
        fieldElement.addEventListener('input', () => {
            // Clear error on input
            this.clearFieldError(fieldName);
            // Debounced validation
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.validateField(fieldName), 500);
        });
    }

    validateField(fieldName) {
        const validator = this.validators.get(fieldName);
        if (!validator) return true;

        const { element, rules } = validator;
        const value = element.value.trim();

        for (const rule of rules) {
            if (!rule.validate(value)) {
                this.setFieldError(fieldName, rule.message);
                return false;
            }
        }

        this.clearFieldError(fieldName);
        return true;
    }

    validateAll() {
        let isValid = true;
        for (const fieldName of this.validators.keys()) {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
        }
        return isValid;
    }

    setFieldError(fieldName, message) {
        const validator = this.validators.get(fieldName);
        if (!validator) return;

        this.errors.set(fieldName, message);
        const element = validator.element;

        // Add error styling
        element.classList.add('border-red-500', 'focus:border-red-500');
        element.classList.remove('border-gray-600', 'focus:border-blue-500');

        // Create or update error message
        let errorElement = element.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('p');
            errorElement.className = 'error-message text-red-500 text-xs mt-1';
            element.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    clearFieldError(fieldName) {
        const validator = this.validators.get(fieldName);
        if (!validator) return;

        this.errors.delete(fieldName);
        const element = validator.element;

        // Remove error styling
        element.classList.remove('border-red-500', 'focus:border-red-500');
        element.classList.add('border-gray-600', 'focus:border-blue-500');

        // Remove error message
        const errorElement = element.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    hasErrors() {
        return this.errors.size > 0;
    }
}

// Common validation rules
export const validationRules = {
    required: (message = 'This field is required') => ({
        validate: (value) => value.length > 0,
        message
    }),

    ticker: (message = 'Please enter a valid ticker symbol (1-5 letters)') => ({
        validate: (value) => /^[A-Z]{1,5}$/.test(value.toUpperCase()),
        message
    }),

    positiveNumber: (message = 'Please enter a positive number') => ({
        validate: (value) => !isNaN(value) && parseFloat(value) > 0,
        message
    }),

    positiveInteger: (message = 'Please enter a positive whole number') => ({
        validate: (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) == parseFloat(value),
        message
    }),

    email: (message = 'Please enter a valid email address') => ({
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message
    }),

    minLength: (min, message) => ({
        validate: (value) => value.length >= min,
        message: message || `Must be at least ${min} characters`
    })
};

export { FormValidator };