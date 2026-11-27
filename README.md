# UrbanMystery
PWA táctica de investigación, laberintos interactivos y trampas. HTML, CSS y JavaScript modernos sin dependencias externas.

## Sistema Táctico: Laberintos y Trampas
- **Mecánica central de Laberintos con Trampas**: Cada caso y sector es un laberinto táctico con muros, trampas activas `[T]`, compuertas blindadas `[D]`, tarjetas de acceso `[K]`, objetivos clasificados `[C]` y puntos de extracción `[G]`.
- **Reserva de Aura y Daño por Trampas**: El agente cuenta con 100% de reserva de Aura. Caer en sensores, baldosas electrificadas, nopales punzantes o charcos cáusticos drena un 25% de aura con sacudida de pantalla. Agotar el aura reinicia el sector.
- **Niebla de Investigación (Fog of War)**: Los sectores nocturnos y conductos ocultan el mapa fuera del radio de visión de la linterna táctica, revelando el terreno a medida que se avanza.
- **Estética Vectorial Noir / Cyber-Detective**: Sin emojis infantiles ni tarjetas estáticas. Iconos SVG vectoriales limpios y estilizados.
- **Lore Urbano 2026**:
  - Caso 04: **Pozole** (el mítico lavadero de Neza, jabón Zote cáustico, trebejos y ollas al fogón).
  - Caso 05: **Destornillador** (el taller clandestino de virutas, prensas y calibración del dado de 20 caras).
  - Caso 02: **La señal de Las Pérdidas** (el cerro de los nopales, barrancos en la noche y antena de radio).
  - Casos 01, 03 y 06 con intriga, la bóveda de cristal y Chiwis.

## Ejecutar en local
1. En la carpeta del proyecto, ejecuta:
   ```powershell
   python -m http.server 8000
   ```
2. Abre `http://localhost:8000` en Chrome o Edge.
