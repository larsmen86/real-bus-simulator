import React, { useEffect } from 'react';

const Notification = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto close after 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    if (!message) return null;

    const getStyles = () => {
        const base = {
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '15px 25px',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
            zIndex: 3000,
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            textAlign: 'center',
            minWidth: '300px',
            animation: 'slideDown 0.5s ease-out'
        };

        switch (type) {
            case 'event':
                return { ...base, background: 'rgba(255, 69, 58, 0.85)' }; // Red-ish for events
            case 'success':
                return { ...base, background: 'rgba(50, 205, 50, 0.85)' }; // Green for success
            case 'error':
                return { ...base, background: 'rgba(255, 0, 0, 0.85)' }; // Red for error
            default:
                return { ...base, background: 'rgba(30, 30, 30, 0.85)' }; // Dark default
        }
    };

    return (
        <div style={getStyles()}>
            {type === 'event' && <span style={{ marginRight: '10px', fontSize: '20px' }}>📢</span>}
            {message}
        </div>
    );
};

export default Notification;
