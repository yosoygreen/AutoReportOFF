# Criterios y límites revisables

## Archivos y selección

Se lee exclusivamente la hoja `velocidad` de cada OFFLINE y los encabezados reales de las muestras. Solo U8/U9 y Estado OK. NOK y otros estados se cuentan y excluyen; fechas, horarios, sentido, patente y velocidades no positivas o no numéricas se rechazan con fila y motivo. Una velocidad cero no permite evaluar un viaje completo válido y se informa como inválida.

El período es la hora entera de Inicio + 1; la columna de macroperíodos no interviene. Fin anterior a Inicio se interpreta como el día siguiente. La fecha de cruce es la fecha de inicio. Las fechas y horas sin offset son horas de pared de Chile continental; los valores Excel no pasan por la zona horaria del equipo. ISO con Z u offset se convierte con `America/Santiago`. Un CSV declarado UTC sin offset se convierte explícitamente a esa zona. En fechas de cambio de horario con hora local ambigua, usa un CSV con offset explícito; no se infiere cuál de las dos horas repetidas corresponde.

Cruce exacto por fecha, UN, Servicio A4/Servicio, sentido y período. Se normalizan espacios externos, mayúsculas, acentos y la terminación numérica `.0`; no se eliminan sufijos de variante (`807` y `807y` son distintos). Patentes sin guiones/espacios para comparar; se presenta la grafía del viaje original. Repetir el mismo archivo no agrega viajes. También se deduplica la clave completa fecha/unidad/servicio/sentido/período/patente/inicio/fin/velocidad entre archivos.

PO: primero una referencia exacta de Anexo 3 por esa misma clave; en ausencia de ella, Vel PO de la fila SSPD. Se admite Anexo 3 CSV o una tabla Excel con asignación de columnas: Fecha, UN, Servicio, Sentido, período numérico 1–24, velocidad PO. Referencias duplicadas para la misma clave se rechazan; filas inválidas se informan. Esta importación tabular no interpreta automáticamente anexos con celdas combinadas ni macroperíodos: conviértelos a una tabla comparable antes de usarlos.

Reducción de selección = `1 − velocidad del viaje / PO`. Dentro de una clave el PO es el mismo para todos los candidatos: ordenar por menor velocidad equivale a ordenar por mayor reducción. Sin PO se selecciona igualmente la menor velocidad válida, sin porcentaje. Desempate: menor velocidad, inicio más temprano, patente normalizada en orden alfabético, fin más temprano y clave completa. Nunca se promedian patentes ni se combinan extremos de distintos viajes.

## Seguimiento

CSV con detección de separador, comillas y codificación UTF-8 o Windows-1252. El diálogo siempre permite confirmar o asignar columnas, sin depender del encabezado de la muestra. Se admiten fecha/hora juntas, separadas, solo hora para la fecha del caso, ISO con offset o UTC explícito. Latitud/longitud en grados decimales (coma o punto); no se convierten coordenadas UTM. La columna opcional de velocidad se conserva como evidencia; la detección utiliza distancia y tiempos GPS para no suponer unidades de una columna desconocida.

Solo se incluyen posiciones de la patente seleccionada y dentro del inicio/fin de ESE viaje; el resto se cuenta. Si la columna de patente falta, el operador debe confirmar la asociación. Una columna elegida de patente con datos vacíos no se asocia silenciosamente: elige «Sin columna» y confirma explícitamente si realmente corresponde. Se necesitan al menos tres posiciones válidas y tiempos distintos. Los tiempos repetidos se deduplican (se conserva el primero). Las horas sin fecha pueden continuar al día siguiente en viajes que cruzan medianoche. Un rango que contiene puntos de varios viajes del mismo bus se recorta al seleccionado.

Se considera cobertura completa cuando la primera/última posición está a no más de 120 s de los extremos del viaje, se cubre al menos el 80% del rango, no hay posiciones inválidas y no hay huecos de más de 120 s. Se informa el porcentaje, incidencias y huecos; la fracción de cobertura es el rango entre puntos, no una garantía de frecuencia uniforme. No se dibujan líneas a través de huecos >120 s. Las primeras/últimas posiciones GPS se etiquetan como tales: si el CSV es parcial, no se inventan los puntos del inicio/fin del viaje. El rango solicitado completo permanece en la cabecera.

## GTFS y desvíos

Importa un ZIP GTFS estándar con `routes.txt`, `trips.txt`, `shapes.txt`; `stops.txt` es opcional. Se ordena `shape_pt_sequence` y se presentan las combinaciones ruta/dirección/shape. **El operador debe confirmar servicio, sentido y vigencia de la ruta.** No se supone que direction_id 0=Ida ni se escoge una variante porque su nombre se parezca. Esta versión no interpreta `calendar`, `calendar_dates`, frecuencias ni stop_times para seleccionar automáticamente el viaje GTFS vigente: confirma la vigencia con la fuente operacional.

Distancia del GPS al segmento de shape más cercano, con proyección local métrica. Se toleran 100 metros de separación; la propuesta Sí necesita al menos tres posiciones consecutivas fuera de tolerancia y al menos 60 s, sin atravesar huecos >120 s. Sin evidencia sostenida, solo se propone No si hay cobertura completa. Sin GTFS confirmado, sin cobertura suficiente o sin información, requiere revisión. No comprueba secuencia de calles, sentidos de circulación ni variantes desconocidas; el algoritmo es una ayuda de revisión, no una certificación de itinerario.

