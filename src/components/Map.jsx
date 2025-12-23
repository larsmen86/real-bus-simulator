import React, { useEffect, useState } from 'react';
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
    const [busCounts, setBusCounts] = useState({ '101': 1, '102': 1 }); // Default 1 bus per line
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const position = [49.4447, 7.7689]; // Kaiserslautern Center

    useEffect(() => {
        const loadRoute = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log("Fetching KL Buses...");
                const data = await fetchBusRoute();
                const parsedRoutes = parseOverpassResponse(data);
                console.log("Parsed Routes:", parsedRoutes);

                if (parsedRoutes.length === 0) {
                    setError("No bus lines found. API might be empty or limiting results.");
                } else {
                    setRoutes(parsedRoutes);
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
                        {/* Render full path */}
                        <Polyline
                            positions={route.path}
                            color={route.color}
                            weight={5}
                            opacity={0.7}
                        >
                            <Popup>Bus {route.ref}</Popup>
                        </Polyline>

                        {/* Render stops */}
                        {route.stops.map(stop => (
                            <CircleMarker
                                center={stop.position}
                                radius={4}
                                color={route.color}
                                fillColor="white"
                                fillOpacity={1}
                                key={`${route.id}-stop-${stop.id}`}
                            >
                                <Popup>Haltestelle: {stop.role} (Linie {route.ref})</Popup>
                            </CircleMarker>
                        ))}

                        {/* Bus Simulation: Spawn N buses distributed evenly */}
                        {Array.from({ length: busCounts[route.ref] || 0 }).map((_, idx) => {
                            const count = busCounts[route.ref] || 1;
                            const offset = idx / count; // 0, 0.5 for 2 buses; 0, 0.33, 0.66 for 3 buses

                            return (
                                <BusMarker
                                    key={`bus-${route.id}-${idx}`}
                                    routePath={route.path}
                                    color={route.color}
                                    busId={`${route.ref} (${idx + 1})`}
                                    startProgress={offset}
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
