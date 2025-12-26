import Redis from 'ioredis';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check Config
    if (!process.env.REDIS_URL) {
        console.error("Missing REDIS_URL env var");
        return res.status(500).json({ error: "Configuration Error: Missing REDIS_URL" });
    }

    const redis = new Redis(process.env.REDIS_URL);

    // Get mapId from query
    const mapId = req.query.mapId || 'default';
    const safeMapId = mapId.replace(/[^a-z0-9_-]/gi, '_');
    const CACHE_KEY = `bus_data_cache_${safeMapId}`;

    try {
        const raw = await redis.get(CACHE_KEY);
        await redis.quit();

        if (!raw) {
            return res.status(404).json({ error: "No cache found" });
        }

        const cached = JSON.parse(raw);

        // Calculate size in bytes (UTF-8 approximation)
        const sizeBytes = new TextEncoder().encode(raw).length;
        const sizeFormatted = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';

        // Create a preview
        let preview = "Invalid Data";
        if (cached.data) {
            preview = JSON.stringify(cached.data).substring(0, 500) + "...";
        }

        return res.status(200).json({
            timestamp: cached.timestamp,
            dataSize: sizeBytes,
            sizeFormatted: sizeFormatted,
            dataPreview: preview
        });

    } catch (err) {
        console.error("Redis Error:", err);
        redis.disconnect();
        return res.status(500).json({ error: "Database Error: " + err.message });
    }
}
