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

const MapComponent = () => {
    const [routes, setRoutes] = useState([]);
    const [busCounts, setBusCounts] = useState({ '101': 1, '102': 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Passenger Management
    // { [stopId]: count }
    const [waitingPassengers, setWaitingPassengers] = useState({});

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

                    // Initialize empty waiting passengers for all stops
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

    // Spawner Loop: Add random passengers to random stops every 3 seconds
    useEffect(() => {
        if (routes.length === 0) return;

        const interval = setInterval(() => {
            setWaitingPassengers(prev => {
                const next = { ...prev };

                // Pick a few random stops to add people to
                // Get all stop IDs
                const stopIds = Object.keys(next);
                if (stopIds.length === 0) return next;

                // Spawn at 3 different stops
                for (let i = 0; i < 3; i++) {
                    const randomStopId = stopIds[Math.floor(Math.random() * stopIds.length)];
                    // Add 1-5 people
                    const added = Math.floor(Math.random() * 5) + 1;
                    next[randomStopId] = (next[randomStopId] || 0) + added;
                }

                return next;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [routes]);

    // Callback for BusMarker to pick up passengers
    // We use a ref mechanism or functional update to avoid stale state issues if passed directly?
    // Actually, since BusMarker calls this specific function, we need to ensure it has access to the *LATEST* state.
    // However, `onArriveAtStop` is passed to BusMarker usually as a closure.
    // If we wrap it in useCallback with dependency [waitingPassengers], it will re-render BusMarkers often (bad for anim?).
    // Better: Use a Ref for waitingPassengers solely for the callback read, OR pass a setter that uses functional updates?
    // BUT we need to return the 'boarded' count synchronously to the bus.

    // Solution: Use a Ref to track waitingPassengers for synchronous reads in callbacks
    const waitingPassengersRef = useRef(waitingPassengers);
    useEffect(() => {
        waitingPassengersRef.current = waitingPassengers;
    }, [waitingPassengers]);

    const handleBusArriveAtStop = useCallback((stopId, currentLoad, capacity) => {
        const waiting = waitingPassengersRef.current[stopId] || 0;
        const availableSpace = capacity - currentLoad;
        const boarding = Math.min(waiting, availableSpace);

        if (boarding > 0) {
            // Update global state
            setWaitingPassengers(prev => ({
                ...prev,
                [stopId]: (prev[stopId] || 0) - boarding
            }));
        }

        return boarding;
    }, []); // No deps, reads from Ref

    const handleUpdateBusCount = (lineRef, count) => {
        setBusCounts(prev => ({
            ...prev,
            [lineRef]: count
        }));
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <LineControls
                routes={routes}
                busCounts={busCounts}
                onUpdateBusCount={handleUpdateBusCount}
                loading={loading}
                error={error}
            />

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
                                radius={6} // Slightly larger
                                color={route.color}
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
                            const count = busCounts[route.ref] || 1;
                            const offset = idx / count;

                            return (
                                <BusMarker
                                    key={`bus-${route.id}-${idx}`}
                                    routePath={route.path}
                                    stops={route.stops}
                                    color={route.color}
                                    busId={`${route.ref} (${idx + 1})`}
                                    startProgress={offset}
                                    onArriveAtStop={handleBusArriveAtStop}
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
