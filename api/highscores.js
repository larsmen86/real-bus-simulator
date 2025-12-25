import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // CORS handling for consistency (though usually same-origin on Vercel)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust strictness if needed
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
                console.error("Missing ENV Vars: KV_REST_API_URL or KV_REST_API_TOKEN");
                return res.status(500).json({ error: 'Database configuration missing (Env Vars)' });
            }

            // Read highscores from Redis
            // We store the list under the key 'highscores'
            const highscores = await kv.get('highscores');
            return res.status(200).json(highscores || []);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to load highscores' });
        }
    }

    if (req.method === 'POST') {
        try {
            const newScore = req.body;
            let highscores = (await kv.get('highscores')) || [];

            highscores.push(newScore);

            // Sort descending and keep top 10
            highscores.sort((a, b) => b.score - a.score);
            highscores = highscores.slice(0, 10);

            // Save back to Redis
            await kv.set('highscores', highscores);

            return res.status(200).json(highscores);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to save highscore' });
        }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method Not Allowed' });
}
