import React, { useState } from 'react';
import MapComponent from './components/Map';
import MainMenu from './components/MainMenu';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({});

  const handleStartGame = (config) => {
    setSessionConfig(config);
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setSessionConfig({}); // Optional: reset config
  };

  return (
    <div className="App">
      <ErrorBoundary>
        {!gameStarted ? (
          <MainMenu onStartGame={handleStartGame} />
        ) : (
          <MapComponent sessionConfig={sessionConfig} onBackToMenu={handleBackToMenu} />
        )}
      </ErrorBoundary>
    </div>
  );
}

export default App;
