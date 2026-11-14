# NovaStore PWA

Catálogo de productos construido con HTML, CSS y JavaScript, con una API local opcional en Python estándar (sin dependencias externas).

Diagrama: [arquitectura de NovaStore](diagrama-arquitectura.png).

## Descargar el proyecto

Puedes descargar el código desde GitHub con **Code → Download ZIP** y extraerlo, o clonarlo desde una terminal:

```powershell
git clone https://github.com/Diegousyc/funciones-avanzdas-en-una-PWA.git
cd funciones-avanzdas-en-una-PWA
```

Necesitas Python 3 instalado para ejecutar el servidor. No hay que instalar paquetes adicionales.

## Iniciar la aplicación

Abre PowerShell o una terminal dentro de la carpeta del proyecto y ejecuta:

```powershell
python server.py
```

Si Windows no reconoce `python`, prueba `py server.py`. Después abre `http://127.0.0.1:8000` en Chrome o Edge. Deja abierta la terminal mientras uses la aplicación; para detener el servidor, presiona **Ctrl+C**.

El servidor entrega la aplicación y la API en el mismo origen. Los productos enviados se guardan en `server-data/products.json`, creado al guardar el primer producto.

No abras `index.html` con doble clic (`file://`): el navegador restringe el manifest y el Service Worker. También puedes abrir la interfaz con Live Server, pero la API de Python no estará disponible; usa `server.py` para probar el envío al servidor.

## Instalar la PWA en tu dispositivo

Para instalarla como aplicación, primero publica la web en un sitio con HTTPS. Durante el desarrollo también puedes instalarla desde `http://127.0.0.1:8000`:

- **Chrome o Edge en computadora:** abre NovaStore y elige **Instalar NovaStore** en la barra de direcciones o en el menú.
- **Android:** abre la dirección HTTPS en Chrome y selecciona **Instalar aplicación** o **Agregar a pantalla principal**.
- **iPhone o iPad:** abre la dirección HTTPS en Safari, pulsa **Compartir** y selecciona **Agregar a pantalla de inicio**.

Descargar el ZIP solo obtiene los archivos del proyecto. Para instalar la PWA, sírvela desde un origen compatible y agrégala desde el navegador. El Service Worker y funciones como cámara y ubicación requieren `localhost` o HTTPS.

## Componentes y funciones

- **Catálogo:** muestra productos y permite buscarlos y filtrarlos por categoría.
- **Favoritos y carrito:** guarda favoritos y permite administrar cantidades en el carrito.
- **Detalles y reseñas:** muestra información, calificaciones y opiniones; también permite agregar reseñas.
- **Agregar productos:** registra productos con categoría y descripción; permite seleccionar una foto, que se reduce y guarda localmente.
- **Persistencia y sincronización:** favoritos, carrito y reseñas se guardan en el navegador. Los productos nuevos se guardan localmente y se envían a la API cuando hay conexión; sin conexión quedan pendientes para reintentar.
- **Modo sin conexión:** el Service Worker guarda los recursos principales para que la interfaz pueda abrirse sin conexión después de la primera visita.
- **Funciones opcionales del dispositivo:** se pueden activar notificaciones locales y consultar la ubicación solo cuando el usuario lo solicita y concede permiso.

La aplicación no incluye cuentas ni pagos reales. Favoritos, carrito y reseñas no se sincronizan con el servidor; la API local solo recibe productos.

## Responsabilidades del cliente y del servidor

- **Cliente (`index.html`, `style.css`, `app.js`)**: muestra la interfaz, gestiona catálogo, favoritos, carrito y reseñas, valida formularios, guarda datos en `localStorage` y conserva en una cola los productos aún no enviados. La cola se reintenta al recuperar la conexión o mediante **Enviar pendientes**.
- **Servidor (`server.py`)**: sirve los archivos estáticos, valida los productos recibidos por HTTP, evita duplicados por identificador y persiste los productos sincronizados en `server-data/products.json`.
- **API**: `GET /api/products` devuelve `{ "products": [...] }`; `POST /api/products` recibe un producto JSON y devuelve `{ "product": ... }`. El Service Worker no cachea esta API.
- **Manifest (`manifest.json`)**: define el nombre, icono, colores, modo de visualización y accesos directos de la aplicación instalable.
- **Service Worker (`service-worker.js`)**: cachea el App Shell y recursos esenciales. No guarda respuestas de `/api/` en caché.
- **Notificaciones locales**: en **Agregar producto**, pulsa **Activar notificaciones** y concede permiso. Se muestra un aviso cuando se completa una sincronización con productos pendientes. No hay push remoto.
- **Geolocalización**: el botón **Consultar ubicación** pide permiso al pulsarlo y muestra latitud, longitud y precisión aproximada. La app no envía ni guarda esas coordenadas.

