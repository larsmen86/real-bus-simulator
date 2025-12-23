import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Simple Bus Icon
const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Public placeholder bus icon
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

const BusMarker = ({ routePath, color, busId, startProgress = 0 }) => {
    const [position, setPosition] = useState(null);
    const [nextPointIndex, setNextPointIndex] = useState(1);

    // Animation refs
    const requestRef = useRef();
    const startTimeRef = useRef();
    const currentPosRef = useRef(null);

    // Speed in meters per second (approx 40 km/h = ~11 m/s)
    const SPEED_MPS = 30;

    useEffect(() => {
        if (!routePath || routePath.length < 2) return;

        // Initialize position
        const totalPoints = routePath.length;
        const startIndex = Math.floor(totalPoints * startProgress);
        const safeIndex = Math.max(0, Math.min(startIndex, totalPoints - 2));

        const start = routePath[safeIndex];

        setPosition(start);
        currentPosRef.current = start;
        setNextPointIndex(safeIndex + 1);

        const animate = (time) => {
            if (!startTimeRef.current) startTimeRef.current = time;

            // Current target
            const targetIndex = nextPointIndex;
            if (targetIndex >= routePath.length) {
                // Restart loop
                setNextPointIndex(1);
                setPosition(routePath[0]);
                currentPosRef.current = routePath[0];
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const target = routePath[targetIndex];
            const current = currentPosRef.current;

            // Calculate distance to target
            const from = L.latLng(current);
            const to = L.latLng(target);
            const dist = from.distanceTo(to); // Meters

            if (dist < 5) {
                // Reached target
                setNextPointIndex(prev => prev + 1);
                currentPosRef.current = target;
                setPosition(target);
            } else {
                // Move towards target
                const moveDist = SPEED_MPS * (1 / 60);
                const ratio = moveDist / dist;

                const lat = current[0] + (target[0] - current[0]) * ratio;
                const lng = current[1] + (target[1] - current[1]) * ratio;

                const newPos = [lat, lng];
                currentPosRef.current = newPos;
                setPosition(newPos);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(requestRef.current);
    }, [routePath]); // Removed nextPointIndex dependency to prevent loop reset on state change, rely on refs

    if (!position) return null;

    return (
        <Marker position={position} icon={busIcon}>
            <Popup>
                Bus {busId} <br />
                Speed: {SPEED_MPS * 3.6} km/h
            </Popup>
        </Marker>
    );
};

export default BusMarker;
