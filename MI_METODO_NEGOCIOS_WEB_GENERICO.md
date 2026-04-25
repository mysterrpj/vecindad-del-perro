# MI_METODO_NEGOCIOS_WEB_GENERICO

## Proposito

Este documento es mi metodo generico para proyectos web orientados a negocio.
Esta pensado para reutilizarse en otros proyectos y para darselo a otros asistentes o agentes como instruccion base de trabajo.

No describe un proyecto puntual.
Describe como quiero que se piense, se construya y se cierre cualquier proyecto web comercial que involucre landing, pagos, WhatsApp, dashboards, chatbots informativos y despliegue.

## Regla principal

Quiero que el asistente piense el proyecto como un sistema comercial completo, no como una pieza visual aislada.

La prioridad siempre debe ser:

1. que el negocio pueda vender
2. que el usuario pueda entender
3. que el sistema pueda cobrar
4. que el negocio pueda operar
5. que todo quede listo para credenciales reales y despliegue

## Como quiero que trabajes

Cuando te entregue un proyecto web, quiero que trabajes con este criterio:

- primero entender el proyecto actual
- luego detectar que ya existe y que falta
- despues cerrar lo importante de punta a punta
- no dejar el trabajo a medias
- no quedarte en recomendaciones abstractas
- si algo puede quedar listo, dejalo listo

## Regla de enfoque

No quiero enfoque de "demo bonita".
Quiero enfoque de "negocio funcional".

Eso implica priorizar:

- conversion
- confianza
- pagos
- automatizacion operativa
- panel administrativo
- persistencia de datos
- despliegue real

## Regla sobre la UI

Si el proyecto ya tiene un diseno o una estructura visual definida, no quiero rediseno innecesario.

El asistente debe:

- respetar la UI existente
- no romper la estructura visual sin instruccion explicita
- resolver primero backend, logica, flujos, cumplimiento legal y operaciones
- tocar UI solo si es estrictamente necesario o si se lo pido

## Objetivo de cualquier proyecto web de negocio

Quiero que el asistente entienda que una web de negocio debe cubrir como minimo:

- presentacion clara del negocio
- oferta clara de productos o servicios
- captacion o conversion
- pago o cierre comercial
- seguimiento operativo
- cumplimiento minimo legal/comercial
- posibilidad de escalar a produccion

## Resultado esperado por defecto

Salvo que yo diga otra cosa, quiero que el resultado final apunte a esto:

- landing o frontend funcional
- integraciones operativas
- dashboard administrativo V1
- chatbot informativo si aporta al negocio
- datos reales o ficticios coherentes
- variables de entorno listas
- proyecto preparado para solo poner credenciales reales
- despliegue final claramente definido

## Flujo de trabajo esperado

### Fase 1. Analisis del proyecto

Antes de proponer cambios, el asistente debe revisar:

- estructura del repo
- frontend actual
- backend actual
- variables de entorno
- integraciones existentes
- documentos o notas del proyecto
- flujo comercial real del sitio

Luego debe responderse:

- que ya esta hecho
- que falta
- que esta roto
- que esta solo simulado
- que impide cerrar el proyecto

### Fase 2. Cierre del frontend comercial

El asistente debe dejar el frontend listo para negocio real, no solo para verse bien.

Debe validar:

- propuesta de valor clara
- CTA visibles
- datos del negocio consistentes
- rutas y acciones que realmente funcionen
- formularios con validacion
- experiencia de compra o contacto funcional

### Fase 3. Cumplimiento comercial y legal

Si el proyecto usa pasarela de pago o vende online, el asistente debe contemplar cumplimiento minimo.

Como base, revisar si existen o deben crearse:

- centro de ayuda
- politica de envios y despacho
- politica de cambios y devoluciones
- politica de privacidad
- terminos de uso o terminos y condiciones
- libro de reclamaciones si aplica por pais o pasarela
- datos visibles del negocio: razon social, RUC o equivalente, direccion, telefono, correo

Si una pasarela como Culqi pide requisitos concretos, quiero que se tomen como referencia oficial y se aterricen al proyecto.

## Regla sobre integraciones

No quiero integraciones decorativas.
Si una integracion aparece en el proyecto, quiero que quede util.

Ejemplos:

