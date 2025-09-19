// Main Application File
import { firebaseConfig, appId } from './config.js';
import { elements } from './dom.js';
import { toast } from './toast.js';
import { loading } from './loading.js';
import { firebaseLoader } from './firebase-loader.js';
import { getBusinessAnalysis, getForecastSuggestion } from './api.js';
import { FormValidator, validationRules } from './validation.js';

class ValueInvestorApp {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.userId = null;
        this.isAuthenticated = false;
        this.unsubscribe = null;
        this.stockValidator = new FormValidator();
        this.loginValidator = new FormValidator();

        this.init();
    }

    async init() {
        try {
            await this.registerServiceWorker();
            await this.initializeFirebase();
            this.setupFormValidation();
            this.setupEventListeners();
            toast.success('Application loaded successfully');
        } catch (error) {
            console.error("App initialization failed:", error);
            toast.error('Failed to initialize application');
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', registration);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            toast.info('App update available. Refresh to update.', 0);
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async initializeFirebase() {
        try {
            const { initializeApp } = await firebaseLoader.loadFirebase();
            this.app = initializeApp(firebaseConfig);

            const { getAuth, onAuthStateChanged } = await firebaseLoader.requireAuth();
            const { getFirestore } = await firebaseLoader.requireFirestore();

            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);

            onAuthStateChanged(this.auth, (user) => {
                if (user && !user.isAnonymous) {
                    this.userId = user.uid;
                    this.isAuthenticated = true;
                    this.updateAuthStateUI(user.email);
                    this.listenToStocks();
                } else {
                    this.userId = null;
                    this.isAuthenticated = false;
                    this.updateAuthStateUI(null);
                    elements.stockListDiv.innerHTML = '<p class="text-center text-gray-400">Log in to view your watchlist.</p>';
                    elements.loader.style.display = 'none';
                    if (this.unsubscribe) this.unsubscribe();
                }
            });
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            throw error;
        }
    }

    setupFormValidation() {
        // Add validation rules to stock form fields
        this.stockValidator.addField(elements.tickerInput, [
            validationRules.required(),
            validationRules.ticker()
        ]);

        this.stockValidator.addField(elements.sharesInput, [
            validationRules.required(),
            validationRules.positiveNumber('Please enter a positive number for shares outstanding')
        ]);

        this.stockValidator.addField(elements.currentProfitInput, [
            validationRules.required(),
            validationRules.positiveNumber('Please enter a positive number for current profit')
        ]);

        this.stockValidator.addField(elements.futureProfitInput, [
            validationRules.required(),
            validationRules.positiveNumber('Please enter a positive number for future profit')
        ]);

        this.stockValidator.addField(elements.reasonablePEInput, [
            validationRules.required(),
            validationRules.positiveInteger('Please enter a positive whole number for P/E ratio')
        ]);

        this.stockValidator.addField(elements.overvaluedPEInput, [
            validationRules.required(),
            validationRules.positiveInteger('Please enter a positive whole number for P/E ratio')
        ]);

        // Login form validation (separate validator)
        this.loginValidator.addField(elements.emailInput, [
            validationRules.required(),
            validationRules.email()
        ]);

        this.loginValidator.addField(elements.passwordInput, [
            validationRules.required(),
            validationRules.minLength(6, 'Password must be at least 6 characters')
        ]);
    }

    setupEventListeners() {
        // Auth event listeners
        elements.loginBtn.addEventListener('click', () => {
            elements.loginModal.style.display = 'block';
        });

        elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        elements.closeModalBtn.addEventListener('click', () => {
            elements.loginModal.style.display = 'none';
        });

        elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        window.addEventListener('click', (event) => {
            if (event.target === elements.loginModal) {
                elements.loginModal.style.display = "none";
            }
        });

        // Stock form event listeners
        elements.stockForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        elements.calculateBtn.addEventListener('click', () => {
            if (this.stockValidator.validateAll()) {
                const stockData = this.getFormData();
                this.calculateValuation(stockData);
            } else {
                toast.warning('Please fix the form errors before calculating');
            }
        });

        elements.clearFormBtn.addEventListener('click', () => this.clearForm());

        // AI feature event listeners
        elements.analyzeBtn.addEventListener('click', () => {
            if (!elements.tickerInput.value.trim()) {
                toast.warning('Please enter a ticker symbol first');
                elements.tickerInput.focus();
                return;
            }

            if (!this.isAuthenticated) {
                elements.loginModal.style.display = 'block';
                toast.info('Please log in to use AI features');
                return;
            }

            getBusinessAnalysis(elements.tickerInput.value.toUpperCase(), elements.aiAnalysisOutput);
        });

        elements.suggestForecastBtn.addEventListener('click', () => {
            if (!elements.tickerInput.value.trim()) {
                toast.warning('Please enter a ticker symbol first');
                elements.tickerInput.focus();
                return;
            }

            if (!this.isAuthenticated) {
                elements.loginModal.style.display = 'block';
                toast.info('Please log in to use AI features');
                return;
            }

            getForecastSuggestion(
                elements.tickerInput.value.toUpperCase(),
                elements.currentProfitInput,
                elements.futureProfitInput,
                elements.suggestForecastBtn
            );
        });

        // Watchlist event listeners
        elements.stockListDiv.addEventListener('click', (e) => this.handleStockListClick(e));
    }

    updateAuthStateUI(email) {
        if (email) {
            elements.userStatus.textContent = email;
            elements.loginBtn.classList.add('hidden');
            elements.logoutBtn.classList.remove('hidden');
            elements.loginModal.style.display = 'none';
            elements.aiAnalysisOutput.innerHTML = '<p class="text-center text-gray-400">Enter a ticker and click "Analyze".</p>';
        } else {
            elements.userStatus.textContent = 'Public';
            elements.loginBtn.classList.remove('hidden');
            elements.logoutBtn.classList.add('hidden');
            elements.aiAnalysisOutput.innerHTML = '<p class="text-center text-gray-400">Log in to use the AI-powered business quality overview.</p>';
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        if (!this.loginValidator.validateAll()) {
            toast.warning('Please fix the form errors');
            return;
        }

        const email = elements.emailInput.value;
        const password = elements.passwordInput.value;
        elements.loginError.textContent = '';

        const loadingId = loading.showButton(elements.loginForm.querySelector('button'), 'Logging in...');

        try {
            const { signInWithEmailAndPassword } = await firebaseLoader.requireAuth();
            await signInWithEmailAndPassword(this.auth, email, password);
            toast.success('Logged in successfully');
        } catch (error) {
            console.error("Login failed:", error);
            elements.loginError.textContent = "Login failed. Please check your credentials.";
            toast.error('Login failed');
        } finally {
            loading.hideButton(loadingId);
        }
    }

    async handleLogout() {
        try {
            const { signOut } = await firebaseLoader.requireAuth();
            await signOut(this.auth);
            toast.success('Logged out successfully');
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error('Logout failed');
        }
    }

    async listenToStocks() {
        if (this.unsubscribe) this.unsubscribe();
        if (!this.userId) return;

        elements.loader.style.display = 'block';

        try {
            const { collection, query, onSnapshot } = await firebaseLoader.requireFirestore();
            const stocksCollection = collection(this.db, `artifacts/${appId}/users/${this.userId}/stocks`);
            const q = query(stocksCollection);

            this.unsubscribe = onSnapshot(q, (querySnapshot) => {
                elements.loader.style.display = 'none';
                const stocks = [];
                querySnapshot.forEach((doc) => {
                    stocks.push({ id: doc.id, ...doc.data() });
                });
                this.renderStockList(stocks);
            }, (error) => {
                console.error("Error listening to stocks:", error);
                elements.stockListDiv.innerHTML = `<p class="text-red-500">Could not load watchlist.</p>`;
                toast.error('Failed to load watchlist');
            });
        } catch (error) {
            console.error("Error setting up stock listener:", error);
            toast.error('Failed to setup watchlist listener');
        }
    }

    renderStockList(stocks) {
        elements.stockListDiv.innerHTML = '';

        if (stocks.length === 0) {
            elements.stockListDiv.innerHTML = '<p class="text-center text-gray-400">Your watchlist is empty. Add a stock to begin.</p>';
            return;
        }

        stocks.forEach(stock => {
            const valuation = this.calculateValuation(stock, false);
            const stockCard = document.createElement('div');
            stockCard.className = 'card p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4';
            stockCard.innerHTML = `
                <div class="flex-grow cursor-pointer" data-stock-id="${stock.id}">
                    <h3 class="text-lg font-bold text-white">${stock.ticker}</h3>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-1">
                        <span>Buy at: <strong class="text-green-400">$${valuation.idealBuyPrice.toFixed(2)}</strong></span>
                        <span>Sell at: <strong class="text-red-400">$${valuation.obviousSellPrice.toFixed(2)}</strong></span>
                    </div>
                </div>
                <div class="flex space-x-2 flex-shrink-0">
                    <button class="btn-secondary px-3 py-1 text-sm rounded edit-btn" data-stock-id="${stock.id}">Edit</button>
                    <button class="btn-danger px-3 py-1 text-sm rounded delete-btn" data-stock-id="${stock.id}">Delete</button>
                </div>
            `;
            elements.stockListDiv.appendChild(stockCard);
        });
    }

    calculateValuation(stockData, display = true) {
        const { shares, currentProfit, futureProfit, reasonablePE, overvaluedPE } = stockData;

        const reasonableValuationY3 = futureProfit * reasonablePE;
        const idealBuyPointTotal = reasonableValuationY3 * 0.5;
        const idealBuyPrice = idealBuyPointTotal / shares;

        // New Obvious Sell Point calculation: minimum of two options
        const sellOption1 = currentProfit * overvaluedPE; // Current Year's Net Profit × Overvalued P/E
        const sellOption2 = futureProfit * 150; // 3-Year Future Net Profit × 150
        const obviousSellPointTotal = Math.min(sellOption1, sellOption2);
        const obviousSellPrice = obviousSellPointTotal / shares;

        const result = {
            idealBuyPrice,
            obviousSellPrice,
            sellOption1: sellOption1 / shares,
            sellOption2: sellOption2 / shares,
            usedOption: sellOption1 <= sellOption2 ? 'Current P/E Method' : 'Future Growth Method'
        };

        if (display) {
            elements.resultOutput.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="result-box buy-zone">
                        <h4 class="text-lg font-semibold">Ideal Buy Price</h4>
                        <p class="text-3xl font-bold">$${idealBuyPrice.toFixed(2)}</p>
                        <p class="text-xs text-gray-400">per share</p>
                    </div>
                    <div class="result-box sell-zone">
                        <h4 class="text-lg font-semibold">Obvious Sell Price</h4>
                        <p class="text-3xl font-bold">$${obviousSellPrice.toFixed(2)}</p>
                        <p class="text-xs text-gray-400">per share</p>
                        <p class="text-xs text-blue-300 mt-1">Method: ${result.usedOption}</p>
                    </div>
                </div>
                <div class="mt-4 p-3 bg-gray-800 rounded text-sm">
                    <h5 class="text-blue-400 font-semibold mb-2">Sell Price Calculation Details:</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="text-gray-400">Option 1 (Current P/E):</span>
                            <span class="text-white ml-2">$${result.sellOption1.toFixed(2)}</span>
                        </div>
                        <div>
                            <span class="text-gray-400">Option 2 (Future Growth):</span>
                            <span class="text-white ml-2">$${result.sellOption2.toFixed(2)}</span>
                        </div>
                    </div>
                    <p class="text-gray-400 mt-2">Using the lower value for conservative exit timing.</p>
                </div>
            `;
        }

        return result;
    }

    getFormData() {
        return {
            ticker: elements.tickerInput.value.toUpperCase(),
            shares: parseFloat(elements.sharesInput.value),
            currentProfit: parseFloat(elements.currentProfitInput.value),
            futureProfit: parseFloat(elements.futureProfitInput.value),
            reasonablePE: parseInt(elements.reasonablePEInput.value),
            overvaluedPE: parseInt(elements.overvaluedPEInput.value)
        };
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        if (!this.isAuthenticated) {
            elements.loginModal.style.display = 'block';
            toast.info('Please log in to manage your watchlist');
            return;
        }

        if (!this.stockValidator.validateAll()) {
            toast.warning('Please fix the form errors before saving');
            return;
        }

        const stockData = this.getFormData();
        const stockId = elements.stockIdInput.value;

        const loadingId = loading.showButton(elements.stockForm.querySelector('button[type="submit"]'), 'Saving...');

        try {
            const { doc, setDoc, serverTimestamp } = await firebaseLoader.requireFirestore();
            const stockRef = doc(this.db, `artifacts/${appId}/users/${this.userId}/stocks`, stockId || Date.now().toString());

            if (stockId) {
                await setDoc(stockRef, stockData, { merge: true });
                toast.success('Stock updated successfully');
            } else {
                stockData.createdAt = serverTimestamp();
                await setDoc(stockRef, stockData);
                toast.success('Stock added to watchlist');
            }

            this.clearForm();
            this.calculateValuation(stockData);
        } catch (error) {
            console.error("Error saving stock:", error);
            toast.error('Failed to save stock');
        } finally {
            loading.hideButton(loadingId);
        }
    }

    async handleStockListClick(e) {
        const stockId = e.target.closest('[data-stock-id]')?.dataset.stockId;
        if (!stockId) return;

        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this stock?')) {
                try {
                    const { doc, deleteDoc } = await firebaseLoader.requireFirestore();
                    await deleteDoc(doc(this.db, `artifacts/${appId}/users/${this.userId}/stocks`, stockId));
                    toast.success('Stock removed from watchlist');
                } catch (error) {
                    console.error("Error deleting stock:", error);
                    toast.error('Failed to delete stock');
                }
            }
        } else if (e.target.classList.contains('edit-btn') || e.target.closest('.flex-grow')) {
            try {
                const { doc, getDoc } = await firebaseLoader.requireFirestore();
                const docRef = doc(this.db, `artifacts/${appId}/users/${this.userId}/stocks`, stockId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const stockData = { id: docSnap.id, ...docSnap.data() };
                    this.populateFormForEdit(stockData);
                    this.calculateValuation(stockData);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error("Error loading stock for edit:", error);
                toast.error('Failed to load stock data');
            }
        }
    }

    populateFormForEdit(stock) {
        elements.stockIdInput.value = stock.id;
        elements.tickerInput.value = stock.ticker;
        elements.sharesInput.value = stock.shares;
        elements.currentProfitInput.value = stock.currentProfit;
        elements.futureProfitInput.value = stock.futureProfit;
        elements.reasonablePEInput.value = stock.reasonablePE;
        elements.overvaluedPEInput.value = stock.overvaluedPE;
    }

    clearForm() {
        elements.stockForm.reset();
        elements.stockIdInput.value = '';
        elements.reasonablePEInput.value = 25;
        elements.overvaluedPEInput.value = 50;

        // Clear validation errors
        this.stockValidator.errors.clear();
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500', 'focus:border-red-500');
            el.classList.add('border-gray-600', 'focus:border-blue-500');
        });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ValueInvestorApp();
});