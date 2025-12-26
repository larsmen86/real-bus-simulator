import React, { useState } from 'react';
import pkg from '../../package.json';
import { updateLocalBusData, fetchBusRoute } from '../services/api';
import { translations } from '../utils/translations';
import './Responsive.css';

const MainMenu = ({ onStartGame }) => {
    // Menu States: 'main', 'settings', 'help', 'map-selection'
    const [view, setView] = useState('main');

    // Settings States
    const [language, setLanguage] = useState('de');
    const [updating, setUpdating] = useState(false);
    const [updateMsg, setUpdateMsg] = useState("");

    // Map Selection State
    const [maps, setMaps] = useState([]);
    const [selectedMapId, setSelectedMapId] = useState(null);
    const [loadingMaps, setLoadingMaps] = useState(true);

    // Texts
    const texts = {
        de: {
            title: "Real Bus Simulator",
            play: "Spiel Starten",
            settings: "Einstellungen",
            help: "Hilfe",
            back: "Zurück",
            language: "Sprache",
            infoTitle: "Über das Spiel",
            infoText: "Real Bus Simulator ist ein Open-Source-Projekt basierend auf OpenStreetMap-Daten. Entwickelt mit React & Vite.\n\nFür Jakob ❤️",
            helpTitle: "Spielanleitung",
            helpText: "Willkommen! Deine Aufgabe ist es, ein Busunternehmen zu führen. Dies ist eine einfache Simulation: Kaufe Busse, bediene Linien und transportiere Passagiere. Achte darauf, dass Haltestellen nicht überfüllt sind (>50 Wartende = Game Over)! Verdiene Geld durch Tickets und baue deine Flotte aus.",
            createdBy: "Erstellt von Lars Greipl mit Gemini 3 in Antigravity",
            version: "Version",
            selectMap: "Karte wählen",
            loadingMaps: "Lade Karten...",
            noMapSelected: "Bitte wähle eine Karte!"
        },
        en: {
            title: "Real Bus Simulator",
            play: "Start Game",
            settings: "Settings",
            help: "Help",
            back: "Back",
            language: "Language",
            infoTitle: "About",
            infoText: "Real Bus Simulator is an open-source project based on OpenStreetMap data. Built with React & Vite.\n\nFor Jakob ❤️",
            helpTitle: "How to Play",
            helpText: "Welcome! Your task is to manage a bus company. This is a simple simulation: Buy buses, serve lines, and transport passengers. Ensure stops don't get overcrowded (>50 waiting = Game Over)! Earn money from tickets and expand your fleet.",
            createdBy: "Created by Lars Greipl with Gemini 3 in Antigravity",
            version: "Version",
            selectMap: "Select Map",
            loadingMaps: "Loading maps...",
            noMapSelected: "Please select a map!"
        }
    };

    const t = { ...texts[language], ...translations[language] };

    const checkAllMaps = async (mapList) => {
        setUpdating(true);
        setUpdateMsg("Prüfe Kartendaten...");

        const updatedMaps = [...mapList];
        let changed = false;

        for (let i = 0; i < updatedMaps.length; i++) {
            const map = updatedMaps[i];
            try {
                setUpdateMsg(`Prüfe Daten für ${map.name}...`);

                // Fetch config for this map
                const configRes = await fetch(`/maps/${map.file}`);
                if (!configRes.ok) throw new Error(`Config load failed for ${map.name}`);
                const conf = await configRes.json();

                // MERGE METADATA into map object if available in config
                if (conf.description) {
                    map.description = conf.description;
                    changed = true;
                }
                if (conf.author) {
                    map.author = conf.author;
                    changed = true;
                }

                // Check/Fetch Data (DB -> LocalStorage -> API)
                await fetchBusRoute(map.id, conf.overpass.bbox, conf.overpass.queryRegex);

            } catch (err) {
                console.error(`Error checking map ${map.name}:`, err);
            }
        }

        if (changed) setMaps(updatedMaps);

        setUpdateMsg(t.updateSuccess);

        // Clear message after 3 seconds
        setTimeout(() => {
            setUpdating(false);
            setUpdateMsg("");
        }, 3000);
    };

    // Fetch Maps on Mount
    React.useEffect(() => {
        const loadMaps = async () => {
            try {
                const res = await fetch('/maps/maps.json');
                if (!res.ok) throw new Error("Failed to load maps list");
                const list = await res.json();
                setMaps(list);
                if (list.length > 0) setSelectedMapId(list[0].id);

                // Trigger data check for all maps
                checkAllMaps(list);

            } catch (e) {
                console.error("Maps load error:", e);
                setUpdateMsg("Fehler beim Laden der Kartenliste");
            } finally {
                setLoadingMaps(false);
            }
        };
        loadMaps();
    }, []);

    const handleStart = () => {
        const selectedMap = maps.find(m => m.id === selectedMapId);
        if (!selectedMap) {
            alert(t.noMapSelected);
            return;
        }

        const config = {
            language,
            mapId: selectedMap.id,
            mapConfigUrl: `/maps/${selectedMap.file}`
        };
        onStartGame(config);
    };

    const handleOpenMapSelection = () => {
        setView('map-selection');
    };

    const [loadingDebug, setLoadingDebug] = useState(false);
    const [debugData, setDebugData] = useState(null);

    const handleCheckDebug = async () => {
        setLoadingDebug(true);
        setDebugData(null);
        try {
            // Check debug for selected map if possible, else default
            const mapIdParam = selectedMapId || 'default';
            const res = await fetch(`/api/bus_data_debug?mapId=${mapIdParam}`);
            if (!res.ok) throw new Error("Fetch failed");
            const data = await res.json();
            setDebugData(data);
        } catch (err) {
            setDebugData({ error: "Fehler beim Laden (Server läuft?)" });
        } finally {
            setLoadingDebug(false);
        }
    };

    // Styles are now handled in Responsive.css

    // --- VIEWS ---

    const renderMainMap = () => (
        <div className="main-menu-container">
            <h1 className="main-menu-title">🚌 {t.title}</h1>

            <button className="menu-button" onClick={handleOpenMapSelection}>{t.play}</button>
            <button className="menu-button secondary" onClick={() => setView('settings')}>{t.settings}</button>
            <button className="menu-button secondary" onClick={() => setView('help')}>{t.help}</button>

            <div style={{ marginTop: '20px', fontSize: '16px', color: '#ccc' }}>
                {updating ? "🔄 " + t.updating : updateMsg === t.updateSuccess ? "✅ " + t.updateSuccess : updateMsg}
            </div>

            <div style={{ position: 'absolute', bottom: '20px', fontSize: '14px', opacity: 0.7 }}>
                {pkg.name} v{pkg.version}
            </div>
        </div>
    );

    const renderMapSelection = () => (
        <div className="main-menu-container">
            <h2 style={{ fontSize: '48px', marginBottom: '30px' }}>{t.selectMap}</h2>

            <div className="map-selection-box">
                {loadingMaps ? <p>{t.loadingMaps}</p> : (
                    <table className="map-table">
                        <thead>
                            <tr>
                                <th>{t.mapName}</th>
                                <th>{t.mapDescription}</th>
                                <th>{t.mapAuthor}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maps.map(map => (
                                <tr
                                    key={map.id}
                                    onClick={() => setSelectedMapId(map.id)}
                                    className={`map-row ${selectedMapId === map.id ? 'selected' : ''}`}
                                >
                                    <td style={{ fontWeight: 'bold' }}>{map.name}</td>
                                    <td>{map.description}</td>
                                    <td style={{ fontSize: '0.9em', color: '#ccc' }}>{map.author || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <button className="menu-button primary" onClick={handleStart}>{t.play}</button>
            <button className="menu-button secondary" onClick={() => setView('main')}>{t.back}</button>
        </div>
    );

    const handleReloadAllMaps = async () => {
        setUpdating(true);
        setUpdateMsg(t.reloading);

        try {
            for (const map of maps) {
                setUpdateMsg(`Update ${map.name}...`);
                const configRes = await fetch(`/maps/${map.file}`);
                const conf = await configRes.json();
                await updateLocalBusData(map.id, conf.overpass.bbox, conf.overpass.queryRegex);
            }
            setUpdateMsg(t.updateSuccess);
        } catch (e) {
            console.error(e);
            setUpdateMsg(t.updateError);
        } finally {
            setTimeout(() => {
                setUpdating(false);
                setUpdateMsg("");
            }, 2000);
        }
    };

    const renderSettings = () => (
        <div className="main-menu-container">
            <div className="menu-modal">
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

                    <button
                        className="menu-button"
                        style={{ width: '100%', fontSize: '16px', background: '#2196F3', color: 'white', marginTop: '10px', padding: '10px' }}
                        onClick={handleReloadAllMaps}
                        disabled={updating}
                    >
                        {updating ? t.reloading : t.reloadMaps}
                    </button>

                    <hr style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />

                    <h3>Bus Data Debugger</h3>
                    <button
                        className="menu-button"
                        style={{ width: '100%', fontSize: '16px', background: '#FF9800', color: 'white', marginTop: '10px', padding: '10px' }}
                        onClick={handleCheckDebug}
                    >
                        {loadingDebug ? "Lade..." : "Cache Prüfen"}
                    </button>

                    {debugData && !debugData.error && (
                        <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', fontSize: '12px', textAlign: 'left', overflowX: 'auto' }}>
                            <p><strong>Zeitstempel:</strong> {new Date(debugData.timestamp).toLocaleString()}</p>
                            <p><strong>Map ID:</strong> {debugData.mapId}</p>
                            <p><strong>Größe:</strong> {debugData.sizeFormatted} ({debugData.dataSize} bytes)</p>
                            <p><strong>Vorschau:</strong></p>
                            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>{debugData.dataPreview}</pre>
                            {debugData.dataSize > 1024 * 1024 && <p style={{ color: 'orange', fontWeight: 'bold' }}>⚠️ Datei &gt; 1MB</p>}
                        </div>
                    )}
                    {debugData && debugData.error && (
                        <div style={{ marginTop: '15px', color: 'red' }}>{debugData.error}</div>
                    )}


                    <div style={{ height: '10px' }}></div>

                    <h3>{t.infoTitle}</h3>
                    <p style={{ lineHeight: '1.5', color: '#ddd' }}>{t.infoText}</p>
                    <p style={{ fontSize: '12px', color: '#aaa', marginTop: '10px' }}>{t.createdBy}</p>
                </div>

                <button className="menu-button secondary" onClick={() => setView('main')}>{t.back}</button>
            </div>
        </div>
    );

    const renderHelp = () => (
        <div className="main-menu-container">
            <div className="menu-modal">
                <h2>{t.helpTitle}</h2>
                <p style={{ fontSize: '18px', lineHeight: '1.6', textAlign: 'justify', margin: '20px 0' }}>
                    {t.helpText}
                </p>
                <button className="menu-button secondary" onClick={() => setView('main')}>{t.back}</button>
            </div>
        </div>
    );

    if (view === 'settings') return renderSettings();
    if (view === 'help') return renderHelp();
    if (view === 'map-selection') return renderMapSelection();
    return renderMainMap();
};

export default MainMenu;
