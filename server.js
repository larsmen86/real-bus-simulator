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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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


const getCacheFile = (mapId) => {
    // Sanitize mapId to prevent directory traversal
    const safeMapId = (mapId || 'default').replace(/[^a-z0-9_-]/gi, '_');
    return path.join(__dirname, `bus_data_cache_${safeMapId}.json`);
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Get Bus Data Cache
app.get('/api/bus_data', async (req, res) => {
    try {
        const mapId = req.query.mapId;
        const cacheFile = getCacheFile(mapId);

        const data = await fs.readFile(cacheFile, 'utf-8');
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
        const newData = req.body.data;
        const mapId = req.body.mapId; // Expect mapId in body

        if (!newData) return res.status(400).json({ error: "No data" });

        const cacheEntry = {
            timestamp: Date.now(),
            data: newData
        };

        const cacheFile = getCacheFile(mapId);
        await fs.writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));
        res.json({ success: true, timestamp: cacheEntry.timestamp, mapId });
    } catch (error) {
        console.error('Error saving bus cache:', error);
        res.status(500).json({ error: 'Failed to save cache' });
    }
});

// Debug Bus Data Cache
app.get('/api/bus_data_debug', async (req, res) => {
    try {
        const mapId = req.query.mapId;
        const cacheFile = getCacheFile(mapId);

        const stats = await fs.stat(cacheFile);
        const data = await fs.readFile(cacheFile, 'utf-8');
        const cached = JSON.parse(data);

        const sizeBytes = stats.size;
        const sizeFormatted = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';

        // Create a preview (first 100 chars of data string)
        let preview = "Invalid Data";
        if (cached.data) {
            preview = JSON.stringify(cached.data).substring(0, 500) + "...";
        }

        res.json({
            mapId: mapId || 'default',
            timestamp: cached.timestamp,
            dataSize: sizeBytes,
            sizeFormatted: sizeFormatted,
            dataPreview: preview
        });

    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: "No cache found" });
        } else {
            console.error('Error reading bus cache debug:', error);
            res.status(500).json({ error: 'Failed to read cache debug info' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