- Culqi o pasarela de pago: debe poder cobrar o quedar lista para cobrar
- Twilio o WhatsApp: debe servir para operacion o notificacion real
- Firebase: debe usarse como stack de deploy o backend real si esa es la direccion del proyecto
- chatbot informativo: debe orientar, reducir dudas y empujar a una accion util

## Regla sobre datos ficticios

Si faltan credenciales o datos finales del negocio, no quiero que eso frene el proyecto.

El asistente puede usar:

- datos ficticios coherentes
- placeholders claros
- ejemplos consistentes con el rubro del negocio

Pero debe cumplir estas reglas:

- si en el proyecto ya existen datos reales visibles, esos mandan
- lo ficticio debe ser facil de reemplazar
- no mezclar datos contradictorios
- no dejar dudas sobre que es real y que es placeholder

## Regla especifica para chatbot informativo

Si el proyecto se beneficiaria de un bot que responde preguntas, quiero que el asistente piense el chatbot como una herramienta comercial y de soporte ligero, no como un juguete.

Su funcion debe ser:

- responder preguntas frecuentes
- orientar sobre precios, planes, servicios o productos
- resolver dudas de horario, ubicacion, cobertura, stock o proceso de compra
- reducir friccion antes del WhatsApp o del checkout
- empujar a una accion concreta cuando el usuario ya esta listo

## Cuando quiero un chatbot informativo

Normalmente quiero chatbot cuando:

- el negocio recibe muchas preguntas repetidas
- hay varios servicios, planes o productos
- hay objeciones frecuentes antes de comprar
- conviene derivar a WhatsApp con el usuario mejor informado
- la web necesita una capa de ayuda rapida sin depender de un humano

No quiero chatbot solo por moda.
Si no aporta conversion, claridad o soporte, no es prioridad.

## Patron recomendado para replicar un bot informativo

Tomando como referencia proyectos anteriores, la referencia que quiero usar para bots informativos es:

- `AppWebMegagym`

Eso significa que, salvo que yo diga lo contrario, cualquier asistente debe modelar el bot segun el enfoque de `AppWebMegagym`.

El patron que prefiero es este:

### Base recomendada

- UI de widget flotante simple
- logica conversacional en JavaScript claro
- respuestas predefinidas o semi-estructuradas para preguntas frecuentes
- CTA rapidos hacia WhatsApp, checkout o formulario
- quick replies o botones de preguntas comunes
- voz opcional, no obligatoria

### Arquitectura recomendada

Separar el bot en piezas claras:

- `index.html`
- `chatbot.css`
- `chatbot.js`
- `voice-client.js` solo si hay voz
- `config.js` o archivo equivalente para claves o configuracion publica

### Criterio sobre la UI del bot

El chatbot debe verse integrado al sitio, pero no debe obligar a redisenar toda la pagina.

Debe incluir como minimo:

- boton flotante para abrir o cerrar
- cabecera con nombre del asistente y rol
- area de mensajes
- input de texto
- boton de enviar
- quick replies opcionales
- boton de microfono solo si existe voz

## Lecciones tomadas de referencias reales

### Patron tipo `AppWebMegagym`

Este patron es mi referencia principal y unica cuando quiero un bot mas comercial y mas replicable:

- el chatbot se inyecta por JavaScript
- el widget no ensucia tanto el HTML principal
- existe una capa de logica con intents o reglas locales
- hay quick actions enfocadas en conversion
- la voz va separada en `voice-client.js`
- la configuracion se centraliza mejor

Fortalezas:

- mas modular
- mas facil de reutilizar entre proyectos
- mejor para bots de informes y conversion

Riesgos:

- requiere mas orden tecnico
- puede crecer rapido si no se documenta bien

## Decision generica para futuros proyectos

Si no se especifica otra cosa, quiero que se use este criterio:

- usar `AppWebMegagym` como referencia principal para la arquitectura del bot
- la voz debe ser opcional y desacoplada
- el texto y la utilidad del bot tienen prioridad sobre efectos o complejidad
- si hay duda sobre como estructurar el bot, gana `AppWebMegagym`

## Como debe construirse el cerebro del bot

No quiero un bot que improvise demasiado.
Quiero que primero responda bien lo esencial del negocio.

La logica base debe cubrir:

