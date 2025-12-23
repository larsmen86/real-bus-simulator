import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import BusMarker from './BusMarker';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchBusRoute } from '../services/api';
import { parseOverpassResponse } from '../utils/osm';

import LineControls from './LineControls';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const BUS_COST = 1000;
const TICKET_PRICE = 10;
const MAX_WAITING_LIMIT = 50;

const MapComponent = () => {
    const [routes, setRoutes] = useState([]);
    const [busCounts, setBusCounts] = useState({ '101': 1, '102': 1, '103': 1, '104': 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Game Economy
    const [money, setMoney] = useState(0); // Start broke but with assets
    const [totalPassengers, setTotalPassengers] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Passenger Management
    // { [stopId]: count }
    const [waitingPassengers, setWaitingPassengers] = useState({});

    // Bus Status Management
    // { [busId]: { id: string, line: string, passengers: number, capacity: number } }
    const [busStats, setBusStats] = useState({});

    const position = [49.4447, 7.7689];

    useEffect(() => {
        const loadRoute = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log("Fetching KL Buses...");
                const data = await fetchBusRoute();
                const parsedRoutes = parseOverpassResponse(data);

                if (parsedRoutes.length === 0) {
                    setError("No bus lines found. API might be empty or limiting results.");
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
                setError(err.message || "Failed to load bus data.");
            } finally {
                setLoading(false);
            }
        }
        loadRoute();
    }, []);

    // Spawner Loop
    useEffect(() => {
        if (routes.length === 0 || gameOver) return;

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

                // Difficulty Scaling: More buses = More demand
                const totalBuses = Object.values(busCounts).reduce((a, b) => a + b, 0);
                const spawnMultiplier = 1 + (totalBuses * 0.15); // e.g. 10 buses = 2.5x spawn rate

                // Spawn at 3 different stops
                for (let i = 0; i < 3; i++) {
                    const randomStopId = stopIds[Math.floor(Math.random() * stopIds.length)];
                    const baseAmount = Math.floor(Math.random() * 5) + 1;
                    const added = Math.ceil(baseAmount * spawnMultiplier);

                    next[randomStopId] = (next[randomStopId] || 0) + added;
                }
                return next;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [routes, gameOver, busCounts]); // Dependent on busCounts for scaling

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

    // Bus status callback
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

    const handleBuyBus = (lineRef) => {
        if (gameOver) return;

        if (money >= BUS_COST) {
            setMoney(prev => prev - BUS_COST);
            setBusCounts(prev => ({
                ...prev,
                [lineRef]: (prev[lineRef] || 0) + 1
            }));
        } else {
            alert("Not enough money! Need " + BUS_COST + "€");
        }
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <LineControls
                routes={routes}
                busCounts={busCounts}
                onUpdateBusCount={handleBuyBus} // Replaced generic update with Buy Logic
                loading={loading}
                error={error}
                busStats={busStats}
                waitingPassengers={waitingPassengers}
                money={money}               // GAME STATE
                totalPassengers={totalPassengers}
                gameOver={gameOver}
                busCost={BUS_COST}
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
                    <h1 style={{ fontSize: '48px', margin: '20px', color: '#ff4444' }}>GAME OVER</h1>
                    <p style={{ fontSize: '24px' }}>Overcrowding! More than {MAX_WAITING_LIMIT} people waited at a stop.</p>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '20px' }}>Total Transported: {totalPassengers}</p>

                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', textAlign: 'center', minWidth: '300px' }}>
                        <h3 style={{ marginTop: 0 }}>Enter Name for Highscore</h3>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            style={{ padding: '10px', fontSize: '18px', borderRadius: '5px', border: 'none', marginBottom: '10px', width: '80%', color: 'black' }}
                        />
                        <br />
                        <button
                            style={{ padding: '10px 30px', fontSize: '18px', cursor: 'pointer', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}
                            onClick={saveHighscore}
                        >
                            Save & Restart
                        </button>
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                        <h3>🏆 Kaierslautern Legends 🏆</h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {highscores.map((s, i) => (
                                <li key={i} style={{ fontSize: '18px', margin: '5px 0' }}>
                                    {i + 1}. <strong>{s.name}</strong> - {s.score} pax ({s.date})
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
                                radius={waitingPassengers[stop.id] > 20 ? 10 : 6} // Visual indicator for crowded stops
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

                        {Array.from({ length: busCounts[route.ref] || 0 }).map((_, idx) => {
                            const offset = 0;
                            return (
                                <BusMarker
                                    key={`bus-${route.id}-${idx}`}
                                    routePath={route.path}
                                    stops={route.stops}
                                    color={route.color}
                                    busId={`${route.ref} (${idx + 1})`}
                                    startProgress={offset}
                                    onArriveAtStop={handleBusArriveAtStop}
                                    onStatusUpdate={handleBusStatusUpdate}
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
