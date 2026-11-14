# Registro de cambios

Los cambios importantes de NovaStore se documentan en este archivo.

## [1.1.0-rc.1] - 2026-11-14

### Añadido

- Controles para ordenar el catálogo por precio ascendente, precio descendente y nombre; se conserva el orden recomendado como opción inicial.
- Matriz de validación y procedimiento de liberación/reversión en `RELEASE_VALIDATION.md`.

### Cambiado

- Se actualizó el App Shell a `novastore-cache-v7` para que el Service Worker instale los recursos de esta candidata.
- Se mantiene intacta la persistencia existente en `localStorage`; no se modificaron claves ni se añadió un borrado/migración de datos.

### Compatibilidad

- La búsqueda y el filtro de categoría se combinan con el orden elegido.
- Favoritos, carrito, reseñas, productos y cola de sincronización conservan las claves actuales del navegador.

## [1.0.0] - Versión inicial de referencia

- Catálogo PWA de NovaStore con búsqueda, filtros, favoritos, carrito, reseñas y persistencia local.
- Soporte offline mediante Service Worker y API local opcional en Python.
