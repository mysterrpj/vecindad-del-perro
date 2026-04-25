# Bot WhatsApp con Twilio

## Estado Actual

Ya existe una Firebase Function llamada `twilioWebhook`.

Flujo implementado:

1. Cliente escribe por WhatsApp.
2. Twilio envia el mensaje al webhook.
3. El bot pregunta nombre, mascota, servicio y horario.
4. Al confirmar, guarda la reserva en Firestore.
5. Si el servicio tiene monto, envia un link de pago Culqi.
6. La reserva aparece en el dashboard en `Reservas`.
7. Si Twilio outbound esta configurado, el sistema envia avisos automaticos:
   - recordatorio de pago antes de vencer
   - aviso de pago vencido
   - confirmacion al pagar
   - recordatorio antes de la cita

## URL Del Webhook Twilio

Usa esta URL:

```text
https://us-central1-vecindad-del-perro.cloudfunctions.net/twilioWebhook
```

## Configurar Twilio Sandbox

```text
Twilio Console
Messaging
Try it out
Send a WhatsApp message
Sandbox settings
When a message comes in:
https://us-central1-vecindad-del-perro.cloudfunctions.net/twilioWebhook
Method: POST
```

Luego guarda los cambios.

Para probar desde tu WhatsApp, Twilio mostrara un mensaje tipo:

```text
join palabra-codigo
```

Ese mensaje se envia al numero sandbox de Twilio. Despues de unirte, escribe:

```text
reservar
```

## Configurar Numero WhatsApp Real

Cuando tengas el numero real aprobado:

```text
Twilio Console
Messaging
Senders
WhatsApp senders
Tu numero aprobado
Webhook URL / When a message comes in:
https://us-central1-vecindad-del-perro.cloudfunctions.net/twilioWebhook
Method: POST
```

## Culqi

El bot crea un link de pago:

```text
https://vecindad-del-perro.web.app/pago.html?r=CODIGO_RESERVA
```

El cliente paga en esa pagina con Culqi Checkout. No se deben pedir tarjetas, OTP de Yape ni datos sensibles dentro de WhatsApp.

Modo prueba activo:

- `pk_test_bxGG2MOE6tdVoo65` en `config.js`
- `CULQI_SECRET_KEY` configurado como secreto de Firebase Functions

La llave publica vive en `config.js`. La llave secreta debe quedar solo en Firebase Functions.

## Avisos Automaticos Por WhatsApp

Funciones:

- `reservationNotificationJob`: corre cada 5 minutos.
- `paymentApi`: envia confirmacion cuando Culqi registra pago.

Variables necesarias para enviar WhatsApp proactivo:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
```

Ejemplo de `TWILIO_WHATSAPP_FROM`:

```text
whatsapp:+14155238886
```

En Sandbox es el numero de Twilio. En produccion debe ser tu WhatsApp sender aprobado.

Si estas variables no existen, el sistema no falla: guarda el aviso como `outbound_skipped` en la coleccion `messages`.

## Prueba Rapida

Mensaje inicial:

```text
reservar
```

Luego responder:

```text
Roberto Pichihua
Gringa
1
manana 10 am
SI
```

Respuesta esperada:

```text
Reserva registrada con codigo ...
Para confirmar tu cita paga aqui: https://vecindad-del-perro.web.app/pago.html?r=...
```

## Estado Validado

- `twilioWebhook` responde TwiML valido.
- `paymentApi` carga reservas.
- Culqi test cobra correctamente.
- Una reserva pagada no se puede cobrar dos veces.