La propuesta nunca decide por el operador: siempre debe pulsar Sí/No. El cambio es directo, sin pedir explicación ni nombre de variante. El operador puede corregir la propuesta para reconocer variantes autorizadas.

Variantes opcionales: carga un JSON con una lista. No se incluye ninguna geometría operacional inventada. Cada variante debe tener:

```json
[
  {
    "name": "Nombre de variante autorizada",
    "service": "código exacto del servicio",
    "direction": "Ida",
    "days": [1, 2, 3, 4, 5],
    "start": "07:00:00",
    "end": "09:59:59",
    "from": "2026-10-01",
    "to": "2026-12-31",
    "points": []
  }
]
```

`points` debe contener al menos dos objetos reales `{"lat": número, "lon": número}`. El ejemplo vacío es intencionadamente inválido para no inventar rutas. `days`: domingo=0, lunes=1…sábado=6. from/to son opcionales. La fecha/día/hora de Inicio del viaje decide aplicabilidad. Para franjas que cruzan medianoche, declara dos variantes/franjas y ajusta sus días. Se compara con cada trazado autorizado aplicable: si alguno explica el recorrido completo, se puede proponer No. Si alguna comparación no permite concluir, queda pendiente. La decisión manual prevalece.

## Intervalos de reducción

Distancia Haversine entre posiciones consecutivas, dividida por el tiempo (km/h), no una posición aislada de velocidad mínima. Umbral = menor de `0,6 × PO` y `15 km/h`. Sin PO no se inventa umbral: solo revisión manual. Una propuesta automática necesita ≥3 posiciones, duración ≥180 s y avance acumulado ≥200 m; no cruza huecos >120 s. Se excluyen los primeros y últimos 120 s del viaje para reducir falsos eventos de cabezal. Se ordenan propuestas por duración descendente y luego inicio más temprano.

Una detención inmóvil no basta: necesita avance ≥200 m. Si el inicio o fin está a menos de 50 m de un paradero GTFS cargado, se señala para revisión. No se dispone de tiempos de parada programados ni de puntos vigentes: esta heurística NO distingue de manera definitiva una cola de tránsito de una detención normal. Revisa los paraderos, el recorrido y cada intervalo antes de marcar No. No se calcula precisión mejor que la de las posiciones originales.

Se puede elegir otro intervalo detectado o marcar manualmente dos posiciones reales. El intervalo manual debe durar ≥120 s y no atravesar huecos >120 s. Inicio/fin se obtienen de esas posiciones reales. La ubicación predeterminada son las coordenadas del **inicio**, no del final. No hay geocodificación automática ni se inventan calles: el enlace Google Maps transmite únicamente esas coordenadas cuando lo abres. Puedes escribir una calle/intersección tras verificarla; señala «aproximada» si corresponde.

La edición del horario exige `De HH:MM:SS a HH:MM:SS` y extremos coincidentes con posiciones del CSV, dentro del viaje y sin huecos >120 s. Al confirmar un horario distinto, la ubicación vuelve a las coordenadas reales del nuevo inicio; vuelve a editar su calle si lo necesitas. No uses un rango de viaje completo como reducción sin revisar la evidencia.

## Decisión y exportación

Pendiente es distinto de No. Ambos botones de decisión necesitan CSV aceptado. Sí conserva una PPU y exporta ubicación/horario vacíos, incluso si existían previamente. Los datos detectados y editados permanecen en la sesión para recuperarlos si vuelves a No. Un caso con decisión **No** solo es exportable con un intervalo, ubicación y horario válidos. Sin intervalo el caso queda con datos insuficientes, aunque se haya pulsado No.

La aplicación lee el contenedor ZIP OOXML original y modifica únicamente las celdas de las cuatro columnas en SSPD de las filas resueltas. Conserva sus atributos de estilo y sustituye sus valores/fórmulas por texto. Las demás entradas del ZIP (hojas, estilos, dibujos, relaciones, etc.) conservan exactamente sus bytes descomprimidos; se recomprime el contenedor. No se regenera el libro con un exportador que pierda formato. Una firma digital del documento, si existiera, ya no sería válida después de editarlo. Solo `.xlsx`, no `.xls`, `.xlsb` ni `.xlsm`.

Por defecto no se exporta con pendientes. La casilla al pie permite explícitamente exportar solo los resueltos: los pendientes conservan celdas originales, que **no son resultados de esta revisión**. Las anotaciones originales frente a las nuevas están visibles en cada caso, y el aviso de exportación indica cuántos se actualizaron y cuántos quedan pendientes. Descarga también la evidencia JSON para identificar esos casos. No se agrega una hoja ni se alteran columnas ajenas.

Guardar sesión descarga un JSON local con posiciones, patentes, referencias, geometrías y decisiones; contiene información operacional. Recupérala después de cargar los mismos OFFLINE y la misma plantilla SSPD original (se verifica SHA-256 del Excel y la identidad exacta del viaje/PO). No hay subida a servidores ni almacenamiento automático; guarda antes de cerrar.
