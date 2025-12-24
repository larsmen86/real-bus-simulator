import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import BusMarker from './BusMarker';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchBusRoute } from '../services/api';
import { parseOverpassResponse } from '../utils/osm';
import { translations } from '../utils/translations';
import LineControls from './LineControls';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const BUS_COST_STD = 1000;
const BUS_COST_ART = 2000;
const TICKET_PRICE = 10;
const MAX_WAITING_LIMIT = 50;

const MapComponent = ({ sessionConfig = {}, onBackToMenu }) => {
    const language = sessionConfig.language || 'de';
    const t = translations[language];

    const [config, setConfig] = useState(null); // Config state
    const [routes, setRoutes] = useState([]);

    // Fleet initialized after config load
    const [fleet, setFleet] = useState({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ... (Economy & Highscore - No Change) ...
    // Game Economy
    const [money, setMoney] = useState(0);
    const [totalPassengers, setTotalPassengers] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Simulation Control
    const [simulationSpeed, setSimulationSpeed] = useState(1);
    const [isPaused, setIsPaused] = useState(false);

    // Highscore State
    const [highscores, setHighscores] = useState([]);
    const [playerName, setPlayerName] = useState("");

    // Load Highscores
    useEffect(() => {
        const stored = localStorage.getItem('busTycoonHighscores');
        if (stored) {
            setHighscores(JSON.parse(stored));
        }
    }, []);

    const saveHighscore = () => {
        if (!playerName.trim()) return;

        const newScore = { name: playerName, score: totalPassengers, date: new Date().toLocaleDateString() };
        const updated = [...highscores, newScore].sort((a, b) => b.score - a.score).slice(0, 5); // Keep top 5

        setHighscores(updated);
        localStorage.setItem('busTycoonHighscores', JSON.stringify(updated));
        if (onBackToMenu) onBackToMenu();
        else window.location.reload(); // Fallback
    };


    // Passenger Management
    const [waitingPassengers, setWaitingPassengers] = useState({});

    // Bus Status Management
    const [busStats, setBusStats] = useState({});

    // Default position, updated by config
    const position = config ? config.mapCenter : [49.4447, 7.7689];

    // Load Config & Data
    useEffect(() => {
        const initSimulator = async () => {
            setLoading(true);
            try {
                // 1. Load Config
                const configRes = await fetch('/config.json');
                if (!configRes.ok) throw new Error("Could not load config.json");
                const conf = await configRes.json();

                setConfig(conf);
                setFleet(conf.initialFleet || {});

                // Prioritize session config (Start Menu) over config.json
                if (sessionConfig.startCapital !== undefined) {
                    setMoney(sessionConfig.startCapital);
                } else if (conf.startCapital !== undefined) {
                    setMoney(conf.startCapital);
                }

                // 2. Load OSM Data
                console.log(`Fetching Buses for ${conf.cityName}...`);
                const data = await fetchBusRoute(conf.overpass.bbox, conf.overpass.queryRegex);
                const parsedRoutes = parseOverpassResponse(data);

                if (parsedRoutes.length === 0) {
                    setError("No bus lines found. Check config regex/bbox.");
                } else {
                    setRoutes(parsedRoutes);

                    // Initialize waiting passengers
                    const initialWaiting = {};
                    parsedRoutes.forEach(r => {
                        r.stops.forEach(s => {
                            initialWaiting[s.id] = 0;
                        });
                    });
                    setWaitingPassengers(initialWaiting);
                }
            } catch (err) {
                console.error(err);
                setError(err.message || "Failed to initialize simulation.");
            } finally {
                setLoading(false);
            }
        };

        initSimulator();
    }, []);

    // Spawner Loop
    useEffect(() => {
        if (routes.length === 0 || gameOver || isPaused) return;

        const interval = setInterval(() => {
            setWaitingPassengers(prev => {
                const next = { ...prev };
                const stopIds = Object.keys(next);
                if (stopIds.length === 0) return next;

                // Check for Game Over Condition
                const maxWaiting = Math.max(...Object.values(next));
                if (maxWaiting > MAX_WAITING_LIMIT) {
                    setGameOver(true);
                    return prev;
                }

                // Difficulty Scaling
                // Count total buses from fleet
                const totalBuses = Object.values(fleet).reduce((acc, lineBuses) => acc + lineBuses.length, 0);
                const spawnMultiplier = 1 + (totalBuses * 0.15);

                for (let i = 0; i < 3; i++) {
                    const randomStopId = stopIds[Math.floor(Math.random() * stopIds.length)];
                    const baseAmount = Math.floor(Math.random() * 5) + 1;
                    const added = Math.ceil(baseAmount * spawnMultiplier);

                    next[randomStopId] = (next[randomStopId] || 0) + added;
                }
                return next;
            });
        }, 3000 / simulationSpeed); // Adjust spawn rate by speed

        return () => clearInterval(interval);
    }, [routes, gameOver, fleet, isPaused, simulationSpeed]);

    // Bus arrival callback
    const waitingPassengersRef = useRef(waitingPassengers);
    useEffect(() => {
        waitingPassengersRef.current = waitingPassengers;
    }, [waitingPassengers]);

    const handleBusArriveAtStop = useCallback((stopId, currentLoad, capacity) => {
        if (gameOver) return 0;

        const waiting = waitingPassengersRef.current[stopId] || 0;
        const availableSpace = capacity - currentLoad;
        const boarding = Math.min(waiting, availableSpace);

        if (boarding > 0) {
            setWaitingPassengers(prev => ({
                ...prev,
                [stopId]: (prev[stopId] || 0) - boarding
            }));

            // ECONOMY UPDATE
            setMoney(prev => prev + (boarding * TICKET_PRICE));
            setTotalPassengers(prev => prev + boarding);
        }

        return boarding;
    }, [gameOver]);

    const handleBusStatusUpdate = useCallback((busId, passengers, capacity) => {
        setBusStats(prev => {
            if (prev[busId] && prev[busId].passengers === passengers) return prev;
            return {
                ...prev,
                [busId]: {
                    id: busId,
                    line: busId.split(' ')[0],
                    passengers,
                    capacity
                }
            };
        });
    }, []);

    const handleBuyBus = (lineRef, type = 'standard') => {
        if (gameOver) return;

        const cost = type === 'articulated' ? BUS_COST_ART : BUS_COST_STD;
        const capacity = type === 'articulated' ? 100 : 50;

        if (money >= cost) {
            setMoney(prev => prev - cost);

            setFleet(prev => {
                const currentLine = prev[lineRef] || [];
                const newBusId = `${lineRef}-${currentLine.length + 1}`; // 101-5
                return {
                    ...prev,
                    [lineRef]: [...currentLine, { type, capacity, id: newBusId }]
                };
            });

        } else {
            alert("Not enough money! Need " + cost + "€");
        }
    };

    const triggerFCKEvent = () => {
        if (!config || !config.event) return;

        // Spawn massive wave based on config
        setWaitingPassengers(prev => {
            const next = { ...prev };
            const stopIds = Object.keys(next);

            // Calculate loops based on spawnAmount (assuming each loop adds 10 or distribute evenly)
            // Let's simplified: distribute spawnAmount across random stops.
            const totalToSpawn = config.event.spawnAmount || 300;
            const batchSize = 10;
            const iterations = Math.ceil(totalToSpawn / batchSize);

            for (let i = 0; i < iterations; i++) {
                const randomStopId = stopIds[Math.floor(Math.random() * stopIds.length)];
                next[randomStopId] = (next[randomStopId] || 0) + batchSize;
            }

            alert(`${config.event.emoji} ${config.event.name}: ${config.event.message}`);
            return next;
        });
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <LineControls
                routes={routes}
                fleet={fleet} // Updated prop
                onBuyBus={handleBuyBus} // Updated prop
                onTriggerEvent={triggerFCKEvent} // New prop
                eventConfig={config ? config.event : null} // Pass event config
                loading={loading}
                error={error}
                busStats={busStats}
                waitingPassengers={waitingPassengers}
                money={money}
                totalPassengers={totalPassengers}
                gameOver={gameOver}
                busCostStd={BUS_COST_STD}
                busCostArt={BUS_COST_ART}
                simulationSpeed={simulationSpeed}
                setSimulationSpeed={setSimulationSpeed}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                language={language}
            />

            {gameOver && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                    <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', color: '#ff4444' }}>{t.gameOverTitle}</h1>
                    <p style={{ fontSize: '24px' }}>{t.gameOverText}</p>
                    <p style={{ fontSize: '32px', margin: '30px 0' }}>{t.score}: <strong>{totalPassengers}</strong></p>

                    <div style={{ background: '#333', padding: '20px', borderRadius: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '10px' }}>{t.enterName}</label>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            style={{ padding: '10px', fontSize: '18px', borderRadius: '5px', border: 'none', width: '250px' }}
                            placeholder="Captain Bus"
                        />
                        <br />
                        <button
                            style={{ padding: '10px 30px', fontSize: '18px', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', marginTop: '15px' }}
                            onClick={saveHighscore}
                        >
                            {t.saveRestart}
                        </button>
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                        <h3>{t.legends}</h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {highscores.map((s, i) => (
                                <li key={i} style={{ fontSize: '18px', margin: '5px 0' }}>
                                    {i + 1}. <strong>{s.name}</strong> - {s.score} {t.pax} ({s.date})
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {routes.map(route => (
                    <React.Fragment key={route.id}>
                        <Polyline
                            positions={route.path}
                            color={route.color}
                            weight={5}
                            opacity={0.7}
                        >
                            <Popup>Bus {route.ref}</Popup>
                        </Polyline>

                        {route.stops.map(stop => (
                            <CircleMarker
                                center={stop.position}
                                radius={waitingPassengers[stop.id] > 20 ? 10 : 6}
                                color={waitingPassengers[stop.id] > 40 ? 'red' : route.color}
                                fillColor="white"
                                fillOpacity={1}
                                key={`${route.id}-stop-${stop.id}`}
                            >
                                <Popup>
                                    <strong>{stop.name}</strong><br />
                                    Linie {route.ref}<br />
                                    Waiting: {waitingPassengers[stop.id] || 0} pax
                                </Popup>
                            </CircleMarker>
                        ))}

                        {(fleet[route.ref] || []).map((bus, idx) => {
                            // Map fleet array to BusMarkers. 
                            return (
                                <BusMarker
                                    key={bus.id} // use stable ID
                                    routePath={route.path}
                                    stops={route.stops}
                                    color={route.color}
                                    busId={`${route.ref} (${idx + 1})`} // Keeping legacy Display Name format
                                    startProgress={0}
                                    capacity={bus.capacity} // Passing capacity!
                                    type={bus.type}
                                    onArriveAtStop={handleBusArriveAtStop}
                                    onStatusUpdate={handleBusStatusUpdate}
                                    simulationSpeed={simulationSpeed}
                                    isPaused={isPaused}
                                    language={language}
                                />
                            );
                        })}

                    </React.Fragment>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapComponent;
