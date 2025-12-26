import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const HIGHSCORE_FILE = path.join(__dirname, 'highscore.json');

// Get Highscores
app.get('/api/highscores', async (req, res) => {
    try {
        const data = await fs.readFile(HIGHSCORE_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist yet, return empty array
            res.json([]);
        } else {
            console.error('Error reading highscore file:', error);
            res.status(500).json({ error: 'Failed to read highscores' });
        }
    }
});

// Save Highscore
app.post('/api/highscores', async (req, res) => {
    try {
        const newScore = req.body; // Expect { name, score, date }

        let highscores = [];
        try {
            const data = await fs.readFile(HIGHSCORE_FILE, 'utf-8');
            highscores = JSON.parse(data);
        } catch (error) {
            // Ignore ENOENT, start with empty array
            if (error.code !== 'ENOENT') throw error;
        }

        // Add new score
        highscores.push(newScore);

        // Sort and keep top 10 (or 5, matching frontend logic)
        highscores.sort((a, b) => b.score - a.score);
        highscores = highscores.slice(0, 10); // Check consistency with frontend

        await fs.writeFile(HIGHSCORE_FILE, JSON.stringify(highscores, null, 2));

        res.json(highscores);
    } catch (error) {
        console.error('Error saving highscore:', error);
        res.status(500).json({ error: 'Failed to save highscore' });
    }
});


const BUS_CACHE_FILE = path.join(__dirname, 'bus_data_cache.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Get Bus Data Cache
app.get('/api/bus_data', async (req, res) => {
    try {
        const data = await fs.readFile(BUS_CACHE_FILE, 'utf-8');
        const cached = JSON.parse(data);
        const age = Date.now() - cached.timestamp;

        if (age > MAX_AGE_MS) {
            return res.status(404).json({ error: "Cache expired" });
        }

        res.json(cached.data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: "No cache found" });
        } else {
            console.error('Error reading bus cache:', error);
            res.status(500).json({ error: 'Failed to read cache' });
        }
    }
});

// Save Bus Data Cache
app.post('/api/bus_data', async (req, res) => {
    try {
        const newData = req.body;
        if (!newData) return res.status(400).json({ error: "No data" });

        const cacheEntry = {
            timestamp: Date.now(),
            data: newData
        };

        await fs.writeFile(BUS_CACHE_FILE, JSON.stringify(cacheEntry, null, 2));
        res.json({ success: true, timestamp: cacheEntry.timestamp });
    } catch (error) {
        console.error('Error saving bus cache:', error);
        res.status(500).json({ error: 'Failed to save cache' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