- saludo inicial
- precios o planes
- servicios o productos
- horarios
- ubicacion
- metodos de pago
- como comprar o reservar
- politica de cambios o soporte si aplica
- derivacion a WhatsApp cuando corresponda

## Prioridad del motor conversacional

Para la mayoria de proyectos, prefiero esta prioridad:

1. reglas e intents locales bien hechas
2. quick replies
3. CTA claros
4. IA o voz como capa adicional

Eso significa que el bot debe seguir siendo util incluso si:

- falla la API externa
- no hay credito
- la voz se desactiva
- la clave todavia no esta configurada

## Contenido que debe conocer el bot

El bot debe usar informacion oficial del negocio extraida de:

- `index.html`
- textos legales
- precios visibles
- horarios visibles
- direccion y telefonos visibles
- FAQ del sitio
- datos del proyecto o documentos del repo

Si falta algo, se pueden usar placeholders coherentes.
Pero el bot no debe inventar datos sensibles ni contradictorios.

## Regla sobre respuestas del bot

Quiero respuestas:

- utiles
- breves
- naturales
- comerciales sin sonar pesadas
- orientadas a resolver la duda
- orientadas a llevar a la siguiente accion

No quiero respuestas:

- filosoficas
- demasiado largas
- ambiguas
- llenas de relleno
- que prometan cosas no visibles en la web

## Quick replies recomendadas

Si se implementa chatbot, normalmente quiero quick replies para:

- precios
- servicios o productos
- horario
- ubicacion
- promociones
- formas de pago
- hablar por WhatsApp

## Regla sobre voz

La voz es un extra, no el nucleo.

Si se usa voz:

- debe vivir separada del bot de texto
- debe poder apagarse sin romper el chatbot
- debe usar un archivo dedicado como `voice-client.js`
- debe tener manejo claro de estados: conectado, escuchando, error, desconectado
- debe tener timeout o cierre automatico si consume credito

Si la voz complica el cierre del proyecto, quiero primero el bot de texto funcionando.

## Regla sobre claves y configuracion del bot

No quiero claves regadas por cualquier archivo.

Quiero que la configuracion del bot quede ordenada:

- API keys o configuracion publica en un archivo claro
- variables de entorno si aplica
- mensajes de fallback si falta configuracion
- posibilidad de dejar el bot informativo funcionando aun sin IA real

## Regla sobre degradacion elegante

Si el bot usa IA y la IA falla, quiero una salida razonable.

Ejemplos de fallback aceptables:

- responder con intents locales
- sugerir quick replies
- invitar a WhatsApp
- mostrar mensaje claro de indisponibilidad temporal

No quiero que el widget quede muerto o roto.

## Dashboard administrativo V1

Por defecto, si el proyecto lo amerita, quiero que el asistente piense en un dashboard V1.

Ese dashboard no tiene que ser perfecto.
Tiene que ser util.

Como minimo, debe evaluar si hacen falta vistas como:

- resumen
- pedidos
- pagos
- clientes o leads
- reclamos o incidencias
- citas o reservas
- inventario o catalogo

El dashboard debe conectarse a datos reales si existen.
Si todavia no existen, puede funcionar con datos ficticios o modo demo coherente.

## Regla sobre backend

No quiero backend a medias.

Si el proyecto requiere backend, quiero que el asistente lo deje:

- con endpoints utiles
- con validaciones
- con manejo de errores
- con variables de entorno
- con registros operativos
- con estructura lista para pasar a produccion

## Regla sobre "listo para credenciales"

Cuando yo diga que quiero el proyecto "listo para solo poner credenciales", eso significa:

- la arquitectura ya esta hecha
- la logica ya esta hecha
- el flujo ya esta hecho
- los formularios ya estan hechos
- el dashboard ya existe
- las integraciones ya estan conectadas por variables
- el chatbot ya responde lo esencial del negocio
- solo faltan secretos reales, ids reales o dominio final

No significa:

- dejar TODOs vagos
- dejar pantallas vacias
- dejar pseudocodigo
- dejar notas de "esto se puede hacer despues"

## Regla sobre despliegue

No quiero que el despliegue aparezca al final como improvisacion.

Desde el inicio, el asistente debe pensar:

