# UrbanMystery
PWA interactiva de investigación, acertijos y minijuegos. HTML, CSS y JavaScript modernos sin dependencias externas.

## Novedades 2026: Jugabilidad y Cultura Pop
- **Laberintos interactivos (`maze`)**: Guía a tu personaje con controles táctiles o teclado (flechas / WASD), esquivando obstáculos y recolectando migajas para llegar a la meta.
- **Búsqueda de objetos ocultos en la página (`hidden`)**: Inspecciona escenas interactivas haciendo clic en rincones y objetos para encontrar las evidencias clave y evitar trampas de pérdida de aura.
- **Sintonizador de frecuencias (`radar`)**: Ajusta la radio de emergencia para captar la transmisión legendaria de Las Pérdidas en el cerro.
- **Candado y combinaciones de seguridad (`lock`)**: Gira las ruedas numéricas para abrir cajas fuertes con deducciones numéricas.
- **Lore urbano y cultura pop 2026**: Casos temáticos con referencias a **Aimep3** (Caso 04: *Pozole*, lavadero de Neza, jabón Zote, trebejos), **Las Pérdidas** (Wendy Guevara, Paola Suárez, *¡Estamos perdidas!*), el caso del *Destornillador* (Caso 05), y la cultura del 2026: puntos de **Aura**, recolección de **migajas**, modo resolutivo y devorar misterios.

## Casos disponibles
1. **El misterio de las migajas**: Caso inicial con búsqueda oculta, secuencias y laberinto del archivo.
2. **La señal de Las Pérdidas**: Sintoniza la radio en 96.5 MHz, cruza el laberinto de nopales y empareja frases icónicas.
3. **La bóveda del Aura 2026**: Encuentra los rastros en la sala blindada, descifra el candado 2026 y conecta las coartadas.
4. **Pozole**: El legendario caso del lavadero de Neza, jabón Zote, tostadas sin dejar migajas y laberinto de la olla.
5. **Destornillador**: Encuentra la herramienta mística en el taller, supera el laberinto de trebejos y abre la caja 777.
6. **Chiwis y el enigma limpio y seguro**: Encuentra las travesuras de Chiwis, guía su laberinto nocturno y certifica la escena.

## Ejecutar en local
1. En la carpeta del proyecto, ejecuta en la terminal:
   ```powershell
   python -m http.server 8000
   ```
2. Abre `http://localhost:8000` en Chrome o Edge.
3. La aplicación cuenta con Service Worker (`urban-static-v5`), soporte offline, IndexedDB y PWA instalable.

## Publicación HTTPS
Despliega en GitHub Pages (Settings > Pages > Branch: `main` / root) o Vercel.
