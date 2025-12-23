
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export const fetchBusRoute = async (bbox = "49.38,7.68,49.48,7.85", regex = "^(101|102|103|104)$") => {
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
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
        const response = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Overpass API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Overpass Raw Data (101, 102):", data);
        return data;
    } catch (error) {
        // Fallback to local data
        console.warn("Overpass API failed (" + error.message + "). Trying local backup...");

        try {
            const fallbackResponse = await fetch('/bus_data.json');
            if (!fallbackResponse.ok) {
                throw new Error("Local fallback failed");
            }
            const fallbackData = await fallbackResponse.json();
            console.log("Loaded cached data:", fallbackData);
            return fallbackData;
        } catch (fallbackError) {
            console.error("Critical: Both API and Fallback failed.", fallbackError);
            throw error; // Throw original API error if even fallback fails
        }
    }
};
