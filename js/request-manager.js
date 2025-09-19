// Request Cache and Rate Limiting
class RequestManager {
    constructor() {
        this.cache = new Map();
        this.rateLimiter = new Map();
        this.pendingRequests = new Map();
    }

    // Cache management
    getCached(key, maxAge = 300000) { // 5 minutes default
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < maxAge) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Cleanup old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    // Rate limiting
    canMakeRequest(key, limit = 5, window = 60000) { // 5 requests per minute default
        const now = Date.now();
        const requests = this.rateLimiter.get(key) || [];

        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < window);

        if (validRequests.length >= limit) {
            return false;
        }

        validRequests.push(now);
        this.rateLimiter.set(key, validRequests);
        return true;
    }

    // Request deduplication
    async makeRequest(key, requestFn) {
        // Check cache first
        const cached = this.getCached(key);
        if (cached) {
            return cached;
        }

        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Make new request
        const requestPromise = requestFn().then(result => {
            this.setCache(key, result);
            this.pendingRequests.delete(key);
            return result;
        }).catch(error => {
            this.pendingRequests.delete(key);
            throw error;
        });

        this.pendingRequests.set(key, requestPromise);
        return requestPromise;
    }

    // Generate cache key for API requests
    generateCacheKey(type, params) {
        const paramString = typeof params === 'object'
            ? JSON.stringify(params, Object.keys(params).sort())
            : String(params);
        return `${type}_${paramString}`;
    }
}

export const requestManager = new RequestManager();