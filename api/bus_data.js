import Redis from 'ioredis';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Check Config
    if (!process.env.REDIS_URL) {
        console.error("Missing REDIS_URL env var");
        return res.status(500).json({ error: "Configuration Error: Missing REDIS_URL" });
    }

    const redis = new Redis(process.env.REDIS_URL);
    const mapId = (req.method === 'GET' ? req.query.mapId : req.body.mapId) || 'default';
    const safeMapId = mapId.replace(/[^a-z0-9_-]/gi, '_'); // Sanitize
    const CACHE_KEY = `bus_data_cache_${safeMapId}`;
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Hours

    try {
        if (req.method === 'GET') {
            const raw = await redis.get(CACHE_KEY);
            await redis.quit();

            if (!raw) {
                return res.status(404).json({ error: "No cache found" });
            }

            const cached = JSON.parse(raw);
            const age = Date.now() - cached.timestamp;

            if (age > MAX_AGE_MS) {
                return res.status(404).json({ error: "Cache expired" });
            }

            return res.status(200).json(cached.data);
        }

        if (req.method === 'POST') {
            const newData = req.body.data; // Expects raw overpass data wrapped in { data: ... }
            if (!newData) {
                await redis.quit();
                return res.status(400).json({ error: "No data provided" });
            }

            const cacheEntry = {
                timestamp: Date.now(),
                data: newData
            };

            await redis.set(CACHE_KEY, JSON.stringify(cacheEntry));
            await redis.quit();

            return res.status(200).json({ success: true, timestamp: cacheEntry.timestamp, mapId: safeMapId });
        }

        await redis.quit();
        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (err) {
        console.error("Redis Error:", err);
        redis.disconnect();
        return res.status(500).json({ error: "Database Error: " + err.message });
    }
}
