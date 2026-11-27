# UrbanMystery
PWA táctica de investigación, laberintos interactivos y trampas. HTML, CSS y JavaScript modernos sin dependencias externas.

## Sistema Táctico: Laberintos y Trampas
- **Mecánica central de Laberintos con Trampas**: Cada caso y sector es un laberinto táctico con muros, trampas activas `[T]`, compuertas blindadas `[D]`, tarjetas de acceso `[K]`, objetivos clasificados `[C]` y puntos de extracción `[G]`.
- **Reserva de Aura y Daño por Trampas**: El agente cuenta con 100% de reserva de Aura. Caer en sensores, baldosas electrificadas o charcos cáusticos drena un 25% de aura con sacudida de pantalla. Agotar el aura reinicia el sector.
- **Niebla de Investigación (Fog of War)**: Los sectores nocturnos y conductos ocultan el mapa fuera del radio de visión de la linterna táctica, revelando el terreno a medida que se avanza.
- **Estética Vectorial Noir / Cyber-Detective**: Sin emojis infantiles ni tarjetas estáticas. Iconos SVG vectoriales limpios y estilizados.
- **Casos de Investigación**:
  - Caso 01: **El misterio de las migajas** (archivo prohibido, conductos y cámara acorazada).
  - Caso 02: **La estación fantasma** (el andén clausurado, drenajes en penumbra y el centro de mando subterráneo).
  - Caso 03: **La bóveda del Aura 2026** (anillo perimetral, piso electrificado y santuario de la corona).
  - Caso 04: **Pozole** (el patio de lavado de Neza, trebejos y fogón maestro).
  - Caso 05: **Destornillador** (el taller clandestino de virutas, prensas y calibración del dado de 20 caras).
  - Caso 06: **Chiwis y el enigma limpio y seguro** (habitación en penumbra, cocina encerada y alacena secreta).

## Ejecutar en local
1. En la carpeta del proyecto, ejecuta:
   ```powershell
   python -m http.server 8000
   ```
2. Abre `http://localhost:8000` en Chrome o Edge.
