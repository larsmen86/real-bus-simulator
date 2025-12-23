import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: '#1e1e1e', color: '#ff6b6b',
                    padding: '20px', fontFamily: 'monospace', zIndex: 9999, overflow: 'auto'
                }}>
                    <h1 style={{ borderBottom: '1px solid #ff6b6b', paddingBottom: '10px' }}>⚠️ Simulation Crash Detected</h1>

                    <div style={{ margin: '20px 0', fontSize: '1.2em', fontWeight: 'bold' }}>
                        {this.state.error && this.state.error.toString()}
                    </div>

                    <div style={{ backgroundColor: '#111', padding: '15px', borderRadius: '5px', border: '1px solid #444' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#888' }}>Component Stack Trace:</h3>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#ccc', fontSize: '0.9em' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px', padding: '12px 24px',
                            fontSize: '16px', cursor: 'pointer',
                            backgroundColor: '#4CAF50', color: 'white',
                            border: 'none', borderRadius: '4px', fontWeight: 'bold'
                        }}
                    >
                        🔄 Reboot System
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
