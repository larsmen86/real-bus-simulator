import React from 'react';
import { translations } from '../utils/translations';

const LineControls = ({
    routes,
    fleet,
    onBuyBus,
    onTriggerEvent,
    loading,
    error,
    busStats,
    waitingPassengers,
    money,
    totalPassengers,
    busCostStd,
    busCostArt,
    eventConfig, // New prop
    simulationSpeed,
    setSimulationSpeed,
    isPaused,
    setIsPaused,
    language = 'de',
    onZoomToStop, // New prop
    onZoomToBus   // New prop
}) => {
    const t = translations[language];

    // Sort stops by waiting count (Top 5)
    const stopInfo = {};
    routes.forEach(r => {
        r.stops.forEach(s => {
            if (!stopInfo[s.id]) {
                stopInfo[s.id] = { name: s.name, lines: new Set() };
            }
            stopInfo[s.id].lines.add(r.ref);
        });
    });

    const topStops = Object.entries(waitingPassengers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .filter(([, count]) => count > 0);

    const activeBuses = Object.values(busStats || {}).sort((a, b) => a.line.localeCompare(b.line));

    return (
        <>
            {/* LEFT PANEL: CONTROLS & MANAGEMENT */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 9999, // Bumped z-index
                minWidth: '300px',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {/* Money Header */}
                <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>{t.money}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: money < 1000 ? '#d32f2f' : '#388e3c' }}>{money} €</div>
                </div>

                {/* Simulation Controls */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        style={{
                            padding: '10px',
                            background: isPaused ? '#4caf50' : '#ff9800',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontWeight: 'bold', flex: 1
                        }}
                    >
                        {isPaused ? `▶ ${t.resume}` : `⏸ ${t.pause}`}
                    </button>
                    <button
                        onClick={() => setSimulationSpeed(s => s === 1 ? 2 : 1)}
                        style={{
                            padding: '10px',
                            background: '#2196f3',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontWeight: 'bold', flex: 1
                        }}
                    >
                        {simulationSpeed}x {t.speed}
                    </button>
                </div>

                {/* Line Controls (Bus Management) */}
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>{t.busManagement}</h4>

                    {loading && !error && <p style={{ fontSize: '14px', color: '#666' }}>{t.loadingLines}</p>}
                    {!loading && routes.length === 0 && !error && <p>{t.noLines}</p>}

                    {[...routes].sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true })).map(route => {
                        const lineFleet = fleet[route.ref] || [];
                        return (
                            <div key={route.id} style={{ marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{
                                            display: 'inline-block', width: '12px', height: '12px',
                                            borderRadius: '50%', background: route.color, marginRight: '8px'
                                        }}></span>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{t.line} {route.ref}</div>
                                            <div style={{ fontSize: '10px', color: '#888' }}>{lineFleet.length} {t.active}</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={() => onBuyBus(route.ref, 'standard')}
                                        disabled={money < busCostStd}
                                        title={t.stdTitle}
                                        style={{
                                            flex: 1,
                                            background: money >= busCostStd ? '#2196f3' : '#e0e0e0',
                                            color: 'white', border: 'none', borderRadius: '4px',
                                            padding: '5px', cursor: money >= busCostStd ? 'pointer' : 'not-allowed',
                                            fontSize: '11px'
                                        }}
                                    >
                                        {t.buyStd} ({busCostStd}€)
                                    </button>
                                    <button
                                        onClick={() => onBuyBus(route.ref, 'articulated')}
                                        disabled={money < busCostArt}
                                        title={t.artTitle}
                                        style={{
                                            flex: 1,
                                            background: money >= busCostArt ? '#673ab7' : '#e0e0e0',
                                            color: 'white', border: 'none', borderRadius: '4px',
                                            padding: '5px', cursor: money >= busCostArt ? 'pointer' : 'not-allowed',
                                            fontSize: '11px'
                                        }}
                                    >
                                        {t.buyArt} ({busCostArt}€)
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* EVENT TRIGGER */}
                <div style={{ marginTop: '20px' }}>
                    {eventConfig && (
                        <button
                            onClick={onTriggerEvent}
                            style={{
                                background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px',
                                padding: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >
                            {eventConfig.emoji} {eventConfig.name}
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: STATS */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 9999, // Bumped z-index
                minWidth: '300px', // Wider implementation
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {/* GAME HEADER */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>{t.passengers}</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalPassengers}</div>
                    </div>
                </div>

                {error && (
                    <div style={{ color: 'red', fontSize: '12px', marginBottom: '10px' }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Bus Live Stats */}
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>{t.fleetStatus} ({activeBuses.length})</h4>
                    {activeBuses.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>{t.noBuses}</p> : (
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: '#888' }}>
                                    <th>{t.bus}</th>
                                    <th>{t.load}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeBuses.map((bus, idx) => (
                                    <tr
                                        key={idx}
                                        style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log("Clicked bus:", bus.id);
                                            if (onZoomToBus) onZoomToBus(bus.id);
                                            else console.error("onZoomToBus prop is missing!");
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start prop
                                        title={t.jumpToBus || "Click to jump to bus"}
                                    >
                                        <td style={{ padding: '4px 0' }}>
                                            {bus.id} <span style={{ fontSize: '9px', color: '#999' }}>({bus.capacity})</span>
                                        </td>
                                        <td style={{ padding: '4px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ width: '35px', fontSize: '10px' }}>{bus.passengers}/{bus.capacity}</span>
                                                <div style={{ flex: 1, height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden', marginLeft: '5px' }}>
                                                    <div style={{
                                                        width: `${Math.min(100, (bus.passengers / bus.capacity) * 100)}%`,
                                                        height: '100%',
                                                        background: (bus.passengers / bus.capacity) > 0.9 ? '#ff4444' : ((bus.passengers / bus.capacity) > 0.5 ? '#ffbb33' : '#44bb44')
                                                    }}></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Waiting Passengers */}
                <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>{t.criticalStops}</h4>
                    {topStops.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>{t.emptyStreets}</p> : (
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: '#888' }}>
                                    <th>{t.stop}</th>
                                    <th>{t.wait}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topStops.map(([stopId, count]) => {
                                    const info = stopInfo[stopId] || { name: 'Unknown', lines: new Set() };
                                    const lineStr = Array.from(info.lines).join(', ');

                                    return (
                                        <tr
                                            key={stopId}
                                            style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("Clicked stop:", stopId);
                                                if (onZoomToStop) onZoomToStop(stopId);
                                                else console.error("onZoomToStop prop is missing!");
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            title={t.zoomToStop || "Click to zoom to stop"}
                                        >
                                            <td style={{ padding: '4px 0', whiteSpace: 'nowrap', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <div>{info.name}</div>
                                                <div style={{ fontSize: '10px', color: '#666' }}>{t.line}: {lineStr}</div>
                                            </td>
                                            <td style={{
                                                padding: '4px 0',
                                                fontWeight: 'bold',
                                                verticalAlign: 'top',
                                                color: count > 40 ? 'red' : (count > 25 ? 'orange' : 'black')
                                            }}>
                                                {count}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
};

export default LineControls;
