
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export const fetchBusRoute = async () => {
    // Focused query for Kaiserslautern Line 101 AND 102
    // Bbox: 49.38, 7.68, 49.48, 7.85
    // Regex: ^(101|102)$

    // Note: We might get multiple relations for the same line (directions).
    // The parser should handle this.

    const query = `
    [out:json][timeout:25];
    (
      relation["route"="bus"]["ref"~"^(101|102)$"](49.38,7.68,49.48,7.85);
    );
    out body;
    >;
    out skel qt;
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
        if (error.name === 'AbortError') {
            throw new Error("Request timed out (Overpass API took too long).");
        }
        console.error("Failed to fetch bus routes:", error);
        throw error;
    }
};
