
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

const CACHE_KEY = 'bus_data_cache';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // Rate limiting (429) or Server Error (5xx) -> Retry
            if (response.status === 429 || response.status >= 500) {
                throw new Error(`Retriable Error: ${response.status}`);
            }
            // Client Error (4xx) -> Fail immediately
            throw new Error(`Overpass API Error: ${response.status} ${response.statusText}`);
        }
        return response;
    } catch (err) {
        if (retries > 0) {
            console.warn(`Fetch failed (${err.message}). Retrying in ${backoff}ms... (${retries} left)`);
            await wait(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
};

export const updateLocalBusData = async (bbox = "49.38,7.68,49.48,7.85", regex = "^(101|102|103|104)$") => {
    // Dynamic query based on config
    const query = `
    [out:json][timeout:25];
    (
      relation["route"="bus"]["ref"~"${regex}"](${bbox});
    );
    out body;
    >;
    out body qt;
  `;


    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s

    try {
        console.log("Fetching from Overpass API...");
        const response = await fetchWithRetry(OVERPASS_API_URL, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            // Should be caught by fetchWithRetry but double check
            throw new Error(`Overpass API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Overpass Data Fetched:", data);

        // Save to LocalStorage
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            console.log("Data saved to LocalStorage cache.");
        } catch (storageError) {
            console.warn("Failed to save to localStorage (quota exceeded?)", storageError);
        }

        // Save to Database Cache (via API)
        try {
            await fetch('/api/bus_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            console.log("Data saved to database cache via API.");
        } catch (apiError) {
            console.warn("Failed to save to database cache", apiError);
        }

        return data;
    } catch (error) {
        console.error("Update failed:", error);
        throw error;
    }
};

export const fetchBusRoute = async (bbox, regex) => {
    // 0. Try Database Cache (API)
    try {
        const response = await fetch('/api/bus_data');
        if (response.ok) {
            const data = await response.json();
            console.log("Loaded bus data from DB Cache.");
            return data;
        }
    } catch (e) {
        console.warn("Database cache fetch failed", e);
    }

    // 1. Try LocalStorage
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            console.log("Loaded bus data from LocalStorage.");
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn("Error reading from localStorage", e);
    }

    // 2. Try Local File (bus_data.json)
    try {
        console.log("No cache found. Trying local file /bus_data.json...");
        const response = await fetch('/bus_data.json');
        if (!response.ok) throw new Error("Local file load failed");
        const data = await response.json();
        console.log("Loaded from bus_data.json");
        return data;
    } catch (fallbackError) {
        console.warn("Local file failed, attempting API fetch...", fallbackError);
        // 3. Fallback to API
        return updateLocalBusData(bbox, regex);
    }
};
