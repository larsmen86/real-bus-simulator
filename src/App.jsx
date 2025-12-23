import React from 'react';
import MapComponent from './components/Map';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <MapComponent />
      </ErrorBoundary>
    </div>
  );
}

export default App;
