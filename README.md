# Real Bus Simulator 🚌

Ein Open-Source Bussimulator basierend auf echten OpenStreetMap-Daten. Starte in Kaiserslautern, manage deine Flotte und transportiere Passagiere in Echtzeit!

## 🌟 Features

*   **Realistische Karte**: Nutzt OpenStreetMap Daten für Straßen und Haltestellen.
*   **Live Simulation**: Busse bewegen sich in Echtzeit auf den echten Routen.
*   **Wirtschaftssystem**: Verdiene Geld durch Ticketverkäufe, kaufe neue Busse (Standard & Gelenkbusse).
*   **Passagier-Management**: Passagiere sammeln sich an Haltestellen. Überfüllte Haltestellen (>50 Wartende) führen zum Spielverlust!
*   **Events**: Löse Events aus (z.B. "FCK Heimspiel"), die für massiven Passagieransturm sorgen.
*   **Highscores**: Speichere deine besten Ergebnisse lokal.
*   **Anpassbar**: Konfiguriere Startkapital, Stadt, Zoom-Level und Events einfach über `public/config.json`.

## 🚀 Installation & Start

Stelle sicher, dass du [Node.js](https://nodejs.org/) installiert hast.

1.  **Repository klonen**
    ```bash
    git clone https://github.com/DEIN_USERNAME/real-bus-simulator.git
    cd real-bus-simulator
    ```

2.  **Abhängigkeiten installieren**
    ```bash
    npm install
    ```

3.  **Simulator starten**
    ```bash
    npm run dev
    ```
    Öffne dann `http://localhost:5173` in deinem Browser.

## ⚙️ Konfiguration

Du kannst das Spiel in `public/config.json` anpassen:

*   **Startkapital**: Ändere `"startCapital"`, um leichter oder schwerer zu starten.
*   **Stadt**: Ändere `cityName`, `mapCenter` und `overpass.bbox`, um in einer anderen Stadt zu spielen (erfordert gültige OSM Relationen für Buslinien).
*   **Events**: Passe Name, Emoji und Passagierzahl der Events an.

## 🎮 Steuerung

*   **Linkes Panel**:
    *   **Pause / Speed**: Pausiere das Spiel oder spule vor (1x = Schnell, 2x = Sehr Schnell).
    *   **Bus Kaufen**: Kaufe Standardbusse (50 Plätze) oder Gelenkbusse (100 Plätze) für deine Linien.
    *   **Events**: Starte Events manuell.
*   **Rechtes Panel**:
    *   **Statistiken**: Behalte die Gesamtzahl der Passagiere und den Status deiner Flotte im Auge.
    *   **Kritische Haltestellen**: Warnung bei zu vielen wartenden Fahrgästen.

## 🤝 Mitwirken

Pull Requests sind willkommen! Für größere Änderungen eröffne bitte zuerst ein Issue, um darüber zu diskutieren.

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.
