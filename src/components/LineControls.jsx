import React from 'react';

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
    eventConfig // New prop
}) => {

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
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '320px', // Wider implementation
            maxHeight: '90vh',
            overflowY: 'auto'
        }}>
            {/* GAME HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Money</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: money < 1000 ? '#d32f2f' : '#388e3c' }}>{money} €</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Passengers</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalPassengers}</div>
                </div>
            </div>

            {/* MOVED TO BOTTOM */}


            {error && (
                <div style={{ color: 'red', fontSize: '12px', marginBottom: '10px' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {loading && !error && <p style={{ fontSize: '14px', color: '#666' }}>Loading lines...</p>}

            {!loading && routes.length === 0 && !error && <p>No lines found.</p>}

            {/* Line Controls */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>Bus Management</h4>
                {routes.map(route => {
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
                                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Line {route.ref}</div>
                                        <div style={{ fontSize: '10px', color: '#888' }}>{lineFleet.length} active</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    onClick={() => onBuyBus(route.ref, 'standard')}
                                    disabled={money < busCostStd}
                                    title="Standard Bus (50 pax)"
                                    style={{
                                        flex: 1,
                                        background: money >= busCostStd ? '#2196f3' : '#e0e0e0',
                                        color: 'white', border: 'none', borderRadius: '4px',
                                        padding: '5px', cursor: money >= busCostStd ? 'pointer' : 'not-allowed',
                                        fontSize: '11px'
                                    }}
                                >
                                    + Bus ({busCostStd}€)
                                </button>
                                <button
                                    onClick={() => onBuyBus(route.ref, 'articulated')}
                                    disabled={money < busCostArt}
                                    title="Gelenkbus (100 pax)"
                                    style={{
                                        flex: 1,
                                        background: money >= busCostArt ? '#673ab7' : '#e0e0e0',
                                        color: 'white', border: 'none', borderRadius: '4px',
                                        padding: '5px', cursor: money >= busCostArt ? 'pointer' : 'not-allowed',
                                        fontSize: '11px'
                                    }}
                                >
                                    + Gelenk ({busCostArt}€)
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Bus Live Stats */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>Fleet Status ({activeBuses.length})</h4>
                {activeBuses.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>No buses active.</p> : (
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#888' }}>
                                <th>Bus</th>
                                <th>Load</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeBuses.map((bus, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>Critical Stops ({'>'}50 = Loose)</h4>
                {topStops.length === 0 ? <p style={{ fontSize: '12px', color: '#999' }}>Empty streets.</p> : (
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#888' }}>
                                <th>Stop</th>
                                <th>Wait</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topStops.map(([stopId, count]) => {
                                const info = stopInfo[stopId] || { name: 'Unknown', lines: new Set() };
                                const lineStr = Array.from(info.lines).join(', ');

                                return (
                                    <tr key={stopId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '4px 0', whiteSpace: 'nowrap', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div>{info.name}</div>
                                            <div style={{ fontSize: '10px', color: '#666' }}>Line: {lineStr}</div>
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

            {/* EVENT TRIGGER (Moved to Bottom) */}
            <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '2px solid #eee', paddingTop: '15px' }}>
                {eventConfig && (
                    <button
                        onClick={onTriggerEvent}
                        style={{
                            background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px',
                            padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        {eventConfig.emoji} {eventConfig.name} ({eventConfig.buttonText})
                    </button>
                )}
            </div>
        </div>
    );
};

export default LineControls;
