# Validación de la entrega 1.0

Fecha: 05/11/2026. Linux, Node 24.22.1 y Chromium 155.0.8059.79 mediante Playwright. Se inspeccionaron las estructuras de los archivos con openpyxl antes de implementar; la aplicación y las pruebas operativas usan JavaScript.

## Muestras reales disponibles

- `20261026 Lunes.xlsx`: hoja velocidad, 20 columnas. Se comprobaron **1.865 OK U8/U9**, **18 NOK U8/U9 excluidos** (12 U8, 6 U9), cero inválidos entre OK U8/U9. OK: 731 U8 y 1.134 U9. Otras unidades quedan fuera.
- `COF Noc 26-10-2026 Avanzado.xlsx`: hojas SSPD, OFFLINE y FUGA. Se encontraron **45 filas SSPD con coincidencia**, **108 viajes candidatos** y **45 selecciones**, una por fila.
- `SM-1B2113-20261026T190000.00-03_00-20261026T193059.00-03_00.csv`: separador punto y coma, decimales con coma, columnas reales Patente / Fecha GPS / Latitud / Longitud. **62 posiciones válidas** de LJDL-48, desde **19:00:16 hasta 19:30:47** del 26/10. Su viaje OFFLINE es **18:06:15 → 19:39:47**, servicio 822 Regreso. Cobertura temporal: **32,63 %**; se marca parcial. LJDL-48 no es el peor viaje de ninguna de las 45 filas SSPD del archivo recibido. Se comprobó su lectura contra su propio viaje sin forzar su uso en un caso distinto, y su rechazo al cargarlo en un caso de otra patente.

## Pruebas automatizadas ejecutadas

`npm test`: **12 pruebas pasadas, 0 fallidas**. Cubren filtro, exclusiones, rechazo de datos inválidos, períodos P1/P24, medianoche, formatos de servicio sin fusionar variantes, desempate determinista y selección con/sin PO, columnas CSV asignadas, coma decimal, bus equivocado y asociación explícita, UTC/offset de Chile, puntos insuficientes y huecos, intervalo sostenido desde GPS real, detenciones inmóviles, ausencia de PO, tolerancia de desvíos, cobertura parcial y regla Sí/No con ediciones.

`npm run test:browser`: **integración completa pasada** con los tres archivos reales y seguimiento/GTFS sintéticos identificados. Verificado:

- Carga de OFFLINE y SSPD, conteos 1.865 / 18 / 45 / 108, recarga sin duplicación.
- Rechazo del CSV LJDL-48 en un caso de otra patente, y lectura de sus 62 posiciones contra su viaje real.
- Mapa Leaflet con trazado sintético esperado y posiciones sintéticas observadas, intervalo sostenido y extremos reales dentro de ese CSV sintético.
- Propuesta No con geometría coincidente y Sí con separación sostenida; el operador puede corregir Sí a No sin preguntas adicionales.
- Cambio Sí→No→Sí: se ocultan y vacían los campos exportables de reducción con Sí, y se recuperan las ediciones al volver a No.
- Fallo de teselas OpenStreetMap simulado: aviso y trazados conservados, sin bloquear revisión/exportación.
- Exportaciones Sí y No reabiertas con SheetJS. Sí conserva la patente y deja ubicación/horario vacíos; No conserva ubicación editada y horario del intervalo.
- Comparación de todas las entradas del ZIP Excel: **solo cambió `xl/worksheets/sheet1.xml` (SSPD)**. OFFLINE, FUGA, estilos, relaciones y otras entradas tienen bytes descomprimidos idénticos. Se compararon **1.055 celdas/propiedades de SSPD fuera de las cuatro celdas intervenidas** y permanecieron iguales.
- Guardado y recuperación de sesión con verificación de plantilla y viaje.
- Sin errores JavaScript de página. Sin desbordamiento horizontal en anchos 320, 768, 1024 y 1440 px. Se inspeccionaron visualmente capturas de escritorio y móvil.

`npm run test:portable`: ZIP extraído y probado desde una carpeta temporal independiente del checkout. Pasaron el ejemplo completo incluido, mapa, intervalo manual desde dos posiciones reales del CSV sintético, activación por teclado del selector CSV y exportación. Se verificaron **cero solicitudes externas** en ese flujo sin mapa base.

Los datos sintéticos se usan para provocar resultados controlados y verificar el algoritmo; no constituyen evidencia de desvío/reducción en la operación real.

## Pendiente y límites explícitos

- No se adjuntó `Offline_y_puntos_vigentes (2).zip`: no se pudieron verificar los días 24/25 ni el total de 5.096 viajes. No se forzaron esas cifras.
- `Reporte_2_2_v12_2.zip` se intentó descargar y excedió el límite de transferencia de **32 MiB**. No fue posible extraer su GTFS, Anexo 3 ni funciones internas. Se implementaron lectores independientes; falta probarlos con esos GTFS/anexos operacionales, suministrados por separado o en un ZIP menor.
- No hay validación de desvío real frente a GTFS operacional ni una reducción real confirmada por un operador. El CSV recibido es parcial y corresponde a una patente no seleccionada en SSPD.
- GTFS requiere confirmación humana de servicio/sentido/shape/vigencia; no se interpretan calendarios GTFS para seleccionar automáticamente variantes temporales. Anexo 3 admite tablas asignables, no un formato desconocido inferido.
- La revisión de cabezales/paraderos es conservadora, basada en exclusión temporal, avance y proximidad si hay stops.txt; no sustituye un análisis de tiempos programados de parada.
- El navegador administrado del entorno bloquea `file://` por política. La prueba real de interfaz usó HTTP local autorizado, sin servicios externos para datos. No se ejecutó Windows, el lanzador `.bat` ni apertura por doble clic en un navegador Windows. La distribución es HTML/CSS/JS con todas sus bibliotecas locales, sin módulos ES, fetch de archivos ni servidor requerido para el uso normal.
- No se validó geocodificación automática (no está implementada); el respaldo son coordenadas reales y enlace Google Maps, con edición manual de calle/intersección.
- No se ejecutó una auditoría completa de lector de pantalla. Se proporcionan controles HTML etiquetados, foco visible y activación por teclado de los selectores de archivo.
