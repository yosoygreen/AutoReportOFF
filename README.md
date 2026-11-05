# Autoreporte Offline

Programa portable para Windows, con interfaz oscura en español. Procesa OFFLINE U8/U9, elige un solo peor viaje por fila SSPD, permite revisar seguimiento GPS y GTFS, y completa el Excel conservando las otras hojas. Implementación independiente: no ejecuta Reporte 2.2.

## Abrir y usar

1. **Extrae todo el ZIP** en una carpeta. No abras el HTML desde dentro del ZIP.
2. Abre `index.html` con Edge, Chrome o Firefox, o ejecuta `ABRIR Autoreporte Offline.bat`. No necesitas Python, Node, instalación ni servidor para el uso normal.
3. Carga uno o varios OFFLINE `.xlsx` (hoja `velocidad`) y tu plantilla `.xlsx` con hoja `SSPD`.
4. Selecciona un caso. Copia su **única patente y el inicio/fin completos** y consigue externamente su CSV.
5. Carga ese CSV en el caso. Confirma las columnas y la zona horaria. Si no tiene patente, confirma la asociación explícita.
6. Carga tu GTFS `.zip` y confirma el servicio/sentido/shape y su vigencia en el selector. Revisa las capas del mapa y el intervalo de reducción. No hay un GTFS operacional incluido.
7. Pulsa **Sí** o **No**. Sí conserva PPU y deja ubicación/horario vacíos. La decisión **No** requiere un intervalo revisado; puedes elegir entre propuestas o marcar dos posiciones reales manualmente. Edita ubicación/horario si corresponde.
8. Revisa «Anotaciones existentes y cambios de exportación» y exporta. Por defecto se exige resolver todos los casos; la opción al pie permite explícitamente exportar solo los resueltos, conservando los pendientes como estaban. Descarga evidencia JSON para identificarlos.

**Guarda la sesión antes de cerrar.** Recupera el JSON tras volver a cargar los mismos OFFLINE y el Excel SSPD original. La aplicación no conserva datos automáticamente. No reemplaces tus archivos de entrada con el Excel exportado si necesitas recuperar una sesión asociada al original.

Todo el cálculo funciona sin internet. La base OpenStreetMap es opcional y se activa en el mapa; si falla, permanecen los trazados locales. El enlace Google Maps abre solo las coordenadas del inicio de reducción. No se envía el CSV a ningún servicio. Las bibliotecas se incluyen en `vendor/`, sin CDN ni fuentes externas.

Si una política corporativa bloquea abrir HTML local, pide habilitarlo al administrador o sirve esta misma carpeta desde un servidor estático autorizado. No se requiere cambiar la aplicación. Las pruebas de navegador en el entorno de entrega usaron servidor HTTP local porque su Chromium administrado bloquea `file://`; no se ejecutó Windows ni el archivo `.bat` en ese entorno Linux.

## Probar sin datos operacionales

En `examples/` hay cuatro archivos **SINTÉTICOS** numerados: OFFLINE, SSPD, CSV y GTFS. Cárgalos en ese orden. Confirma la única ruta del GTFS. Se elige DEMO-01 frente a DEMO-02, se excluye un NOK y se propone un intervalo sostenido. No representan una ruta, bus ni evento real. La segunda hoja del SSPD sirve para comprobar conservación.

## Archivos reales y límites de validación

Consulta [docs/VALIDACION.md](docs/VALIDACION.md). Se verificaron el OFFLINE del 26/10/2026, la plantilla COF y el CSV LJDL-48 adjuntos. No se recibieron OFFLINE del 24/25 ni puntos vigentes. El ZIP Reporte_2_2_v12_2 excedió el límite de transferencia de 32 MiB, por lo que no se pudo extraer su GTFS ni anexos. No se inventaron datos operacionales en su lugar. Puedes cargar GTFS/Anexo 3 desde la interfaz cuando estén disponibles.

Los algoritmos son ayudas de revisión: no sustituyen la decisión del operador ni la comprobación de paraderos/variantes autorizadas. Los criterios y umbrales, zona horaria, esquema de variantes y límites están en [docs/CRITERIOS.md](docs/CRITERIOS.md).

## Código fuente y pruebas para desarrollo

La aplicación distribuida ya incluye las bibliotecas: **no ejecutes npm para usarla**.

- `src/core.js`: normalización, cruce, selección, validación CSV, desvíos e intervalos.
- `src/io.js`: Excel/CSV/GTFS y parche OOXML conservador.
- `src/app.js`, `src/style.css`, `index.html`: interfaz y mapa Leaflet.
- `tests/core.test.cjs`: pruebas unitarias con datos sintéticos identificados.
- `tests/browser.cjs`: prueba de integración en Chromium con los adjuntos reales, trazados sintéticos y verificación del Excel exportado.

Para desarrollo se necesita Node 22 o superior: `npm ci`, luego `npm test`. Para integración, `npm run test:browser`; configura `CHROMIUM_PATH` al ejecutable del navegador y las rutas `OFFLINE_SAMPLE`, `SSPD_SAMPLE`, `CSV_SAMPLE` a tus tres archivos reales. Si no se definen, el script busca los adjuntos del entorno de construcción en `/workspace/attachments`. El script crea un servidor local efímero solo para la prueba y lo cierra al finalizar. No se incluyen los archivos operacionales originales en el ZIP.

`npm run test:portable` comprueba el ZIP ya generado con sus ejemplos incluidos, teclado, intervalo manual y exportación sin solicitudes externas.

`npm run samples` regenera únicamente los ejemplos sintéticos. `npm run package` genera `dist/Autoreporte_Offline_1.0.zip` con aplicación, fuentes, pruebas, documentación, licencias y ejemplos; no incluye node_modules ni resultados operacionales.

Bibliotecas incluidas: SheetJS CE 0.18.5 (lectura), JSZip 3.10.1 (conservación OOXML), Papa Parse 5.5.3 (CSV), Leaflet 1.9.4 (mapa). Licencias en `vendor/`.
