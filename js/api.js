import { toast } from './toast.js';
import { loading } from './loading.js';
import { requestManager } from './request-manager.js';

// Enhanced API calls with caching and rate limiting
export async function callGeminiAPI(systemPrompt, userQuery, type = 'analysis') {
    const cacheKey = requestManager.generateCacheKey('gemini', { systemPrompt, userQuery });
    const rateLimitKey = `gemini_${type}`;

    // Check rate limit
    if (!requestManager.canMakeRequest(rateLimitKey, 10, 60000)) { // 10 requests per minute
        toast.warning('Rate limit reached. Please wait before making another request.');
        throw new Error('Rate limit exceeded');
    }

    return requestManager.makeRequest(cacheKey, async () => {
        const proxyUrl = '/.netlify/functions/gemini-proxy';

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userQuery, cacheType: type })
        });

        if (!response.ok) {
            throw new Error(`Proxy call failed with status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.text) {
            throw new Error('Invalid response from API');
        }

        return result.text;
    });
}

export async function getBusinessAnalysis(ticker, analysisOutput) {
    const cacheKey = requestManager.generateCacheKey('business_analysis', ticker);

    // Check cache first
    const cached = requestManager.getCached(cacheKey, 600000); // 10 minutes cache
    if (cached) {
        let htmlAnalysis = cached.replace(/#### (.*?)\n/g, '<h4>$1</h4>').replace(/\n/g, '<br>');
        analysisOutput.innerHTML = `<div class="ai-analysis-content">${htmlAnalysis}</div>`;
        toast.info('Loaded from cache');
        return;
    }

    const loadingId = loading.show(analysisOutput, 'Analyzing business quality...');

    try {
        const systemPrompt = `You are a world-class value investor and business analyst. Provide a comprehensive business quality analysis focusing on competitive advantages, financial health, management quality, and growth prospects. Format your response with clear sections using #### headers.`;
        const userQuery = `Provide a business quality analysis for the stock ticker: ${ticker}`;

        const analysis = await callGeminiAPI(systemPrompt, userQuery, 'analysis');

        let htmlAnalysis = analysis.replace(/#### (.*?)\n/g, '<h4>$1</h4>').replace(/\n/g, '<br>');
        analysisOutput.innerHTML = `<div class="ai-analysis-content">${htmlAnalysis}</div>`;

        toast.success('Analysis completed successfully');
    } catch (error) {
        console.error("Failed to get business analysis:", error);
        analysisOutput.innerHTML = '<p class="text-red-500">Failed to fetch analysis. Please try again later.</p>';

        if (error.message.includes('Rate limit')) {
            toast.warning('Too many requests. Please wait a moment.');
        } else {
            toast.error('Failed to fetch analysis');
        }
    } finally {
        loading.hide(loadingId);
    }
}

export async function getForecastSuggestion(ticker, currentProfitInput, futureProfitInput, suggestForecastBtn) {
    const cacheKey = requestManager.generateCacheKey('forecast', ticker);

    // Check cache first
    const cached = requestManager.getCached(cacheKey, 3600000); // 1 hour cache
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed.currentProfit && parsed.futureProfit) {
                currentProfitInput.value = parsed.currentProfit;
                futureProfitInput.value = parsed.futureProfit;
                toast.info('Forecast loaded from cache');
                return;
            }
        } catch (error) {
            // Continue with fresh request if cache is invalid
        }
    }

    const loadingId = loading.showButton(suggestForecastBtn, 'Getting forecast...');

    try {
        const systemPrompt = `You are a conservative financial analyst. Provide realistic profit forecasts based on historical data and industry trends. Return ONLY a JSON object with currentProfit and futureProfit values in billions (numbers only, no currency symbols). Example: {"currentProfit": 101.2, "futureProfit": 125.8}`;
        const userQuery = `Provide profit forecasts for the stock ticker: ${ticker}`;

        const suggestion = await callGeminiAPI(systemPrompt, userQuery, 'forecast');

        const parsed = JSON.parse(suggestion);
        if (parsed.currentProfit && parsed.futureProfit) {
            currentProfitInput.value = parsed.currentProfit;
            futureProfitInput.value = parsed.futureProfit;
            toast.success('Forecast suggestion applied');
        } else {
            throw new Error("Missing required properties in response");
        }
    } catch (error) {
        console.error("Failed to get forecast suggestion:", error);

        if (error.message.includes('Rate limit')) {
            toast.warning('Too many requests. Please wait a moment.');
        } else {
            toast.error('Failed to get forecast suggestion');
        }
    } finally {
        loading.hideButton(loadingId);
    }
}