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

    // Initialize Redis
    // Note: specific to Vercel/Serverless, we should create client inside handler or manage connection reuse carefully.
    // ioredis manages connections well, but for serverless creating a new one per request or using a global specific pattern is common.
    // For simplicity and robustness here (low traffic), a new connection is safe, but we'll try to quit it to avoid hanging.
    const redis = new Redis(process.env.REDIS_URL);

    try {
        if (req.method === 'GET') {
            const data = await redis.get('highscores');
            const highscores = data ? JSON.parse(data) : [];

            await redis.quit(); // Close connection
            return res.status(200).json(highscores);
        }

        if (req.method === 'POST') {
            const newScore = req.body;

            // Fetch existing
            const raw = await redis.get('highscores');
            let highscores = raw ? JSON.parse(raw) : [];

            // Add & Sort
            highscores.push(newScore);
            highscores.sort((a, b) => b.score - a.score);
            highscores = highscores.slice(0, 10);

            // Save
            await redis.set('highscores', JSON.stringify(highscores));

            await redis.quit(); // Close connection
            return res.status(200).json(highscores);
        }

        await redis.quit();
        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (err) {
        console.error("Redis Error:", err);
        redis.disconnect(); // Force disconnect on error
        return res.status(500).json({ error: "Database Error: " + err.message });
    }
}
