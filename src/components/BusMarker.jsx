import React, { useEffect, useState, useRef, useCallback } from 'react';
import { translations } from '../utils/translations';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Constants
const SPEED_MPS = 80; // Approx 80 km/h (effectively new 1x)

// Dynamic Icon Generator
const createBusIcon = (loadPercentage, type) => {
    // Colors
    let color = '#4CAF50'; // Green (< 50%)
    if (loadPercentage > 0.9) color = '#F44336'; // Red (> 90%)
    else if (loadPercentage > 0.5) color = '#FFC107'; // Yellow (> 50%)

    // Size/Shape
    const width = type === 'articulated' ? 44 : 32;
    const height = 32;

    // Scale for articulation or simple stretch
    // Note: The icon is square (512x512). We stretch/fit it.

    const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <!-- Background Circle for visibility -->
        <circle cx="256" cy="256" r="256" fill="white" opacity="0.8"/>
        <!-- Bus Icon -->
        <path d="M400,32H112A48,48,0,0,0,64,80V400a47.91,47.91,0,0,0,16,35.74V454a26,26,0,0,0,26,26h28a26,26,0,0,0,26-26v-6H352v6a26,26,0,0,0,26,26h28a26,26,0,0,0,26-26V435.74A47.91,47.91,0,0,0,448,400V80A48,48,0,0,0,400,32ZM147.47,399.82a32,32,0,1,1,28.35-28.35A32,32,0,0,1,147.47,399.82ZM236,288H112a16,16,0,0,1-16-16V144a16,16,0,0,1,16-16H236a4,4,0,0,1,4,4V284A4,4,0,0,1,236,288ZM256,96H112.46c-8.6,0-16-6.6-16.44-15.19A16,16,0,0,1,112,64H399.54c8.6,0,16,6.6,16.44,15.19A16,16,0,0,1,400,96H256Zm20,32H400a16,16,0,0,1,16,16V272a16,16,0,0,1-16,16H276a4,4,0,0,1-4-4V132A4,4,0,0,1,276,128Zm60.18,243.47a32,32,0,1,1,28.35,28.35A32,32,0,0,1,336.18,371.47Z" 
            fill="${color}" stroke="black" stroke-width="10"/>
        
        ${type === 'articulated' ? '<rect x="460" y="100" width="40" height="300" fill="#666" rx="20" />' : ''}
    </svg>
    `;

    return new L.DivIcon({
        className: 'custom-bus-icon',
        html: svg,
        iconSize: [width, height],
        iconAnchor: [width / 2, height / 2],
        popupAnchor: [0, -height / 2]
    });
};

const BusMarker = ({ routePath, stops, busId, startProgress = 0, onArriveAtStop, onStatusUpdate, capacity = 50, type = 'standard', simulationSpeed = 1, isPaused = false, language = 'de' }) => {
    const t = translations[language];
    const [position, setPosition] = useState(null);
    const [passengers, setPassengers] = useState(0);
    const passengersRef = useRef(0);

    // Refs for callbacks
    const onArriveAtStopRef = useRef(onArriveAtStop);
    const onStatusUpdateRef = useRef(onStatusUpdate);

    // Refs for simulation state to avoid re-triggering main effect
    const simulationSpeedRef = useRef(simulationSpeed);
    const isPausedPropRef = useRef(isPaused);

    useEffect(() => {
        simulationSpeedRef.current = simulationSpeed;
        isPausedPropRef.current = isPaused;
    }, [simulationSpeed, isPaused]);

    useEffect(() => {
        onArriveAtStopRef.current = onArriveAtStop;
        onStatusUpdateRef.current = onStatusUpdate;
    }, [onArriveAtStop, onStatusUpdate]);

    // Report status & icon update
    useEffect(() => {
        if (onStatusUpdateRef.current) {
            onStatusUpdateRef.current(busId, passengers, capacity);
        }
    }, [passengers, busId, capacity]);

    // Refs
    const requestRef = useRef();
    const startTimeRef = useRef();
    const currentPosRef = useRef(null);
    const nextPointIndexRef = useRef(1);
    const directionRef = useRef(1);
    const isPausedRef = useRef(false);
    const lastStopIdRef = useRef(null);
    const watchdogRef = useRef(null);
    const hasSpawnedRef = useRef(false);

    // Handle Stop Logic
    const handleStop = useCallback((stop) => {
        isPausedRef.current = true;
        lastStopIdRef.current = stop.id;

        if (watchdogRef.current) clearTimeout(watchdogRef.current);

        const currentPax = passengersRef.current;

        // 1. Alight random passengers (10-30%)
        const alightingCount = Math.floor(currentPax * (0.1 + Math.random() * 0.2));
        const afterAlight = Math.max(0, currentPax - alightingCount);

        // 2. Boarding
        let boarded = 0;
        try {
            if (onArriveAtStopRef.current) {
                boarded = onArriveAtStopRef.current(stop.id, afterAlight, capacity);
            }
        } catch (e) {
            console.error("Boarding error:", e);
        }

        const newTotal = afterAlight + boarded;

        passengersRef.current = newTotal;
        setPassengers(newTotal);

        setTimeout(() => {
            isPausedRef.current = false;
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
        }, 1000 / simulationSpeedRef.current);

        watchdogRef.current = setTimeout(() => {
            if (isPausedRef.current) {
                console.warn(`Bus ${busId} stuck. Force resuming!`);
                isPausedRef.current = false;
            }
        }, 5000);
    }, [busId, capacity]);


    useEffect(() => {
        // Initialize Position ONCE (or when route changes)
        if (!currentPosRef.current && routePath && routePath.length > 0) {
            const totalPoints = routePath.length;
            const startIndex = Math.floor(totalPoints * startProgress);
            const safeIndex = Math.max(0, Math.min(startIndex, totalPoints - 2));
            const start = routePath[safeIndex];

            setPosition(start);
            currentPosRef.current = start;
            nextPointIndexRef.current = safeIndex + 1;

            // Check spawn stop
            if (!hasSpawnedRef.current && stops) {
                const spawnStop = stops.find(s => s.pathIndex === startIndex);
                if (spawnStop) {
                    handleStop(spawnStop);
                }
                hasSpawnedRef.current = true;
            }
        }

        const advanceToNextPoint = () => {
            let nextIdx = nextPointIndexRef.current + directionRef.current;
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
            const stop = stops.find(s => s.pathIndex === currentIndex);
            if (stop && !isPausedRef.current) {
                if (lastStopIdRef.current === stop.id) return;
                handleStop(stop);
            } else if (!stop) {
                if (lastStopIdRef.current) lastStopIdRef.current = null;
            }
        };

        const animate = (time) => {
            if (!startTimeRef.current) startTimeRef.current = time;

            // Global Pause OR Bus at Stop Pause
            if (isPausedPropRef.current || isPausedRef.current) {
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const targetIndex = nextPointIndexRef.current;
            // Safety check
            if (!routePath || routePath.length === 0) return;

            if (targetIndex < 0 || targetIndex >= routePath.length) {
                advanceToNextPoint();
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const target = routePath[targetIndex];
            const current = currentPosRef.current || routePath[0]; // Fallback

            if (!target || !current) {
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const from = L.latLng(current);
            const to = L.latLng(target);
            const dist = from.distanceTo(to);

            let reachedTarget = false;

            if (dist > 100) {
                setPosition(target);
                currentPosRef.current = target;
                reachedTarget = true;
            } else if (dist < 5) {
                setPosition(target);
                currentPosRef.current = target;
                reachedTarget = true;
            } else {
                const moveDist = SPEED_MPS * simulationSpeedRef.current * (1 / 60);
                const ratio = moveDist / dist;
                const newPos = [
                    current[0] + (target[0] - current[0]) * ratio,
                    current[1] + (target[1] - current[1]) * ratio
                ];
                currentPosRef.current = newPos;
                setPosition(newPos);
            }

            if (reachedTarget) {
                checkForStop(targetIndex);
                advanceToNextPoint();
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [routePath, stops, handleStop]); // Removed isPaused and simulationSpeed from deps

    // Dynamic Icon Logic
    const loadPct = capacity > 0 ? passengers / capacity : 0;

    // Memoize icon to prevent recreation on every render if load/type hasn't changed
    const icon = React.useMemo(() => createBusIcon(loadPct, type), [loadPct, type]);

    if (!position) return null;

    return (
        <Marker position={position} icon={icon}>
            <Popup>
                <strong>{busId}</strong> {type === 'articulated' ? `(${t.articulated})` : ''}<br />
                {t.passengers}: {passengers} / {capacity}
            </Popup>
        </Marker>
    );
};

export default React.memo(BusMarker);
