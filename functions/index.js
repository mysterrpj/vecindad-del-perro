const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://vecindad-del-perro.web.app';
const CULQI_API_URL = 'https://api.culqi.com/v2';
const culqiSecretKey = defineSecret('CULQI_SECRET_KEY');

const SERVICES = [
  { id: 'bano', name: 'Bano Completo', price: 35, duration: 90 },
  { id: 'grooming', name: 'Grooming Completo', price: 55, duration: 120 },
  { id: 'indumentaria', name: 'Indumentaria', price: 20, duration: 30 },
  { id: 'spa', name: 'Spa Relax', price: 65, duration: 120 },
  { id: 'dental', name: 'Higiene Dental', price: 25, duration: 45 },
  { id: 'consulta', name: 'Consulta', price: 0, duration: 15 }
];

const DEFAULT_SETTINGS = {
  businessName: 'La Vecindad del Perro',
  phone: '970 716 064',
  whatsapp: '51970716064',
  address: 'Mz P1 Lote 26, Montenegro, SJL',
  hours: '7:00 AM - 8:00 PM'
};

const INITIAL_STEP = 'ask_name';
const TIME_ZONE = 'America/Lima';
const PAYMENT_HOLD_MINUTES = 30;
const PAYMENT_REMINDER_BEFORE_MINUTES = 10;
const APPOINTMENT_REMINDER_BEFORE_HOURS = 24;
const CLOSED_STATUSES = ['cancelada', 'cancelado', 'terminada', 'terminado', 'pago vencido'];
const WEEKDAYS = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
};

function text(value) {
  return String(value || '').trim();
}

function normalizePhone(value) {
  return text(value).replace(/^whatsapp:/i, '').replace(/[^\d+]/g, '');
}

function onlyDigits(value) {
  return text(value).replace(/\D/g, '');
}

function normalizeMessage(value) {
  return text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function limaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(map.weekday);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday,
    hour: Number(map.hour),
    minute: Number(map.minute)
  };
}

function limaDate(year, month, day, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute));
}

function addDays(parts, days) {
  const date = limaDate(parts.year, parts.month, parts.day + days);
  return limaParts(date);
}

function minutesToTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTimeToMinutes(value) {
  const matches = [...normalizeMessage(value).matchAll(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?(?=\s|$)/g)];
  if (!matches.length) return null;

  const match = matches[matches.length - 1];

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const marker = (match[3] || '').replace(/\./g, '');
  if (minute > 59 || hour > 23) return null;
  if (marker === 'pm' && hour < 12) hour += 12;
  if (marker === 'am' && hour === 12) hour = 0;
  if (!marker && hour >= 1 && hour <= 6) hour += 12;
  return hour * 60 + minute;
}

function parseBusinessHours(hoursText) {
  const matches = text(hoursText).match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.)?/gi) || [];
  const open = parseTimeToMinutes(matches[0] || '7:00 AM');
  const close = parseTimeToMinutes(matches[1] || '8:00 PM');
  return {
    open: Number.isFinite(open) ? open : 420,
    close: Number.isFinite(close) ? close : 1200
  };
}

function parseRequestedSlot(input, settings) {
  const normalized = normalizeMessage(input);
  const timeMinutes = parseTimeToMinutes(input);
  if (timeMinutes === null) {
    return { ok: false, reason: 'missing_time' };
  }

  const today = limaParts();
  let target = today;
  const dateMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    let year = dateMatch[3] ? Number(dateMatch[3]) : today.year;
    if (year < 100) year += 2000;
    target = limaParts(limaDate(year, month, day));
  } else if (normalized.includes('pasado manana')) {
    target = addDays(today, 2);
  } else if (normalized.includes('manana')) {
    target = addDays(today, 1);
  } else if (!normalized.includes('hoy')) {
    const weekdayName = Object.keys(WEEKDAYS).find((name) => normalized.includes(name));
    if (weekdayName) {
      const requested = WEEKDAYS[weekdayName];
      let delta = (requested - today.weekday + 7) % 7;
      if (delta === 0) delta = 7;
      target = addDays(today, delta);
    }
  }

  const requestedDate = limaDate(target.year, target.month, target.day, Math.floor(timeMinutes / 60), timeMinutes % 60);
  const now = new Date();
  const { open, close } = parseBusinessHours(settings.hours);
  if (requestedDate.getTime() <= now.getTime()) {
    return { ok: false, reason: 'past' };
  }
  if (timeMinutes < open || timeMinutes >= close) {
    return { ok: false, reason: 'closed', open, close };
  }

  return { ok: true, date: requestedDate, minutes: timeMinutes, open, close };
}