- donde se publicara el frontend
- donde correra el backend
- donde se guardaran los datos
- como se manejaran secretos
- que stack de produccion se usara

Si el proyecto va con Firebase, normalmente quiero que se contemple:

- Firebase Hosting
- Firebase Functions
- Firestore
- variables o secretos
- rutas y rewrites

## Metodo de cierre

Para considerar que un proyecto esta bien trabajado, el asistente debe intentar dejar:

- analisis claro
- implementacion real
- documentacion minima util
- verificacion tecnica
- pendientes reales, no imaginarios

## Lo que no quiero

No quiero:

- respuestas filosoficas
- recomendaciones solo cosmeticas
- redisenos innecesarios
- backlog eterno sin ejecucion
- soluciones parciales vendidas como completas
- cambios que rompan lo que ya funciona
- chatbots bonitos pero inutiles
- bots que dependan 100 por ciento de una IA externa para responder lo basico

## Lo que si quiero

Quiero:

- decisiones concretas
- criterio comercial
- solucion end to end
- archivos listos
- codigo util
- documentacion reutilizable
- pendiente final bien delimitado
- bots que informen y conviertan

## Instruccion operativa reutilizable

Si te doy un proyecto nuevo, puedes asumir esta instruccion base detallada:

"Analiza primero el proyecto actual y no empieces a construir a ciegas. Revisa estructura del repo, frontend, backend, variables de entorno, integraciones existentes, documentos del proyecto y flujo comercial real. Identifica con claridad que ya esta hecho, que falta, que esta roto, que esta simulado y que impide cerrar el proyecto.

Si te doy proyectos o carpetas de referencia, esas referencias son obligatorias. Debes abrir primero los archivos relevantes de esas referencias y detectar su arquitectura real antes de implementar. No improvises una version generica. Si la referencia usa layout compartido, sidebar, paginas separadas, estilos comunes o modulos distintos, replica esa estructura base salvo que yo te diga explicitamente que no.

No quiero enfoque de demo bonita. Quiero enfoque de negocio funcional. La prioridad es: conversion, claridad, cobro, operacion, cumplimiento minimo, dashboard util, chatbot util, despliegue bien pensado. Respeta la UI existente salvo instruccion contraria. No redisenes por gusto. Si algo visual ya esta definido, resuelve primero backend, logica, flujos, operaciones y cumplimiento.

Cuando el proyecto necesite dashboard, no asumas por defecto un solo archivo enorme. Si la referencia o el tipo de proyecto sugiere modulos separados, construye un dashboard modular con acceso separado si aplica, carpeta propia, paginas por modulo, estilos compartidos y logica compartida. Como base, evalua siempre separar: resumen, pedidos o flujo principal, pagos y reclamos. No mezcles en una sola pagina lo que deberia vivir en modulos distintos.

Cuando el proyecto necesite chatbot informativo, prioriza utilidad comercial por encima de efectos. Usa reglas e intents locales, quick replies y CTA claros. Si hay referencia explicita para el bot, como AppWebMegagym, esa referencia manda. No dependas 100 por ciento de IA externa para responder lo esencial del negocio.

Si faltan datos finales o credenciales, no frenes el proyecto. Usa placeholders coherentes, faciles de reemplazar y no contradictorios. Pero deja claro que es placeholder y que es dato real del proyecto. Si digo listo para credenciales, eso significa que la arquitectura, flujos, formularios, dashboard, integraciones y bot ya deben existir; solo deben faltar secretos, ids o dominios finales.

No afirmes de forma ambigua que algo ya esta corriendo para mi si solo lo validaste en tu propio entorno. Distingue siempre entre: validado en tu entorno y realmente ejecutandose en mi sesion local. Si el proyecto necesita localhost, debes indicarme con precision que comando debo correr yo y que rutas debo abrir yo.

Cierra el proyecto de punta a punta siempre que sea posible. Eso incluye implementacion real, documentacion minima util, verificacion tecnica y pendientes reales bien delimitados. No vendas soluciones parciales como completas. No dejes backlog eterno, pseudocodigo, TODOs vagos ni pantallas vacias.