## Pruebas manuales en navegador

1. Ejecuta `python server.py` y abre `http://127.0.0.1:8000` en Chrome o Edge. Usa `localhost`/HTTPS; `file://` no permite probar estas APIs.
2. **Service Worker y actualización**: abre DevTools → **Application** → **Service Workers** y confirma que `service-worker.js` esté activo. Al cambiar el código del worker, incrementa `CACHE_NAME` en `service-worker.js` para probar la nueva versión.
3. **Offline**: en DevTools → **Network**, activa **Offline** y recarga. La interfaz y el catálogo local deben abrirse. Agrega un producto y confirma que aparece como pendiente. Vuelve a **Online** y pulsa **Enviar pendientes** si no se sincroniza automáticamente.
4. **Notificación**: en **Agregar producto**, pulsa **Activar notificaciones** y permite el aviso. Crea un producto offline y sincroniza una cola no vacía al volver online.
5. **Cámara/foto**: en el formulario pulsa **Foto del producto**. En un teléfono puede ofrecer **Tomar foto**; en escritorio puedes elegir una imagen para comprobar la vista previa y persistencia. Acepta el permiso si aparece.
6. **Geolocalización**: pulsa **Consultar ubicación** y acepta el permiso del sitio. Deben mostrarse coordenadas y precisión; también puedes probar denegar el permiso desde los ajustes del sitio.

## Pruebas automatizadas

Ejecuta:

```powershell
python -m unittest discover -s tests -v
```

Cuatro pruebas automatizadas cubren catálogo vacío, registro persistente, reemplazo idempotente del mismo identificador y rechazo de datos inválidos.

### Resultados registrados

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| La pantalla inicial y la pantalla principal se presentan correctamente. | Aprobada | En navegador, título `NovaStore | Catálogo de productos`, encabezado de inicio y sección `Catálogo de productos` visibles. |
| Los datos se muestran en la interfaz. | Aprobada | El catálogo mostró seis productos iniciales y el contador `6 productos`. |
| Los datos locales permanecen después de recargar. | Aprobada | Se guardó y volvió a mostrar un favorito después de recargar. |
| Los recursos cacheados permiten abrir sin conexión. | Aprobada en versión anterior; pendiente de revalidar | La prueba registrada se realizó con `novastore-cache-v5`; el Service Worker actual usa `novastore-cache-v6`. |
| Los pendientes se envían al recuperar conectividad. | Aprobada con reintento manual | Un producto offline se conservó y se envió al volver online mediante **Enviar pendientes**. |
| Los reintentos no duplican registros. | Aprobada en API | `GET /api/products` devolvió un solo producto al reenviar el mismo ID con valores distintos. |
| El servidor rechaza datos inválidos. | Aprobada | Las pruebas cubren datos incompletos/inválidos y un precio fuera del rango finito. |

### Repetir la prueba offline y sincronización

1. Inicia `python server.py`, abre `http://127.0.0.1:8000` y espera a que cargue el catálogo.
2. En las herramientas de desarrollo, abre **Network** y selecciona **Offline**.
3. En **Agregar un producto**, registra uno nuevo. Debe aparecer en el catálogo y quedar pendiente.
4. Recarga la página todavía sin conexión: el App Shell y el producto local deben seguir disponibles.
5. Vuelve a **Online**. La app reintenta automáticamente; también puedes pulsar **Enviar pendientes**.
6. Comprueba que el contador regrese a cero y que el producto siga visible después de recargar.

## Limitaciones

- La sincronización automática se dispara al recuperar conectividad, pero no usa Background Sync. Si falla, el producto queda en la cola y se puede enviar con el botón **Enviar pendientes**.
- El servidor es local y de demostración: no tiene autenticación, no es multiusuario y persiste en un archivo JSON, no en una base de datos.
- Favoritos, carrito y reseñas se guardan solo en el navegador. El backend sincroniza productos, no los demás módulos.
- El almacenamiento local depende del navegador y del origen, y puede eliminarse desde sus ajustes.
- Las fotos de productos se conservan localmente y no se suben al servidor.
- Las notificaciones son locales, no hay push remoto ni sincronización en segundo plano.

## Archivos principales

- `index.html`: estructura de la interfaz.
- `style.css`: estilos adaptables.
- `app.js`: lógica de la aplicación, persistencia local y sincronización.
- `manifest.json`: configuración de la PWA instalable.
- `service-worker.js`: caché y soporte sin conexión.
- `server.py`: servidor HTTP y endpoints de la API.
- `server-data/products.json`: datos de productos guardados por el servidor.
- `tests/test_server.py`: pruebas automatizadas del backend.
- `icons/icon.svg`: icono de NovaStore.
- `diagrama-arquitectura.png`: diagrama de arquitectura.