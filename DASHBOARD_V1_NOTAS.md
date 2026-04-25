# Dashboard V1 - La Vecindad del Perro

## Que quedo implementado

- Dashboard modular en `dashboard/`.
- Acceso por PIN temporal en `dashboard/login.html`.
- Modulos separados:
  - `dashboard/index.html`
  - `dashboard/reservas.html`
  - `dashboard/clientes.html`
  - `dashboard/pagos.html`
  - `dashboard/reclamos.html`
  - `dashboard/servicios.html`
  - `dashboard/mensajes.html`
  - `dashboard/configuracion.html`
- Shell compartido con sidebar y estilos comunes en `dashboard/styles.css`.
- Logica compartida en `dashboard/app.js`.
- Capa de datos local en `data-store.js`.
- El formulario de reservas guarda leads operativos y abre WhatsApp con el mensaje armado.
- El libro de reclamaciones guarda reclamos operativos.
- El token de Culqi queda registrado como pago pendiente de backend.

## Acceso

- Ruta: `dashboard/login.html`
- PIN temporal: `1234`
- El PIN se puede cambiar desde `dashboard/configuracion.html`.

## Estado de datos

Este V1 ahora tiene modo hibrido:

- Si `CONFIG.FIREBASE_CONFIG` esta vacio, usa `localStorage`.
- Si `CONFIG.FIREBASE_CONFIG` esta completo, usa Firebase Auth para el dashboard y Firestore para reservas, clientes, pagos, reclamos, servicios y configuracion.
- Las reservas y reclamos publicos pueden crearse sin cuenta; el dashboard requiere usuario autenticado.

El modo local sigue disponible para no bloquear pruebas sin credenciales.

Para produccion real, el siguiente paso es migrar esta capa a:

- Firebase Auth
- Firestore
- Firebase Functions

## Como activar Firebase

1. Crear o usar un proyecto Firebase.
2. Activar Authentication con proveedor Email/Password.
3. Crear un usuario admin desde Firebase Console.
4. Activar Firestore.
5. Copiar la configuracion web del proyecto en `CONFIG.FIREBASE_CONFIG` dentro de `config.js`.
6. Publicar reglas con `firebase deploy --only firestore:rules`.
7. Entrar a `dashboard/login.html` con el correo y contrasena del usuario admin.

## Estado real actual del proyecto `vecindad-del-perro`

- App web Firebase creada: `La Vecindad del Perro Web`.
- Firestore creado en modo nativo, region `nam5`.
- Reglas Firestore desplegadas.
- Hosting publicado en `https://vecindad-del-perro.web.app`.
- `CONFIG.FIREBASE_CONFIG` ya contiene la configuracion web real.
- Firebase Auth Email/Password ya esta inicializado. La prueba con un usuario falso devuelve `INVALID_LOGIN_CREDENTIALS`, que confirma que el proveedor esta activo.
- Dashboard publicado y accesible desde Hosting.

El PIN temporal sigue como fallback, pero para operacion real se debe usar el usuario admin creado en Firebase Auth.

## Pendientes reales para produccion final

- Activar backend Culqi con clave privada y cargo real.
- Restringir admin con custom claims o una coleccion de roles.
- Cambiar pagos para que solo Firebase Functions guarde cargos confirmados.
- Definir variables reales para produccion.
- Colocar API key real de Gemini solo mediante backend o mecanismo seguro.