Antes de dar por terminado un proyecto con referencias, verifica explicitamente: ya abriste las referencias correctas, ya replicaste la estructura base, no mezclaste modulos que debian ir separados, el flujo comercial funciona, el backend no esta a medias, el dashboard es util, el chatbot es util, el proyecto queda listo para credenciales reales y el despliegue final queda definido o marcado con pendiente de confirmar si aun no existe dato suficiente."

## Criterio final

La forma correcta de trabajar mis proyectos web es esta:

- negocio primero
- funcionalidad primero
- cumplimiento minimo real
- integraciones utiles
- dashboard util
- chatbot util
- credenciales al final
- despliegue bien pensado

## Frase resumen

Quiero proyectos web que queden terminados de verdad, no proyectos bonitos pero incompletos.

## Lecciones aprendidas y errores reales a no repetir

Esta seccion consolida errores reales cometidos en proyectos recientes para convertirlos en reglas operativas obligatorias.

No es teoria.
Son fallos que ya ocurrieron y que no deben repetirse.

## Error real 1. Construir un dashboard sin abrir primero los dashboards de referencia

### Que paso

En un proyecto se pidio usar como referencia dashboards existentes en proyectos previos.

El error fue asumir el estilo y la estructura del dashboard sin abrir primero esas referencias concretas.

Como resultado:

- se construyo un panel funcional pero no alineado con la expectativa real
- se resolvio la operacion minima pero no se replico la arquitectura visual esperada
- se entrego primero un dashboard generico en lugar de uno basado en las referencias dadas

### Por que estuvo mal

Cuando el usuario da carpetas o proyectos de referencia, esas referencias dejan de ser opcionales.
No basta con inspirarse vagamente.
Hay que inspeccionarlas antes de implementar.

### Nueva regla obligatoria

Si el usuario menciona uno o mas proyectos como referencia de dashboard, panel, landing, bot o arquitectura:

- primero abrir los archivos relevantes de esas referencias
- identificar la estructura exacta que se esta usando
- copiar el patron estructural antes de reinterpretarlo
- no improvisar una version generica solo porque ya es funcional

### Regla practica

Antes de construir un dashboard basado en referencias, revisar como minimo:

- archivo de entrada del dashboard
- layout general
- sidebar o navegacion
- separacion por modulos o paginas
- estilos compartidos
- logica de datos o render

Si eso no se hace primero, el trabajo arranca mal.

## Error real 2. Mezclar todo el dashboard en una sola pagina cuando la referencia trabaja por modulos separados

### Que paso

Se construyo un dashboard largo en un solo archivo con secciones internas y anclas.

Pero la referencia esperada usaba modulos separados, por ejemplo:

- resumen o index
- pedidos o citas
- pagos
- reclamos

### Por que estuvo mal

Aunque el panel funcionaba, no respetaba la arquitectura de operacion del proyecto de referencia.
No era solo un problema visual.
Era un problema de estructura.

### Nueva regla obligatoria para dashboards

Si el dashboard de referencia esta dividido en varias paginas o modulos separados, el nuevo dashboard debe respetar esa estructura salvo instruccion explicita en contra.

Eso significa que, por defecto, si el negocio requiere dashboard V1, debe evaluarse esta separacion:

- `dashboard/index.html` o equivalente para resumen
- `dashboard/pedidos.html` o equivalente para operacion comercial principal
- `dashboard/pagos.html` o equivalente para cobros
- `dashboard/reclamos.html` o equivalente para incidencias

Y si aplica segun el negocio:

- `dashboard/clientes.html`
- `dashboard/inventario.html`
- `dashboard/citas.html`

### Regla de implementacion

No construir un solo `admin.html` enorme si la referencia trabaja con:

- paginas separadas
- shell compartido
- estilos compartidos
- logica comun reutilizable

En esos casos, la forma correcta es:

- login o acceso en un archivo aparte si corresponde
- carpeta `dashboard/`
- paginas modulares
- `styles.css` compartido
- `app.js` o scripts comunes para render y data

## Error real 3. Resolver "funcionalidad" antes que "alineacion con la referencia" cuando ambas eran obligatorias

### Que paso

Se priorizo cerrar backend, endpoints, login y panel util antes de verificar si la estructura final del dashboard coincidia con el patron pedido.

### Por que estuvo mal

En este tipo de proyecto no alcanza con que algo funcione.
Si el usuario dio referencia concreta, la definicion de terminado incluye:

- funcionalidad
- alineacion estructural
- alineacion visual razonable

No solo una de esas tres.

### Nueva regla de prioridad

Cuando el usuario entrega una referencia concreta y tambien pide cierre funcional, la prioridad correcta es esta:

1. entender la referencia
2. entender el proyecto actual
3. definir la arquitectura final respetando ambas cosas
4. implementar funcionalidad dentro de esa arquitectura

No al reves.

## Error real 4. No distinguir claramente entre "puedo validarlo en mi entorno" y "ya esta ejecutandose en la sesion local del usuario"

### Que paso

Se levanto y valido un servidor desde el entorno del asistente, pero eso no garantizaba que el navegador local del usuario pudiera verlo.
Luego el usuario no podia acceder a `localhost` y eso genero confusion.

### Por que estuvo mal

Validar un servidor desde un entorno de trabajo aislado no equivale a dejarlo realmente corriendo en la sesion del usuario.
Si no se explica esa diferencia, se crea una falsa sensacion de cierre.

### Nueva regla obligatoria sobre ejecucion local

Si el proyecto necesita correr en `localhost`, el asistente debe distinguir explicitamente entre:

- servidor validado dentro de su propio entorno
- servidor realmente levantado en la maquina o sesion del usuario

### Regla practica

Nunca afirmar de forma ambigua:

- "ya esta corriendo para ti"
- "ya puedes verlo"

si no se tiene certeza real de que el proceso esta vivo en la sesion local del usuario.

La forma correcta de expresarlo es:

- "lo valide en mi entorno"
- "tu necesitas levantarlo en tu sesion local con este comando"
- "si quieres, te dejo un script de arranque para tu maquina"

## Error real 5. No convertir inmediatamente el error cometido en regla reusable del metodo

### Que paso

El error se corrigio en el proyecto, pero si no se documenta dentro del metodo base, se corre el riesgo de repetirlo en el siguiente proyecto.

### Nueva regla obligatoria

Cuando ocurra un error importante de criterio, arquitectura o interpretacion en un proyecto real, debe agregarse una leccion reusable al metodo base.

Especialmente si el error fue de este tipo:

- no seguir referencias concretas
- mezclar modulos que debian ir separados
- confundir demo funcional con arquitectura correcta
- asumir despliegue o ejecucion donde no estaba garantizado
- resolver solo backend o solo UI cuando habia que cerrar ambas cosas juntas

## Regla nueva sobre referencias obligatorias

Si el usuario dice frases como:

- "usa este proyecto como referencia"
- "toma este dashboard como base"
- "hazlo como este otro proyecto"
- "te di estos proyectos como referencia"

entonces se vuelve obligatorio:

- leer esas referencias antes de implementar
- nombrarlas explicitamente en el razonamiento de trabajo
- reflejar su estructura en la solucion final
- no reemplazarlas por una version propia simplificada sin autorizacion

## Regla nueva sobre dashboards V1

A partir de ahora, para dashboards V1 en proyectos comerciales, asumir por defecto este criterio si la referencia usa separacion modular:

- acceso o login separado
- carpeta de dashboard separada
- pagina resumen
- pagina de pedidos, citas o flujo principal del negocio
- pagina de pagos
- pagina de reclamos o incidencias
- estilos compartidos
- logica compartida

No concentrar todo en un solo archivo salvo que el proyecto de referencia tambien lo haga.

## Regla nueva sobre definicion de "respetar referencia"

Respetar una referencia no significa copiar colores por encima.
Significa respetar:

- organizacion de archivos
- patron de navegacion
- separacion de responsabilidades
- jerarquia visual
- tipo de shell o layout
- modulo principal de operacion

## Lista de control obligatoria antes de cerrar un proyecto con referencias

Antes de considerar terminado un proyecto que usa referencias previas, revisar esta lista:

- ya abri los archivos de referencia clave
- ya identifique si la referencia usa una pagina unica o varias paginas
- ya identifique si hay layout compartido
- ya identifique si hay estilos compartidos
- ya identifique la logica comun reutilizable
- mi implementacion replica esa estructura base
- no mezcle modulos que la referencia separa
- no afirme que algo corre localmente para el usuario si solo lo valide en mi entorno

