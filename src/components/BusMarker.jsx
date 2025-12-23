import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Simple Bus Icon
const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

const BUS_CAPACITY = 50;

const BusMarker = ({ routePath, stops, busId, startProgress = 0, onArriveAtStop }) => {
    const [position, setPosition] = useState(null);
    const [passengers, setPassengers] = useState(0); // Current onboard count

    // Animation refs
    const requestRef = useRef();
    const startTimeRef = useRef();
    const currentPosRef = useRef(null);
    const nextPointIndexRef = useRef(1);
    const directionRef = useRef(1); // 1 = forward, -1 = backward
    const isPausedRef = useRef(false); // New: Pause flag for stops

    // Speed in meters per second (approx 40 km/h = ~11 m/s)
    const SPEED_MPS = 40;

    useEffect(() => {
        if (!routePath || routePath.length < 2) return;

        // Initialize position
        const totalPoints = routePath.length;
        const startIndex = Math.floor(totalPoints * startProgress);
        const safeIndex = Math.max(0, Math.min(startIndex, totalPoints - 2));

        const start = routePath[safeIndex];

        setPosition(start);
        currentPosRef.current = start;

        // Reset animation state
        directionRef.current = 1;
        nextPointIndexRef.current = safeIndex + 1;
        isPausedRef.current = false;

        const advanceToNextPoint = () => {
            let nextIdx = nextPointIndexRef.current + directionRef.current;

            // Check bounds and reverse direction if needed
            if (nextIdx >= routePath.length) {
                directionRef.current = -1;
                nextIdx = routePath.length - 2;
            } else if (nextIdx < 0) {
                directionRef.current = 1;
                nextIdx = 1;
            }

            nextPointIndexRef.current = nextIdx;
        };

        const checkForStop = (currentIndex) => {
            if (!stops) return;

            // Find if any stop is at this index (or very close)
            // Ideally stops are mapped to exact indices in osm.js
            const stop = stops.find(s => Math.abs(s.pathIndex - currentIndex) < 2);

            if (stop && !isPausedRef.current) {
                handleStop(stop);
            }
        };

        const handleStop = (stop) => {
            isPausedRef.current = true;
            // console.log(`Bus ${busId} stopped at ${stop.name}`);

            // 1. Alight random passengers
            // Chance to alight: 10-30% of current payload
            const alightingCount = Math.floor(passengers * (0.1 + Math.random() * 0.2));
            const afterAlight = Math.max(0, passengers - alightingCount);

            // 2. Boarding (Request from Parent)
            // We need a slight delay to simulate "doors opening" before boarding logic? 
            // Or just do it immediately.

            // Call parent to get new passengers
            // We assume onArriveAtStop is synchronous or returns immediate result for simplicity here,
            // but if it updates state, we might need to rely on the prop update.
            // For now, let's assume it returns { boarded }.

            let boarded = 0;
            if (onArriveAtStop) {
                boarded = onArriveAtStop(stop.id, afterAlight, BUS_CAPACITY);
            }

            const newTotal = afterAlight + boarded;
            setPassengers(newTotal);

            // Wait 2 seconds then resume
            setTimeout(() => {
                isPausedRef.current = false;
            }, 2000);
        };

        const animate = (time) => {
            if (!startTimeRef.current) startTimeRef.current = time;

            if (isPausedRef.current) {
                // Just keep rerunning loop to check for unpause, but don't move
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const targetIndex = nextPointIndexRef.current;

            // Safety check for bounds
            if (targetIndex < 0 || targetIndex >= routePath.length) {
                advanceToNextPoint();
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const target = routePath[targetIndex];
            const current = currentPosRef.current;

            // Calculate distance to target
            const from = L.latLng(current);
            const to = L.latLng(target);
            const dist = from.distanceTo(to); // Meters

            let reachedTarget = false;

            if (dist > 100) {
                // Teleport
                setPosition(target);
                currentPosRef.current = target;
                reachedTarget = true;
            } else if (dist < 5) {
                // Reached target
                setPosition(target);
                currentPosRef.current = target;
                reachedTarget = true;
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

            if (reachedTarget) {
                // Check if this index was a stop
                checkForStop(targetIndex);
                advanceToNextPoint();
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(requestRef.current);
    }, [routePath, stops]); // Re-init if path changes

    if (!position) return null;

    return (
        <Marker position={position} icon={busIcon}>
            <Popup>
                <strong>{busId}</strong><br />
                Passengers: {passengers} / {BUS_CAPACITY}
            </Popup>
        </Marker>
    );
};

export default BusMarker;
