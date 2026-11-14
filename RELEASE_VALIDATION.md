# Validación y liberación de NovaStore

## Identificación de la candidata

| Campo | Valor |
| --- | --- |
| Versión base | `v1.0.0` (referencia del ejercicio) |
| Candidata | `v1.1.0-rc.1` |
| Rama | `feature/catalog-sorting-v1.1.0` |
| Funcionalidad | Ordenamiento del catálogo por precio o nombre |
| Caché del Service Worker | `novastore-cache-v7` |
| Fecha de preparación | 2026-11-14 |

El archivo `Validación de la versión.xlsx` mencionado en la consigna no estaba disponible en el workspace. Esta matriz registra sus objetivos en formato Markdown y puede copiarse a la hoja proporcionada.

## Matriz de pruebas

Actualiza el resultado y agrega navegador, dispositivo, fecha y evidencia cuando completes cada prueba manual. No marques como aprobada una prueba que no se haya ejecutado.

| ID | Validación | Procedimiento / resultado esperado | Resultado actual | Evidencia / corrección |
| --- | --- | --- | --- | --- |
| C-01 | Orden ascendente | Elegir “Precio: menor a mayor”; los precios visibles deben ser no decrecientes. | Aprobada | Playwright/Chromium: 8 productos ordenados, desde 189 hasta 9000 MXN. |
| C-02 | Orden descendente | Elegir “Precio: mayor a menor”; los precios visibles deben ser no crecientes. | Aprobada | Playwright/Chromium: orden descendente comprobado. |
| C-03 | Orden alfabético | Elegir “Nombre: A a Z”; los nombres deben ordenarse sin distinguir mayúsculas/minúsculas. | Aprobada | Playwright/Chromium: nombres en orden locale `es`. |
| C-04 | Combinación de búsqueda y filtro | Escribir un término, seleccionar categoría y ordenar; solo deben mostrarse coincidencias ordenadas. | Aprobada | Búsqueda “bocina” + categoría “Electrónica” devolvió solo “Bocina portátil”. |
| C-05 | Interfaz móvil | Revisar los controles nuevos en una pantalla estrecha y comprobar que no haya desbordamiento horizontal. | Aprobada | Chromium a 390 px: selector visible y ancho de página igual al viewport (375 px efectivos). |
| R-01 | Regresión de funciones existentes | Probar favoritos, carrito (agregar/cambiar/quitar), detalle, reseña y alta de producto. | Aprobada | En Chromium se probaron favorito, carrito (incrementar, disminuir y quitar), detalle, reseña y alta local. |
| P-01 | Persistencia local | Con datos de prueba existentes, recargar y verificar productos, favoritos, carrito y reseñas. | Aprobada en origen de prueba | Productos, favoritos, carrito, reseñas y cola de sincronización de prueba persistieron después de activar el worker. No se modificó el almacenamiento del origen de desarrollo. |
| SW-01 | Detección de nueva versión | Cargar la versión anterior, publicar/servir la candidata en el mismo origen y esperar actualización del Service Worker. | Pendiente de actualización desde worker anterior | En origen aislado se forzó instalación/activación de la candidata; falta verificar `updatefound` desde una instalación anterior y en hosting público. |
| SW-02 | Actualización del caché | Verificar que la candidata precargue App Shell y elimine cachés antiguos `novastore-cache-*`; recargar y comprobar la interfaz nueva. | Aprobada en origen de prueba | Se sembró `novastore-cache-v6`; tras instalar la candidata quedó `novastore-cache-v7` y se abrió la interfaz. |
| SW-03 | Datos durante actualización | Antes de actualizar, guardar favoritos, carrito, reseña, producto local y producto pendiente; tras activación/recarga confirmar que persisten. | Aprobada en origen de prueba | Se conservaron las cinco claves `novastore-*-v1` con sus datos de prueba tras activar el nuevo worker. |
| OFF-01 | Uso sin conexión | Tras cargar una vez, activar Offline y recargar; la interfaz debe abrir desde caché y conservar datos locales. | Aprobada en origen de prueba | Chromium en modo Offline abrió la interfaz y el producto guardado desde el caché `novastore-cache-v7`. |
| API-01 | Regresión de API | Ejecutar las pruebas unitarias del servidor y comprobar lectura, escritura, idempotencia y validación. | Aprobada | `python -m unittest discover -s tests -v`: 4 pruebas, todas aprobadas. |

### Incidencias observadas

- El origen aislado `http://127.0.0.1:8127` sirve archivos estáticos y no implementa `POST /api/products`; devolvió HTTP 501 al intentar sincronizar productos de prueba. La cola conservó ambos pendientes, por lo que no se perdieron datos. No es un fallo de la candidata: las pruebas de API pasaron usando el servidor de pruebas temporal de `tests/test_server.py`. Repetir sincronización con `python server.py` antes de liberar.
- No se ha ejecutado una actualización real desde un Service Worker de la versión anterior en una URL pública. El ciclo de registro/activación y la limpieza del caché se probaron en un origen local aislado; queda pendiente la comprobación SW-01 con la instalación previa y el hosting.

## Ejecución reproducible

1. En una terminal, ejecutar `python server.py` y abrir `http://127.0.0.1:8000`.
2. Para la actualización, usar un perfil del navegador que haya cargado la versión base, sin borrar datos del sitio. Para simular publicación local, sustituir los archivos servidos manteniendo exactamente el mismo origen.
3. En DevTools → **Application**, anotar Service Worker activo y cachés antes y después; revisar que aparezca `novastore-cache-v7` y que los cachés NovaStore anteriores se eliminen al activar la versión nueva.
4. Antes de actualizar, crear/seleccionar favoritos, artículos del carrito, una reseña y un producto guardado localmente; volver a comprobarlos después de la actualización.
5. Probar los casos C-01 a C-04 en la sección Catálogo y R-01 en los demás módulos.
6. Ejecutar el comando de API-01. Guardar capturas o resultados junto con fecha, navegador y dispositivo en la columna de evidencia.

## Integración y liberación

1. Revisar los cambios de `feature/catalog-sorting-v1.1.0`, ejecutar las validaciones anteriores y registrar correcciones en este archivo.
2. Abrir Pull Request hacia `main` (o simularlo localmente con `git merge --no-ff feature/catalog-sorting-v1.1.0`).
3. Cuando no queden pruebas pendientes, actualizar la versión estable a `v1.1.0`, documentarla en el changelog, incrementar `CACHE_NAME` si hay cambios de recursos y crear la etiqueta `v1.1.0`.
4. Publicar los archivos estáticos en el hosting HTTPS del equipo. No sobrescribir ni borrar el almacenamiento de usuarios; mantener el mismo origen.
5. Abrir la URL pública con una instalación que aún tenga la versión anterior. Esperar que el Service Worker instale y active los recursos actualizados, y validar SW-01 a SW-03.
6. Registrar URL, fecha, commit/tag publicado, navegador y evidencias. La publicación y verificación pública quedan pendientes hasta contar con acceso al servicio de hosting.

## Reversión

Ante un error crítico, volver a desplegar los archivos estáticos de la última versión estable conocida en el mismo origen. Asignar al Service Worker revertido un identificador de caché nuevo (por ejemplo `novastore-cache-v8`); no reutilizar ni limpiar manualmente `localStorage` o IndexedDB. Tras desplegar, confirmar que el worker anterior vuelve a tomar control, que el catálogo abre y que los datos guardados siguen presentes. Documentar la causa, hora de reversión y la versión retirada antes de preparar otra candidata.
