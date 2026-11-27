# UrbanMystery
PWA de acertijos e investigación ficticia. HTML, CSS y JavaScript sin dependencias externas.

## Ejecutar en Windows
1. Extraer ZIP, abrir la carpeta UrbanMystery en VS Code.
2. En la terminal ejecutar `py -m http.server 8000` (o `python -m http.server 8000`).
3. Abrir http://localhost:8000 en Chrome o Edge. No abrir index.html por doble clic.
4. Visitar la app en línea y esperar a que el Service Worker esté activo antes de probar offline.

## Publicación HTTPS
Crear repositorio en GitHub, subir archivos y configurar Settings > Pages > Deploy from a branch > main / root. Abrir la URL publicada. También se puede importar el repositorio en Vercel como proyecto estático sin build. El historial de commits debe reflejar cambios reales del equipo; no se incluye historial artificial.

## Requisitos y pruebas manuales
- Manifest: DevTools > Application > Manifest, verificar iconos 192 y 512, tema, standalone. Instalar desde botón cuando Chromium lo ofrezca o menú del navegador. Splash depende del sistema operativo.
- App Shell/CSR: navegar por las tres vistas; comprobar tamaños móvil y escritorio.
- Enigmas: inspeccionar todas las evidencias antes de deducir, elegir conclusiones y reconstruir secuencias con clics; verificar pista, respuesta correcta e incorrecta.
- Service Worker: Application > Service Workers; verificar activated. Cache Storage debe mostrar urban-static-v3 y, tras solicitar casos con worker activo, urban-dynamic-v1. Recargar una vez con conexión para generar caché dinámica.
- IndexedDB: resolver un acertijo, recargar y revisar UrbanMystery > progress. Guardar evidencia y verificar evidence.
- Offline: marcar Offline en DevTools > Network, recargar; resolver un acertijo y comprobar persistencia.
- Cámara: Evidencias > Abrir cámara > permitir > Capturar foto. Requiere cámara disponible y contexto seguro.
- Geolocalización: Evidencias > Registrar ubicación > permitir. Puede fallar si no hay servicio de ubicación o permiso.
- HTTPS: captura de la URL publicada y certificado. Git: captura de commits reales.

## Alcance
Seis casos con 21 acertijos, desde nivel inicial hasta experto; incluye un expediente fan-made y no oficial con referencias culturales compartidas por la comunidad. Los enigmas incluyen tableros de evidencias, elecciones de deducción y reconstrucción de secuencias. Hay puntos, pistas y evidencia fotográfica/geográfica local. No hay cuentas ni sincronización entre dispositivos. La ubicación es opcional y no bloquea el juego. Las respuestas están en JSON y no constituyen un mecanismo antitrampas. Borrar datos del sitio elimina el progreso. No se envían evidencias al servidor. Instalación y APIs dependen del navegador y permisos.
