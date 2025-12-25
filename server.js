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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
