import React, { useState } from 'react';
import pkg from '../../package.json';

const MainMenu = ({ onStartGame }) => {
    // Menu States: 'main', 'settings', 'help'
    const [view, setView] = useState('main');

    // Settings States
    // Default language DE as requested
    const [language, setLanguage] = useState('de');
    const [customCapital, setCustomCapital] = useState('');

    // Texts
    const texts = {
        de: {
            title: "Real Bus Simulator",
            play: "Spiel Starten",
            settings: "Einstellungen",
            help: "Hilfe",
            back: "Zurück",
            language: "Sprache",
            capital: "Startkapital (Session)",
            capitalPlaceholder: "Standard (aus config.json)",
            infoTitle: "Über das Spiel",
            infoText: "Real Bus Simulator ist ein Open-Source-Projekt basierend auf OpenStreetMap-Daten. Entwickelt mit React & Vite.\n\nFür Jakob ❤️",
            helpTitle: "Spielanleitung",
            helpText: "Willkommen! Deine Aufgabe ist es, ein Busunternehmen zu führen. Dies ist eine einfache Simulation: Kaufe Busse, bediene Linien und transportiere Passagiere. Achte darauf, dass Haltestellen nicht überfüllt sind (>50 Wartende = Game Over)! Verdiene Geld durch Tickets und baue deine Flotte aus.",
            createdBy: "Erstellt von Lars Greipl mit Gemini 3 in Antigravity",
            version: "Version"
        },
        en: {
            title: "Real Bus Simulator",
            play: "Start Game",
            settings: "Settings",
            help: "Help",
            back: "Back",
            language: "Language",
            capital: "Start Capital (Session)",
            capitalPlaceholder: "Default (from config.json)",
            infoTitle: "About",
            infoText: "Real Bus Simulator is an open-source project based on OpenStreetMap data. Built with React & Vite.\n\nFor Jakob ❤️",
            helpTitle: "How to Play",
            helpText: "Welcome! Your task is to manage a bus company. This is a simple simulation: Buy buses, serve lines, and transport passengers. Ensure stops don't get overcrowded (>50 waiting = Game Over)! Earn money from tickets and expand your fleet.",
            createdBy: "Created by Lars Greipl with Gemini 3 in Antigravity",
            version: "Version"
        }
    };

    const t = texts[language];

    const handleStart = () => {
        const config = {
            language,
            startCapital: customCapital ? parseInt(customCapital, 10) : undefined
        };
        onStartGame(config);
    };

    // Shared Styles
    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
    };

    const buttonStyle = {
        padding: '15px 40px',
        margin: '10px',
        fontSize: '24px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        width: '300px',
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#333',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'transform 0.1s'
    };

    const inputStyle = {
        padding: '10px',
        fontSize: '18px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        width: '100%',
        marginTop: '5px',
        marginBottom: '15px'
    };

    const modalStyle = {
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '30px',
        borderRadius: '15px',
        maxWidth: '600px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.2)'
    };

    // --- VIEWS ---

    const renderMainMap = () => (
        <div style={containerStyle}>
            <h1 style={{ fontSize: '64px', marginBottom: '40px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>🚌 {t.title}</h1>

            <button style={buttonStyle} onClick={handleStart}>{t.play}</button>
            <button style={{ ...buttonStyle, fontSize: '20px', background: 'rgba(255, 255, 255, 0.7)' }} onClick={() => setView('settings')}>{t.settings}</button>
            <button style={{ ...buttonStyle, fontSize: '20px', background: 'rgba(255, 255, 255, 0.7)' }} onClick={() => setView('help')}>{t.help}</button>

            <div style={{ position: 'absolute', bottom: '20px', fontSize: '14px', opacity: 0.7 }}>
                {pkg.name} v{pkg.version}
            </div>
        </div>
    );

    const renderSettings = () => (
        <div style={containerStyle}>
            <div style={modalStyle}>
                <h2>{t.settings}</h2>

                <div style={{ textAlign: 'left', margin: '20px 0' }}>
                    <label><strong>{t.language}</strong></label>
                    <div style={{ marginTop: '5px', marginBottom: '15px' }}>
                        <button
                            style={{ padding: '8px', marginRight: '10px', background: language === 'de' ? '#4CAF50' : '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setLanguage('de')}>
                            Deutsch 🇩🇪
                        </button>
                        <button
                            style={{ padding: '8px', background: language === 'en' ? '#2196f3' : '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setLanguage('en')}>
                            English 🇬🇧
                        </button>
                    </div>

                    <label><strong>{t.capital}</strong></label>
                    <input
                        type="number"
                        placeholder={t.capitalPlaceholder}
                        value={customCapital}
                        onChange={(e) => setCustomCapital(e.target.value)}
                        style={inputStyle}
                    />

                    <hr style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />

                    <h3>{t.infoTitle}</h3>
                    <p style={{ lineHeight: '1.5', color: '#ddd' }}>{t.infoText}</p>
                    <p style={{ fontSize: '12px', color: '#aaa', marginTop: '10px' }}>{t.createdBy}</p>
                </div>

                <button style={{ ...buttonStyle, width: '200px', fontSize: '18px' }} onClick={() => setView('main')}>{t.back}</button>
            </div>
        </div>
    );

    const renderHelp = () => (
        <div style={containerStyle}>
            <div style={modalStyle}>
                <h2>{t.helpTitle}</h2>
                <p style={{ fontSize: '18px', lineHeight: '1.6', textAlign: 'justify', margin: '20px 0' }}>
                    {t.helpText}
                </p>
                <button style={{ ...buttonStyle, width: '200px', fontSize: '18px' }} onClick={() => setView('main')}>{t.back}</button>
            </div>
        </div>
    );

    if (view === 'settings') return renderSettings();
    if (view === 'help') return renderHelp();
    return renderMainMap();
};

export default MainMenu;