## Frase de control para futuros proyectos

Si el usuario entrega referencias concretas, primero se replica la arquitectura de la referencia y despues se rellena la funcionalidad del negocio.

No al reves.


## Checklist operativo obligatorio por fases

Este checklist no reemplaza el criterio.
Lo convierte en protocolo.

Debe usarse como secuencia de control en cualquier proyecto nuevo.

## Fase 0. Confirmacion del tipo de proyecto

Antes de tocar codigo, confirmar mentalmente que tipo de proyecto es:

- landing comercial simple
- landing con pagos
- landing con dashboard
- landing con chatbot
- sistema mixto con frontend, backend y operacion

Si hay duda, asumir el caso mas completo y luego recortar.
No asumir el caso mas simple por comodidad.

## Fase 1. Lectura obligatoria del contexto

Antes de implementar, revisar:

- estructura del repo
- archivos principales del frontend
- backend existente si existe
- variables de entorno
- integraciones visibles
- documentos del proyecto
- notas y handoff si existen
- flujo comercial real del sitio

Preguntas de control:

- ya entendi que vende el negocio
- ya entendi como convierte
- ya entendi como cobraria
- ya entendi como operaria despues de vender
- ya detecte que esta real y que esta simulado

No avanzar si todavia no puedes responder eso.

## Fase 2. Lectura obligatoria de referencias

Si el usuario dio referencias, revisar antes de implementar:

- archivo de entrada principal
- layout general
- patron visual
- estructura de carpetas
- separacion por modulos o paginas
- logica compartida
- assets compartidos

Preguntas de control:

- ya abri las referencias correctas
- ya se si la referencia usa una pagina o varias
- ya se si la referencia usa shell compartido
- ya se si la referencia separa login, dashboard, pagos y reclamos
- ya se que parte debo copiar estructuralmente y que parte adaptar

No reemplazar una referencia concreta por una interpretacion personal simplificada.

## Fase 3. Definicion de arquitectura final antes de codificar

Antes de modificar archivos, definir la arquitectura final que se va a respetar.

Como minimo, decidir:

- donde vive el frontend
- donde vive el backend
- donde se guardan datos
- como se configuran variables
- como se organizan modulos clave
- como se publica el proyecto

Si hay dashboard, decidir explicitamente si sera:

- una sola pagina
- o carpeta `dashboard/` con modulos separados

Si la referencia usa modulos separados, esa debe ser la opcion por defecto.

## Fase 4. Cierre del frontend comercial

Validar que el frontend cierre el negocio y no solo se vea bien.

Checklist:

- propuesta de valor clara
- CTA visibles
- formularios reales
- acciones conectadas a algo util
- datos del negocio consistentes
- links que funcionen
- WhatsApp util si aplica
- checkout o cierre comercial entendible
- mobile usable

## Fase 5. Cierre del backend y operaciones

Si el proyecto necesita backend, debe quedar:

- con endpoints utiles
- con validaciones
- con manejo de errores
- con variables de entorno
- con persistencia o estrategia clara de datos
- con logs o registros operativos basicos

Preguntas de control:

- el backend ya resuelve algo real del negocio
- los formularios ya pegan a endpoints reales
- existe una estructura lista para poner credenciales
- no hay backend fantasma ni pseudocodigo disfrazado

## Fase 6. Dashboard administrativo

Si el proyecto amerita dashboard, revisar esto antes de darlo por terminado:

- existe login o acceso si corresponde
- existe resumen o index del dashboard
- existe modulo principal del negocio
- existe modulo de pagos si aplica
- existe modulo de reclamos o incidencias si aplica
- existe estilo compartido
- existe logica compartida
- no esta todo mezclado en un solo archivo si la referencia no lo hace

Preguntas de control:

- el dashboard se parece estructuralmente a la referencia correcta
- el dashboard sirve para operar hoy, no solo para mostrar cajas bonitas
- cada modulo principal tiene su propio archivo cuando corresponde

## Fase 7. Chatbot informativo

Si el proyecto necesita bot, validar:

