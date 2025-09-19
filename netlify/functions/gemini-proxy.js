// Enhanced Gemini Proxy with Caching and Rate Limiting
const cache = new Map();
const rateLimits = new Map();

// Cache TTL in milliseconds
const CACHE_TTL = {
    analysis: 10 * 60 * 1000,    // 10 minutes for business analysis
    forecast: 60 * 60 * 1000,    // 1 hour for forecasts
    default: 5 * 60 * 1000       // 5 minutes default
};

// Rate limiting configuration
const RATE_LIMIT = {
    windowMs: 60 * 1000,  // 1 minute window
    maxRequests: 20       // 20 requests per minute per IP
};

exports.handler = async function(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';

    try {
        // Rate limiting check
        if (!checkRateLimit(clientIP)) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' })
            };
        }

        const { systemPrompt, userQuery, cacheType = 'default' } = JSON.parse(event.body);

        if (!systemPrompt || !userQuery) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: systemPrompt and userQuery' })
            };
        }

        // Generate cache key
        const cacheKey = generateCacheKey(systemPrompt, userQuery);

        // Check cache
        const cached = getFromCache(cacheKey, cacheType);
        if (cached) {
            return {
                statusCode: 200,
                headers: { ...headers, 'X-Cache': 'HIT' },
                body: JSON.stringify({ text: cached })
            };
        }

        // Retrieve the secret API key from Netlify's environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("API key is not set in environment variables.");
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google API Error:", errorData);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: "Failed to fetch from Gemini API." })
            };
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Invalid response structure from Gemini API." })
            };
        }

        // Cache the response
        setCache(cacheKey, text, cacheType);

        return {
            statusCode: 200,
            headers: { ...headers, 'X-Cache': 'MISS' },
            body: JSON.stringify({ text: text })
        };

    } catch (error) {
        console.error("Proxy function error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function checkRateLimit(clientIP) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.windowMs;

    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, []);
    }

    const requests = rateLimits.get(clientIP);

    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);

    if (validRequests.length >= RATE_LIMIT.maxRequests) {
        return false;
    }

    validRequests.push(now);
    rateLimits.set(clientIP, validRequests);

    return true;
}

function generateCacheKey(systemPrompt, userQuery) {
    const combined = systemPrompt + userQuery;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

function getFromCache(key, cacheType) {
    const cached = cache.get(key);
    if (!cached) return null;

    const ttl = CACHE_TTL[cacheType] || CACHE_TTL.default;
    const isExpired = Date.now() - cached.timestamp > ttl;

    if (isExpired) {
        cache.delete(key);
        return null;
    }

    return cached.data;
}

function setCache(key, data, cacheType) {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        type: cacheType
    });

    // Cleanup old cache entries if cache gets too large
    if (cache.size > 1000) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
    }
}
