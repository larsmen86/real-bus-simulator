import React from 'react';

const LineControls = ({ routes, busCounts, onUpdateBusCount, loading, error }) => {
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
            minWidth: '200px'
        }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Bus Manager</h3>

            {error && (
                <div style={{ color: 'red', fontSize: '12px', marginBottom: '10px' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {loading && !error && <p style={{ fontSize: '14px', color: '#666' }}>Loading lines... (Waiting for API)</p>}

            {!loading && routes.length === 0 && !error && <p>No lines found.</p>}

            {routes.map(route => (
                <div key={route.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: route.color,
                            marginRight: '8px'
                        }}></span>
                        <strong>Line {route.ref}</strong>
                    </div>
                    <div>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={busCounts[route.ref] || 0}
                            onChange={(e) => onUpdateBusCount(route.ref, parseInt(e.target.value))}
                            style={{ width: '50px', marginLeft: '10px' }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LineControls;