- responde dudas reales del negocio
- usa datos del proyecto o placeholders coherentes
- tiene quick replies utiles
- empuja a una accion concreta
- no depende totalmente de IA externa
- si hay referencia de bot, la respeta
- si la referencia incluye voz, identificar exactamente que proveedor usa
- no asumir OpenAI, Gemini o navegador sin revisar el codigo real
- separar siempre bot de texto y cliente de voz
- dejar fallback local si la voz avanzada depende de API key
- dejar variables, endpoint publico y configuracion listos si la API key aun no existe

Preguntas de control:

- el bot informa y convierte
- el bot no inventa datos sensibles
- el bot sigue siendo util si falla la API externa
- la voz avanzada quedo lista para activarse sin rearmar arquitectura
- ya documente que cosa falta para que la voz suene como la referencia

## Fase 8. Cumplimiento minimo comercial y legal

Si el proyecto vende o cobra, revisar:

- politica de privacidad
- terminos
- politica de envios
- devoluciones o cambios
- libro de reclamaciones si aplica
- datos visibles del negocio

No dejar eso como nota abstracta si ya se puede montar.

## Fase 9. Ejecucion local y despliegue

Antes de afirmar que algo esta listo, distinguir siempre:

- validado en entorno del asistente
- ejecutandose de verdad en la sesion local del usuario

Checklist:

- el comando de arranque esta claro
- el usuario sabe que URL abrir
- se aclaro si el proceso debe levantarse en su propia maquina o sesion
- el despliegue final esta definido o marcado como pendiente de confirmar

Nunca afirmar ambiguamente que ya esta corriendo para el usuario si no se tiene certeza real.

## Fase 10. Cierre final

Antes de cerrar un proyecto, revisar esta lista final:

- segui las referencias correctas
- respete la UI existente o la referencia correcta
- no mezcle modulos que debian ir separados
- el frontend funciona
- el backend funciona
- el dashboard es util
- el chatbot es util si aplica
- el proyecto esta listo para credenciales reales
- los pendientes finales son reales y acotados
- no estoy vendiendo como completo algo que todavia no lo es

## Regla de salida final

Si una parte quedo resuelta solo en tu entorno y no en el del usuario, debes decirlo claramente.

Si una parte quedo lista solo para credenciales, debes decir exactamente que variable falta.

Si una referencia no fue seguida al principio, debes corregir el rumbo antes de cerrar, no justificar despues por que hiciste otra cosa.


## Regla especifica nueva para agentes de voz con referencia real

Cuando el usuario entregue una referencia con agente de voz, no basta con poner un microfono y usar la voz del navegador.

Primero hay que responder estas preguntas leyendo el codigo real de la referencia:

- que proveedor usa la voz
- si usa API key publica o privada
- si usa WebSocket, REST o SDK
- si usa STT, TTS o audio nativo bidireccional
- que modelo usa
- que voz usa
- si existe fallback local o no

Regla operativa:

- si la referencia usa Gemini realtime, se replica esa arquitectura
- si la referencia usa OpenAI realtime, se replica esa arquitectura
- si la referencia usa solo navegador, se documenta eso y no se promete voz avanzada

Si no hay API key todavia:

- se deja la arquitectura lista
- se crean las variables necesarias en `.env` y `.env.example`
- se expone la configuracion minima desde backend si hace falta
- se desacopla `chatbot.js` de `voice-client.js`
- se deja un fallback local para que el bot siga siendo usable
- se informa claramente que el sonido final aun no sera igual al de la referencia hasta poner la key real

Nunca marcar como "voz final lista" algo que solo funciona con `speechSynthesis` del navegador si la referencia usaba un proveedor realtime externo.

La frase correcta en ese caso es:

"La arquitectura de voz ya quedo lista. Falta colocar la API key del proveedor real para que suene como la referencia."


## Error real agregado al registro de lecciones

Error cometido:

- se implemento primero un agente de voz local del navegador, pero el usuario esperaba el mismo patron de voz de la referencia
- no se verifico al inicio que la referencia de voz usaba Gemini realtime por WebSocket y no OpenAI

Como se resuelve correctamente en futuros proyectos:

- abrir primero el archivo real del cliente de voz de la referencia
- identificar proveedor, modelo, voz y forma de autenticacion
- replicar la arquitectura aunque la API key aun no exista
- dejar fallback local solo como contingencia, no como reemplazo silencioso
- documentar que variable exacta falta para activar la voz avanzada
