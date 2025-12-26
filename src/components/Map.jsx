import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import BusMarker from './BusMarker';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchBusRoute } from '../services/api';
import { parseOverpassResponse } from '../utils/osm';
import { translations } from '../utils/translations';

import LineControls from './LineControls';
import Notification from './Notification';

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

// Inner component to control map view
const MapController = ({ viewState }) => {
    const map = useMap();

    useEffect(() => {
        if (viewState) {
            console.log("MapController: flying to", viewState);
            map.flyTo(viewState.center, viewState.zoom, {
                animate: true,
                duration: 1.5
            });
        }
    }, [viewState, map]);

    return null;
};

// Component to handle map user interactions to break follow mode
const MapInteractions = ({ onInteraction }) => {
    useMapEvents({
        dragstart: () => onInteraction(),
        // click: () => onInteraction() // Disabled to prevent conflicts with UI clicks
    });
    return null;
};

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
    const [lastLevel, setLastLevel] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Notification State
    const [notification, setNotification] = useState(null);
    const [nextEventThreshold, setNextEventThreshold] = useState(null);

    // Simulation Control
    const [simulationSpeed, setSimulationSpeed] = useState(1);
    const [isPaused, setIsPaused] = useState(false);

    // Highscore State
    const [highscores, setHighscores] = useState([]);
    const [playerName, setPlayerName] = useState("");

    // Map View Control
    const [mapView, setMapView] = useState(null);
    const [followingBusId, setFollowingBusId] = useState(null);

    // Load Highscores
    // Load Highscores
    useEffect(() => {
        fetch('/api/highscores')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHighscores(data);
                } else {
                    console.error("Received non-array highscores:", data);
                    setHighscores([]);
                }
            })
            .catch(err => {
                console.error("Failed to load highscores:", err);
                setHighscores([]);
            });
    }, []);

    const saveHighscore = () => {
        if (!playerName.trim()) return;

        const newScore = { name: playerName, score: totalPassengers, date: new Date().toLocaleDateString() };

        fetch('/api/highscores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newScore)
        })
            .then(res => res.json())
            .then(updatedHighscores => {
                if (Array.isArray(updatedHighscores)) {
                    setHighscores(updatedHighscores);
                    if (onBackToMenu) onBackToMenu();
                    else window.location.reload();
                } else {
                    console.error("Invalid highscore response:", updatedHighscores);
                    // Fallback: reload anyway to clear state
                    window.location.reload();
                }
            })
            .catch(err => {
                console.error("Failed to save highscore:", err);
                window.location.reload();
            });
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

                // Set initial event threshold from config
                if (conf.event && conf.event.autoTrigger) {
                    setNextEventThreshold(conf.event.autoTrigger);
                } else {
                    setNextEventThreshold(1000); // Default fallback
                }

                // Prioritize session config (Start Menu) over config.json
                // Start Capital is now calculated based on lines found (see below)

                // 2. Load OSM Data
                console.log(`Fetching Buses for ${conf.cityName}...`);
                const data = await fetchBusRoute(conf.overpass.bbox, conf.overpass.queryRegex);
                const parsedRoutes = parseOverpassResponse(data);

                if (parsedRoutes.length === 0) {
                    setError("No bus lines found. Check config regex/bbox.");
                } else {
                    setRoutes(parsedRoutes);

                    // Calculate Start Capital: 1000 per Line (or from config)
                    const perLine = conf.startCapitalPerLine || 1000;
                    const calculatedCapital = parsedRoutes.length * perLine;
                    setMoney(calculatedCapital);

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
                // Level-based difficulty (1000 passengers = 1 level)
                // Use Ref to avoid resetting interval on every passenger change
                const currentLevel = Math.floor(totalPassengersRef.current / 1000);
                const spawnMultiplier = 1 + (currentLevel * 0.2);

                // Use config.spawn settings or defaults
                // Default: 3 stops, 1-5 pax
                const stopsToSpawn = config?.spawn?.stopsPerSpawn || 3;

                // Fallback for min/max
                const minPax = config?.spawn?.minPassengers || 1;
                const maxPax = config?.spawn?.maxPassengers || 5;

                for (let i = 0; i < stopsToSpawn; i++) {
                    const randomStopId = stopIds[Math.floor(Math.random() * stopIds.length)];
                    const baseAmount = Math.floor(Math.random() * (maxPax - minPax + 1)) + minPax;
                    const added = Math.ceil(baseAmount * spawnMultiplier);

                    next[randomStopId] = (next[randomStopId] || 0) + added;
                }
                return next;
            });
        }, (config?.spawn?.interval || 3000) / simulationSpeed); // Adjust spawn rate by speed

        return () => clearInterval(interval);
    }, [routes, gameOver, fleet, isPaused, simulationSpeed, config]); // Removed totalPassengers to prevent restart

    // Level Up Check
    useEffect(() => {
        const currentLevel = Math.floor(totalPassengers / 1000);
        if (currentLevel > lastLevel) {
            setLastLevel(currentLevel);
            setNotification({
                message: `${t.levelUp} ${currentLevel} - ${t.morePax}`,
                type: 'success'
            });
        }
    }, [totalPassengers, lastLevel, t]);

    // Bus arrival callback
    const waitingPassengersRef = useRef(waitingPassengers);
    const totalPassengersRef = useRef(totalPassengers);

    // Purchase Lock to prevent race conditions/crashes on rapid clicks
    const isBuyingRef = useRef(false);

    useEffect(() => {
        waitingPassengersRef.current = waitingPassengers;
    }, [waitingPassengers]);

    useEffect(() => {
        totalPassengersRef.current = totalPassengers;
    }, [totalPassengers]);

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
        if (gameOver || isBuyingRef.current) return;

        // Lock purchase for 500ms
        isBuyingRef.current = true;
        setTimeout(() => { isBuyingRef.current = false; }, 500);

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

            // alert(`${config.event.emoji} ${config.event.name}: ${config.event.message}`);
            setNotification({
                message: `${config.event.emoji} ${config.event.name}: ${config.event.message}`,
                type: 'event'
            });
            return next;
        });
    };

    // Automatic Event Trigger
    useEffect(() => {
        if (!config || nextEventThreshold === null) return;

        if (totalPassengers >= nextEventThreshold) {
            triggerFCKEvent();
            // Increment by the configured amount or default 1000
            const step = config.event?.autoTrigger || 1000;
            setNextEventThreshold(prev => prev + step);
        }
    }, [totalPassengers, nextEventThreshold, config]);

    // Handlers for List Clicks
    const handleZoomToStop = (stopId) => {
        console.log("handleZoomToStop called for:", stopId);
        // Find stop coordinates
        for (const route of routes) {
            // Fix: Loose comparison or explicit string conversion because stopId from object keys is string
            const stop = route.stops.find(s => String(s.id) === String(stopId));
            if (stop) {
                console.log("Stop found:", stop.position);
                setMapView({
                    center: stop.position,
                    zoom: 18, // Close zoom for stops (increased from 16)
                    timestamp: Date.now()
                });
                break;
            }
        }
    };

    const handleZoomToBus = (busId) => {
        console.log("handleZoomToBus called for:", busId);
        setFollowingBusId(busId);
    };

    const handleMapInteraction = () => {
        if (followingBusId) {
            console.log("User interaction, breaking follow mode");
            setFollowingBusId(null);
        }
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <Notification
                message={notification?.message}
                type={notification?.type}
                onClose={() => setNotification(null)}
            />
            <LineControls
                routes={routes}
                fleet={fleet} // Updated prop
                onBuyBus={handleBuyBus} // Updated prop
                onZoomToStop={handleZoomToStop} // New prop
                onZoomToBus={handleZoomToBus} // New prop
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
                            {Array.isArray(highscores) && highscores.map((s, i) => (
                                <li key={i} style={{ fontSize: '18px', margin: '5px 0' }}>
                                    {i + 1}. <strong>{s.name}</strong> - {s.score} {t.pax} ({s.date})
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                <MapController viewState={mapView} />
                <MapInteractions onInteraction={handleMapInteraction} />
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
                            const displayBusId = `${route.ref} (${idx + 1})`; // Consistent with BusMarker loop
                            return (
                                <BusMarker
                                    key={bus.id} // use stable ID
                                    routePath={route.path}
                                    stops={route.stops}
                                    color={route.color}
                                    busId={displayBusId}
                                    startProgress={0}
                                    capacity={bus.capacity} // Passing capacity!
                                    type={bus.type}
                                    onArriveAtStop={handleBusArriveAtStop}
                                    onStatusUpdate={handleBusStatusUpdate}
                                    simulationSpeed={simulationSpeed}
                                    isPaused={isPaused}
                                    language={language}
                                    isFollowed={followingBusId === displayBusId} // Fix: Check against display ID
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