function formatSlot(date) {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function formatShortDateTime(date) {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function slotDayRange(date) {
  const parts = limaParts(date);
  return {
    start: limaDate(parts.year, parts.month, parts.day),
    end: limaDate(parts.year, parts.month, parts.day + 1)
  };
}

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPendingPayment(reservation) {
  return /pendiente de pago/i.test(reservation.status || '') && !/pagad/i.test(reservation.paymentStatus || '');
}

function paymentHoldExpiresAt(reservation) {
  const explicit = toDate(reservation.paymentHoldExpiresAt);
  if (explicit) return explicit;

  const createdAt = toDate(reservation.createdAt);
  return createdAt ? new Date(createdAt.getTime() + PAYMENT_HOLD_MINUTES * 60000) : null;
}

function isPaymentHoldExpired(reservation) {
  if (!isPendingPayment(reservation)) return false;
  const expiresAt = paymentHoldExpiresAt(reservation);
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

function isBlockingReservation(reservation) {
  if (CLOSED_STATUSES.includes(normalizeMessage(reservation.status))) return false;
  if (isPaymentHoldExpired(reservation)) return false;
  return true;
}

async function reservationsForDay(date) {
  const { start, end } = slotDayRange(date);
  const snapshot = await db.collection('reservations')
    .where('scheduledSlot', '>=', start)
    .where('scheduledSlot', '<', end)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function reservationDuration(reservation) {
  return Math.max(Number(reservation.duration || 0), 30);
}

function hasConflict(startDate, duration, reservations) {
  const start = startDate.getTime();
  const end = start + duration * 60000;
  return reservations.some((reservation) => {
    if (!isBlockingReservation(reservation)) return false;
    const reservationStart = toDate(reservation.scheduledSlot);
    if (!reservationStart) return false;
    const existingStart = reservationStart.getTime();
    const existingEnd = existingStart + reservationDuration(reservation) * 60000;
    return start < existingEnd && existingStart < end;
  });
}

async function validateAvailability(slot, duration, settings) {
  const { close } = parseBusinessHours(settings.hours);
  if (slot.minutes + duration > close) {
    return { available: false, reason: 'duration_overflow', alternatives: [] };
  }

  const reservations = await reservationsForDay(slot.date);
  if (!hasConflict(slot.date, duration, reservations)) {
    return { available: true, alternatives: [] };
  }

  const alternatives = [];
  const day = limaParts(slot.date);
  const { open } = parseBusinessHours(settings.hours);
  for (let minutes = open; minutes + duration <= close && alternatives.length < 3; minutes += 30) {
    const candidate = limaDate(day.year, day.month, day.day, Math.floor(minutes / 60), minutes % 60);
    if (candidate.getTime() > Date.now() && !hasConflict(candidate, duration, reservations)) {
      alternatives.push(candidate);
    }
  }

  return { available: false, reason: 'conflict', alternatives };
}

function xml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xml(message)}</Message></Response>`;
}

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

function parseFormBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const raw = req.rawBody ? req.rawBody.toString('utf8') : '';
  return Object.fromEntries(new URLSearchParams(raw));
}

function jsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  try {
    return JSON.parse(req.rawBody ? req.rawBody.toString('utf8') : '{}');
  } catch (error) {
    return {};
  }
}

function normalizeService(service) {
  return {
    id: text(service.id),
    name: text(service.name),
    price: Number(service.price || 0),
    duration: Number(service.duration || 0),
    active: service.active !== false
  };
}

async function loadServices() {
  const snapshot = await db.collection('services').get();
  const services = snapshot.docs
    .map((doc) => normalizeService({ id: doc.id, ...doc.data() }))
    .filter((service) => service.id && service.name && service.active);

  if (services.length) {
    return services.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  await Promise.all(SERVICES.map((service) => (
    db.collection('services').doc(service.id).set({ ...service, active: true }, { merge: true })
  )));
  return SERVICES.map((service) => normalizeService({ ...service, active: true }));
}

async function loadSettings() {
  const snapshot = await db.collection('settings').doc('business').get();
  return snapshot.exists ? { ...DEFAULT_SETTINGS, ...snapshot.data() } : DEFAULT_SETTINGS;
}

function serviceMenu(services) {
  return services.map((service, index) => (
    `${index + 1}. ${service.name}${service.price ? ` - S/ ${service.price}` : ''}`
  )).join('\n');
}

function findService(message, services) {
  const normalized = normalizeMessage(message);
  const number = Number(normalized);

  if (Number.isInteger(number) && services[number - 1]) {
    return services[number - 1];
  }

  return services.find((service) => {
    const id = normalizeMessage(service.id);
    const name = normalizeMessage(service.name);
    return normalized.includes(id) || normalized.includes(name);
  });
}

async function logMessage(phone, direction, content, extra = {}) {
  await db.collection('messages').add({
    phone,
    direction,
    content,
    channel: 'whatsapp',
    ...extra,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

function twilioConfig() {
  return {
    accountSid: text(process.env.TWILIO_ACCOUNT_SID),
    authToken: text(process.env.TWILIO_AUTH_TOKEN),
    from: text(process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_WHATSAPP)
  };
}

function whatsappAddress(phone) {
  const normalized = normalizePhone(phone);
  const digits = onlyDigits(normalized);
  if (!digits) return '';
  const withCountry = digits.startsWith('51') ? digits : `51${digits.slice(-9)}`;
  return `whatsapp:+${withCountry}`;
}

async function sendWhatsAppMessage(phone, body, extra = {}) {
  const config = twilioConfig();
  const to = whatsappAddress(phone);

  if (!config.accountSid || !config.authToken || !config.from || !to) {
    await logMessage(phone, 'outbound_skipped', body, {
      provider: 'twilio',
      reason: 'missing_twilio_credentials',
      ...extra
    });
    return { ok: false, skipped: true, reason: 'missing_twilio_credentials' };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: config.from.startsWith('whatsapp:') ? config.from : `whatsapp:${config.from}`,
      To: to,
      Body: body
    })
  });
  const payload = await response.json();

  await logMessage(phone, response.ok ? 'outbound' : 'outbound_error', body, {
    provider: 'twilio',
    statusCode: response.status,
    twilioSid: payload.sid || '',
    error: payload.message || '',
    ...extra
  });

  return { ok: response.ok, statusCode: response.status, payload };
}

async function sendReservationNotification(reservation, type) {
  const phone = reservation.phone || '';
  const name = reservation.name || 'cliente';
  const pet = reservation.petName || 'tu mascota';
  const service = reservation.service || 'tu servicio';
  const slot = toDate(reservation.scheduledSlot);
  const schedule = slot ? formatSlot(slot) : (reservation.scheduledAt || 'el horario solicitado');
  const paymentUrl = reservation.paymentUrl || paymentUrlFor(reservation.id);
  const expiresAt = paymentHoldExpiresAt(reservation);

  const messages = {
    payment_reminder: [
      `Hola ${name}. Tu reserva para ${pet} (${service}) sigue pendiente de pago.`,
      `El horario ${schedule} queda separado hasta ${expiresAt ? formatShortDateTime(expiresAt) : 'que venza el plazo'}.`,
      `Paga aqui para confirmarla: ${paymentUrl}`
    ].join('\n'),
    payment_expired: [
      `Hola ${name}. Tu reserva para ${pet} vencio porque no se registro el pago a tiempo.`,
      'El horario fue liberado. Puedes escribir "reservar" para elegir otro horario.'
    ].join('\n'),
    payment_confirmed: [
      `Pago recibido. Tu cita para ${pet} quedo confirmada.`,
      `Servicio: ${service}`,
      `Fecha/hora: ${schedule}`
    ].join('\n'),
    appointment_reminder: [
      `Recordatorio: te esperamos para ${pet}.`,
      `Servicio: ${service}`,
      `Fecha/hora: ${schedule}`
    ].join('\n')
  };

  return sendWhatsAppMessage(phone, messages[type] || '', {
    reservationId: reservation.id || '',
    notificationType: type
  });
}

function paymentUrlFor(reservationId) {
  return `${PUBLIC_SITE_URL}/pago.html?r=${encodeURIComponent(reservationId)}`;
}

function amountToCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

async function upsertCustomer(data, reservationId) {
  const phoneDigits = onlyDigits(data.phone);
  const customerRef = db.collection('customers').doc(phoneDigits || data.phone);
  const snapshot = await customerRef.get();
  const current = snapshot.exists ? snapshot.data() : {};
  const reservations = Array.isArray(current.reservations) ? current.reservations : [];

  if (reservationId && !reservations.includes(reservationId)) {
    reservations.unshift(reservationId);
  }

  await customerRef.set({
    id: customerRef.id,
    name: data.name || current.name || 'Cliente WhatsApp',
    phone: data.phone,
    email: current.email || '',
    petName: data.petName || current.petName || '',
    notes: data.notes || current.notes || 'Cliente creado por bot de WhatsApp',
    reservations,
    source: 'WhatsApp',
    createdAt: current.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function createReservation(phone, data) {
  const services = await loadServices();
  const service = data.service || services[0] || SERVICES[0];
  const reservationRef = db.collection('reservations').doc();
  const amount = Number(service.price || 0);
  const paymentHoldExpiresAtValue = amount > 0 ? new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60000) : null;
  const reservation = {
    id: reservationRef.id,
    name: data.name || 'Cliente WhatsApp',
    phone,
    petName: data.petName || '',
    service: service.name,
    serviceId: service.id,
    amount,
    duration: Math.max(Number(service.duration || 0), 30),
    message: `Solicitud por WhatsApp. Fecha/hora solicitada: ${data.schedule || 'Por confirmar'}`,
    status: amount > 0 ? 'Pendiente de pago' : 'Nueva',
    source: 'WhatsApp Bot',
    scheduledAt: data.schedule || '',
    scheduledSlot: data.scheduledSlot ? new Date(data.scheduledSlot) : null,
    paymentHoldMinutes: amount > 0 ? PAYMENT_HOLD_MINUTES : 0,
    paymentHoldExpiresAt: paymentHoldExpiresAtValue,
    paymentUrl: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await reservationRef.set(reservation);
  const paymentUrl = reservation.amount > 0 ? paymentUrlFor(reservationRef.id) : '';
  if (paymentUrl) {
    await reservationRef.update({ paymentUrl });
  }
  await upsertCustomer({ ...data, phone, notes: 'Reserva creada por bot de WhatsApp' }, reservationRef.id);
  return { ...reservation, id: reservationRef.id, paymentUrl };
}

async function processReservationNotifications(now = new Date()) {
  const nowMs = now.getTime();
  const paymentWindowEnd = new Date(nowMs + PAYMENT_REMINDER_BEFORE_MINUTES * 60000);
  const appointmentWindowEnd = new Date(nowMs + APPOINTMENT_REMINDER_BEFORE_HOURS * 60 * 60000);
  const stats = {
    paymentReminders: 0,
    paymentExpired: 0,
    appointmentReminders: 0,
    skipped: 0
  };

  const pendingSnapshot = await db.collection('reservations')
    .where('status', '==', 'Pendiente de pago')
    .limit(100)
    .get();

  for (const doc of pendingSnapshot.docs) {
    const reservation = { id: doc.id, ...doc.data() };
    const expiresAt = paymentHoldExpiresAt(reservation);
    if (!expiresAt) continue;

    if (expiresAt.getTime() <= nowMs) {
      await doc.ref.update({
        status: 'Pago vencido',
        paymentStatus: 'Vencido',
        paymentExpiredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (!reservation.paymentExpiredSentAt) {
        const result = await sendReservationNotification(reservation, 'payment_expired');
        await doc.ref.update({
          paymentExpiredSentAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentExpiredNotificationStatus: result.ok ? 'sent' : (result.skipped ? 'skipped' : 'error')
        });
        result.skipped ? stats.skipped++ : stats.paymentExpired++;
      }
      continue;
    }

    if (!reservation.paymentReminderSentAt && expiresAt.getTime() <= paymentWindowEnd.getTime()) {
      const result = await sendReservationNotification(reservation, 'payment_reminder');
      await doc.ref.update({
        paymentReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentReminderNotificationStatus: result.ok ? 'sent' : (result.skipped ? 'skipped' : 'error')
      });
      result.skipped ? stats.skipped++ : stats.paymentReminders++;
    }
  }

  const appointmentSnapshot = await db.collection('reservations')
    .where('scheduledSlot', '>=', now)
    .where('scheduledSlot', '<=', appointmentWindowEnd)
    .limit(100)
    .get();

  for (const doc of appointmentSnapshot.docs) {
    const reservation = { id: doc.id, ...doc.data() };
    if (reservation.appointmentReminderSentAt) continue;
    if (!/(pagad|confirmada)/i.test(`${reservation.status || ''} ${reservation.paymentStatus || ''}`)) continue;

    const result = await sendReservationNotification(reservation, 'appointment_reminder');
    await doc.ref.update({
      appointmentReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
      appointmentReminderNotificationStatus: result.ok ? 'sent' : (result.skipped ? 'skipped' : 'error')
    });
    result.skipped ? stats.skipped++ : stats.appointmentReminders++;
  }

  return stats;
}

async function getConversation(phone) {
  const ref = db.collection('whatsappConversations').doc(onlyDigits(phone) || phone);
  const snapshot = await ref.get();
  return {
    ref,
    state: snapshot.exists ? snapshot.data() : { step: 'idle', data: {} }
  };
}

async function saveConversation(ref, step, data = {}) {
  await ref.set({
    step,
    data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function mainMenu() {
  return [
    'Hola, soy el asistente de La Vecindad del Perro.',
    'Puedo ayudarte con:',
    '1. Reservar una cita',
    '2. Ver servicios',
    '3. Hablar con una persona',
    '',
    'Escribe "reservar" para empezar.'
  ].join('\n');
}

function faqResponse(normalized, settings) {
  if (/(direccion|ubicacion|donde|local|lugar)/i.test(normalized)) {
    return `Estamos en ${settings.address}.`;
  }

  if (/(horario|hora|atienden|abren|cierran)/i.test(normalized)) {
    return `Nuestro horario de atencion es ${settings.hours}.`;
  }

  if (/(telefono|llamar|numero|contacto|whatsapp)/i.test(normalized)) {
    return `Puedes comunicarte al ${settings.phone}.`;
  }

  if (/(pago|pagar|yape|plin|tarjeta|culqi)/i.test(normalized)) {
    return 'Puedes pagar con el link Culqi que te enviaremos al confirmar tu reserva. En modo prueba tenemos activo tarjeta y billetera movil segun Culqi.';
  }

  if (/(reclamo|queja|libro)/i.test(normalized)) {
    return `${settings.businessName} cuenta con Libro de Reclamaciones en la web: ${PUBLIC_SITE_URL}/libro-de-reclamaciones.html`;
  }

  return '';
}

async function handleMessage(phone, incoming, current) {
  const normalized = normalizeMessage(incoming);
  let { step, data = {} } = current.state;
  const isAtMenu = step === 'idle' || step === 'human_requested' || !step;
  const [services, settings] = await Promise.all([loadServices(), loadSettings()]);

  if (!incoming || ['hola', 'menu', 'inicio'].includes(normalized)) {
    await saveConversation(current.ref, 'idle', {});
    return mainMenu();
  }

  if (normalized.includes('servicio') || (isAtMenu && normalized === '2')) {
    return `Estos son nuestros servicios:\n${serviceMenu(services)}\n\nPara reservar, escribe "reservar".`;
  }

  const faq = faqResponse(normalized, settings);
  if (faq) return faq;

  if (isAtMenu && (normalized.includes('persona') || normalized.includes('asesor') || normalized === '3')) {
    await saveConversation(current.ref, 'human_requested', data);
    return `Listo. Un encargado revisara tu mensaje. Tambien puedes llamar al ${settings.phone}.`;
  }

  if (isAtMenu && (normalized.includes('reserv') || normalized === '1')) {
    step = INITIAL_STEP;
    data = {};
    await saveConversation(current.ref, step, data);
    return 'Perfecto. Para reservar, dime tu nombre completo.';
  }

  if (step === 'idle' || !step) {
    return mainMenu();
  }

  if (step === 'ask_name') {
    data.name = incoming;
    await saveConversation(current.ref, 'ask_pet', data);
    return `Gracias, ${data.name}. Como se llama tu mascota?`;
  }

  if (step === 'ask_pet') {
    data.petName = incoming;
    await saveConversation(current.ref, 'ask_service', data);
    return `Que servicio deseas para ${data.petName}?\n${serviceMenu(services)}\n\nResponde con el numero o nombre del servicio.`;
  }

  if (step === 'ask_service') {
    const service = findService(incoming, services);
    if (!service) {
      return `No ubique ese servicio. Elige una opcion:\n${serviceMenu(services)}`;
    }

    data.service = service;
    await saveConversation(current.ref, 'ask_schedule', data);
    return `Anotado: ${service.name}. Que dia y hora prefieres? Ejemplo: "sabado 10 am" o "hoy 4 pm".`;
  }

  if (step === 'ask_schedule') {
    const duration = Math.max(Number(data.service?.duration || 0), 30);
    const slot = parseRequestedSlot(incoming, settings);

    if (!slot.ok) {
      if (slot.reason === 'missing_time') {
        return 'Necesito una fecha y hora. Ejemplo: "manana 10 am", "sabado 4 pm" o "25/04 11:30 am".';
      }
      if (slot.reason === 'past') {
        return 'Esa fecha u hora ya paso. Enviame otra opcion, por ejemplo "manana 10 am".';
      }
      if (slot.reason === 'closed') {
        return `Ese horario esta fuera de atencion. Atendemos de ${minutesToTime(slot.open)} a ${minutesToTime(slot.close)}. Enviame otra hora.`;
      }
      return 'No pude entender esa fecha. Enviame otra opcion como "manana 10 am".';
    }

    const availability = await validateAvailability(slot, duration, settings);
    if (!availability.available) {
      if (availability.reason === 'duration_overflow') {
        return `Ese servicio dura ${duration} minutos y no alcanza antes del cierre. Enviame una hora mas temprana.`;
      }

      const alternatives = availability.alternatives.length
        ? `\nOpciones disponibles ese dia:\n${availability.alternatives.map((item, index) => `${index + 1}. ${formatSlot(item)}`).join('\n')}`
        : '\nNo encontre horarios libres ese dia. Prueba con otro dia.';
      return `Ese horario ya esta ocupado.${alternatives}`;
    }

    data.schedule = formatSlot(slot.date);
    data.scheduledSlot = slot.date.toISOString();
    await saveConversation(current.ref, 'confirm', data);
    return [
      'Confirma tu reserva:',
      `Cliente: ${data.name}`,
      `Mascota: ${data.petName}`,
      `Servicio: ${data.service.name}`,
      `Fecha/hora: ${data.schedule}`,
      `Duracion estimada: ${duration} min`,
      `Monto referencial: S/ ${data.service.price || 0}`,
      '',
      'Responde SI para crear la reserva o NO para cancelar.'
    ].join('\n');
  }

  if (step === 'confirm') {
    if (['si', 'sí', 'ok', 'confirmo', 'confirmar'].includes(normalized)) {
      const reservation = await createReservation(phone, data);
      await saveConversation(current.ref, 'idle', {});

      if (reservation.amount > 0) {
        return [
          `Reserva registrada con codigo ${reservation.id}.`,
          `Para confirmar tu cita paga aqui: ${reservation.paymentUrl}`,
          `El horario queda separado por ${PAYMENT_HOLD_MINUTES} minutos mientras completas el pago.`,
          'Puedes pagar con tarjeta, Yape o billetera movil si tu cuenta Culqi lo tiene habilitado.',
          'Cuando el pago se registre, el dashboard cambiara la reserva a pagada.'
        ].join('\n');
      }

      return `Reserva registrada con codigo ${reservation.id}. Un encargado confirmara la disponibilidad desde el dashboard.`;
    }

    if (['no', 'cancelar', 'cancela'].includes(normalized)) {
      await saveConversation(current.ref, 'idle', {});
      return 'Reserva cancelada. Cuando quieras intentarlo de nuevo, escribe "reservar".';
    }

    return 'Responde SI para crear la reserva o NO para cancelar.';
  }

  await saveConversation(current.ref, 'idle', {});
  return mainMenu();
}

exports.twilioWebhook = onRequest({ region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const payload = parseFormBody(req);
  const incoming = text(payload.Body);
  const phone = normalizePhone(payload.From);
  const from = phone || 'unknown';

  try {
    await logMessage(from, 'inbound', incoming, { provider: 'twilio', messageSid: payload.MessageSid || '' });
    const conversation = await getConversation(from);
    const response = await handleMessage(from, incoming, conversation);
    await logMessage(from, 'outbound', response, { provider: 'twilio' });

    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(twiml(response));
  } catch (error) {
    logger.error('twilioWebhook failed', error);
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(twiml('Ahora no pude procesar tu mensaje. Por favor intenta de nuevo en unos minutos.'));
  }
});

exports.culqiWebhook = onRequest({ region: 'us-central1' }, async (req, res) => {
  await db.collection('paymentEvents').add({
    provider: 'culqi',
    body: req.body || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.status(200).json({ ok: true });
});

exports.paymentApi = onRequest({ region: 'us-central1', secrets: [culqiSecretKey] }, async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    if (req.method === 'GET') {
      const reservationId = text(req.query.reservationId);
      if (!reservationId) {
        res.status(400).json({ ok: false, error: 'reservationId requerido' });
        return;
      }

      const snapshot = await db.collection('reservations').doc(reservationId).get();
      if (!snapshot.exists) {
        res.status(404).json({ ok: false, error: 'Reserva no encontrada' });
        return;
      }

      const reservation = snapshot.data();
      const expiresAt = paymentHoldExpiresAt(reservation);
      const holdExpired = isPaymentHoldExpired(reservation);
      res.status(200).json({
        ok: true,
        backendReady: Boolean(text(process.env.CULQI_SECRET_KEY)),
        reservation: {
          id: reservationId,
          name: reservation.name || 'Cliente',
          phone: reservation.phone || '',
          petName: reservation.petName || '',
          service: reservation.service || 'Servicio',
          amount: Number(reservation.amount || 0),
          amountCents: amountToCents(reservation.amount),
          status: holdExpired ? 'Pendiente vencida' : (reservation.status || 'Pendiente de pago'),
          scheduledAt: reservation.scheduledAt || '',
          paymentHoldMinutes: Number(reservation.paymentHoldMinutes || PAYMENT_HOLD_MINUTES),
          paymentHoldExpiresAt: expiresAt ? expiresAt.toISOString() : '',
          paymentHoldExpired: holdExpired
        }
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method Not Allowed' });
      return;
    }

    const payload = jsonBody(req);
    const reservationId = text(payload.reservationId);
    const sourceId = text(payload.sourceId);
    const email = text(payload.email);

    if (!reservationId || !sourceId || !email) {
      res.status(400).json({ ok: false, error: 'Faltan reservationId, sourceId o email' });
      return;
    }

    const secretKey = text(process.env.CULQI_SECRET_KEY);
    if (!secretKey) {
      res.status(503).json({
        ok: false,
        error: 'Falta configurar CULQI_SECRET_KEY en Firebase Functions.'
      });
      return;
    }

    const reservationRef = db.collection('reservations').doc(reservationId);
    const snapshot = await reservationRef.get();
    if (!snapshot.exists) {
      res.status(404).json({ ok: false, error: 'Reserva no encontrada' });
      return;
    }

    const reservation = snapshot.data();
    if (isPaymentHoldExpired(reservation)) {
      await reservationRef.update({
        status: 'Pago vencido',
        paymentStatus: 'Vencido',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(409).json({
        ok: false,
        error: 'El tiempo para pagar esta reserva vencio. El horario fue liberado; crea una nueva reserva.'
      });
      return;
    }

    if (/pagad/i.test(reservation.status || '') || /pagad/i.test(reservation.paymentStatus || '')) {
      res.status(409).json({
        ok: false,
        error: 'Esta reserva ya figura como pagada.'
      });
      return;
    }

    const amountCents = amountToCents(reservation.amount);
    if (!amountCents || amountCents < 100) {
      res.status(400).json({ ok: false, error: 'Monto no valido para Culqi' });
      return;
    }

    const chargePayload = {
      amount: amountCents,
      currency_code: 'PEN',
      email,
      source_id: sourceId,
      description: `Reserva ${reservation.service || 'servicio'} - ${reservation.petName || reservation.name || reservationId}`,
      metadata: {
        reservation_id: reservationId,
        source: 'spa-mascotas'
      },
      antifraud_details: {
        first_name: reservation.name || 'Cliente',
        phone_number: onlyDigits(reservation.phone).slice(-9),
        country_code: 'PE'
      }
    };

    const response = await fetch(`${CULQI_API_URL}/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chargePayload)
    });
    const charge = await response.json();

    await db.collection('paymentEvents').add({
      provider: 'culqi',
      type: 'charge_response',
      reservationId,
      statusCode: response.status,
      body: charge,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (!response.ok) {
      res.status(response.status).json({
        ok: false,
        error: charge.user_message || charge.merchant_message || charge.message || 'Culqi rechazo el pago',
        culqi: charge
      });
      return;
    }

    const paymentRef = db.collection('payments').doc(charge.id || db.collection('payments').doc().id);
    await paymentRef.set({
      id: paymentRef.id,
      reservationId,
      customerName: reservation.name || 'Cliente',
      service: reservation.service || 'Servicio',
      amount: Number(reservation.amount || 0),
      method: 'Culqi',
      status: 'Pagado',
      chargeId: charge.id || '',
      referenceCode: charge.reference_code || '',
      responseCode: charge.response_code || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await reservationRef.update({
      status: 'Pagada',
      paymentId: paymentRef.id,
      paymentStatus: 'Pagado',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const notificationResult = await sendReservationNotification(
      { id: reservationId, ...reservation, status: 'Pagada', paymentStatus: 'Pagado' },
      'payment_confirmed'
    );
    await reservationRef.update({
      paymentConfirmedSentAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentConfirmedNotificationStatus: notificationResult.ok ? 'sent' : (notificationResult.skipped ? 'skipped' : 'error')
    });

    res.status(200).json({
      ok: true,
      chargeId: charge.id,
      reservationId,
      message: charge.user_message || 'Pago registrado correctamente.'
    });
  } catch (error) {
    logger.error('paymentApi failed', error);
    res.status(500).json({ ok: false, error: 'No se pudo procesar el pago.' });
  }
});

exports.reservationNotificationJob = onSchedule({
  region: 'us-central1',
  schedule: 'every 5 minutes',
  timeZone: TIME_ZONE
}, async () => {
  const stats = await processReservationNotifications();
  logger.info('reservationNotificationJob complete', stats);
});

exports.notificationJobManual = onRequest({ region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const expectedKey = text(process.env.NOTIFICATION_JOB_KEY);
  if (!expectedKey || req.get('x-job-key') !== expectedKey) {
    res.status(403).json({ ok: false, error: 'No autorizado' });
    return;
  }

  try {
    const stats = await processReservationNotifications();
    res.status(200).json({ ok: true, stats });
  } catch (error) {
    logger.error('notificationJobManual failed', error);
    res.status(500).json({ ok: false, error: 'No se pudo procesar avisos.' });
  }
});
