(async function () {
    const page = document.body.dataset.page;
    const protectedPages = !document.body.classList.contains('auth-page');
    const PAYMENT_HOLD_MINUTES = 30;

    const navigationGroups = {
        resumen: 'inicio',
        hoy: 'inicio',
        clientes: 'clientes',
        mensajes: 'clientes',
        reclamos: 'clientes',
        pagos: 'finanzas',
        reportes: 'finanzas'
    };

    const sectionNavigation = {
        inicio: [
            { page: 'hoy', href: 'hoy.html', label: 'Hoy' },
            { page: 'resumen', href: 'index.html', label: 'Resumen' }
        ],
        clientes: [
            { page: 'clientes', href: 'clientes.html', label: 'Clientes' },
            { page: 'mensajes', href: 'mensajes.html', label: 'Mensajes' },
            { page: 'reclamos', href: 'reclamos.html', label: 'Reclamos' }
        ],
        finanzas: [
            { page: 'pagos', href: 'pagos.html', label: 'Pagos' },
            { page: 'reportes', href: 'reportes.html', label: 'Reportes' }
        ]
    };

    function sectionTabs(section) {
        const tabs = sectionNavigation[section] || [];
        if (!tabs.length) return '';
        return `<nav class="section-tabs" aria-label="Secciones de ${section}">${tabs.map((tab) => `
            <a href="${tab.href}" class="${tab.page === page ? 'active' : ''}" ${tab.page === page ? 'aria-current="page"' : ''}>${tab.label}</a>
        `).join('')}</nav>`;
    }

    function setActiveNav() {
        const nav = document.querySelector('.nav');
        if (!nav) return;
        nav.innerHTML = `
            <a href="hoy.html" data-nav="inicio">Inicio</a>
            <a href="reservas.html" data-nav="reservas">Reservas</a>
            <a href="clientes.html" data-nav="clientes">Clientes</a>
            <a href="pagos.html" data-nav="finanzas">Finanzas</a>
            <a href="servicios.html" data-nav="servicios">Servicios</a>
            <a href="configuracion.html" data-nav="configuracion">Configuracion</a>
        `;
        const activeSection = navigationGroups[page] || page;
        document.querySelectorAll('.nav a').forEach((link) => {
            if (link.dataset.nav === activeSection) link.classList.add('active');
        });
    }

    // Se aplica de inmediato, antes de inicializar Firebase, para evitar el parpadeo al navegar.
    setActiveNav();

    await window.BusinessStore.authReady;

    const firebaseEnabled = window.BusinessStore.isFirebaseEnabled();
    if (protectedPages) {
        const hasAccess = firebaseEnabled && Boolean(window.BusinessStore.getUser());
        if (!hasAccess) {
            location.href = 'login.html';
            return;
        }
    }

    function data() {
        return window.BusinessStore.read();
    }

    function money(value) {
        return `S/ ${Number(value || 0).toFixed(2)}`;
    }

    function date(value) {
        if (!value) return 'Sin fecha';
        return new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function localDateTimeValue(value) {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        const offset = parsed.getTimezoneOffset();
        return new Date(parsed.getTime() - offset * 60000).toISOString().slice(0, 16);
    }

    function dateInputValue(value = new Date()) {
        const parsed = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(parsed.getTime())) return dateInputValue(new Date());
        const offset = parsed.getTimezoneOffset();
        return new Date(parsed.getTime() - offset * 60000).toISOString().slice(0, 10);
    }

    function startOfDay(value) {
        const dateValue = value instanceof Date ? value : new Date(`${value}T00:00:00`);
        return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    }

    function addDays(value, amount) {
        const next = new Date(value);
        next.setDate(next.getDate() + amount);
        return next;
    }

    function startOfWeek(value) {
        const dateValue = startOfDay(value);
        const day = dateValue.getDay();
        const delta = day === 0 ? -6 : 1 - day;
        return addDays(dateValue, delta);
    }

    function timeLabel(minutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    function parseTimeToMinutes(value) {
        const matches = [...String(value || '').toLowerCase().matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/g)];
        if (!matches.length) return null;
        const match = matches[matches.length - 1];
        let hour = Number(match[1]);
        const minute = Number(match[2] || 0);
        const marker = String(match[3] || '').replace(/\./g, '');
        if (marker === 'pm' && hour < 12) hour += 12;
        if (marker === 'am' && hour === 12) hour = 0;
        if (!marker && hour >= 1 && hour <= 6) hour += 12;
        return hour * 60 + minute;
    }

    function businessHours() {
        const hours = data().settings.hours || '7:00 AM - 8:00 PM';
        const matches = String(hours).match(/\d{1,2}(?::\d{2})?\s*(?:AM|PM|A\.M\.|P\.M\.)?/gi) || [];
        return {
            open: parseTimeToMinutes(matches[0] || '7:00 AM') || 420,
            close: parseTimeToMinutes(matches[1] || '8:00 PM') || 1200
        };
    }

    function reservationDuration(item) {
        const service = data().services.find((current) => current.id === item.serviceId || current.name === item.service);
        return Math.max(Number(item.duration || service?.duration || 60), 30);
    }

    function isPendingPayment(item) {
        return /pendiente de pago/i.test(item.status || '') && !/pagad/i.test(item.paymentStatus || '');
    }

    function paymentHoldExpiresAt(item) {
        if (item.paymentHoldExpiresAt) {
            const explicit = new Date(item.paymentHoldExpiresAt);
            if (!Number.isNaN(explicit.getTime())) return explicit;
        }
        if (!item.createdAt) return null;
        const createdAt = new Date(item.createdAt);
        if (Number.isNaN(createdAt.getTime())) return null;
        return new Date(createdAt.getTime() + PAYMENT_HOLD_MINUTES * 60000);
    }

    function isPaymentHoldExpired(item) {
        if (!isPendingPayment(item)) return false;
        const expiresAt = paymentHoldExpiresAt(item);
        return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
    }

    function isBlockingReservation(item) {
        if (/cancel|terminada|pago vencido/i.test(item.status || '')) return false;
        if (isPaymentHoldExpired(item)) return false;
        return true;
    }

    function reservationStatusLabel(item) {
        return isPaymentHoldExpired(item) ? 'Pendiente vencida' : (item.status || 'Nueva');
    }

    function paymentHoldLabel(item) {
        if (!isPendingPayment(item)) return '';
        const expiresAt = paymentHoldExpiresAt(item);
        if (!expiresAt) return '';
        return isPaymentHoldExpired(item)
            ? 'Pago vencido'
            : `Separa hasta ${expiresAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    }

    function hasScheduleConflict(slotValue, duration, ignoreId = '') {
        const start = new Date(slotValue).getTime();
        const end = start + duration * 60000;
        if (!Number.isFinite(start)) return false;

        return data().reservations.some((item) => {
            if (item.id === ignoreId || !isBlockingReservation(item) || !item.scheduledSlot) return false;
            const itemStart = new Date(item.scheduledSlot).getTime();
            const itemEnd = itemStart + reservationDuration(item) * 60000;
            return start < itemEnd && itemStart < end;
        });
    }

    function activeScheduledReservations() {
        return data().reservations
            .filter((item) => item.scheduledSlot && isBlockingReservation(item))
            .sort((left, right) => new Date(left.scheduledSlot) - new Date(right.scheduledSlot));
    }

    function allReservationStatuses() {
        const statuses = ['Nueva', 'Pendiente de pago', 'Pendiente vencida', 'Pagada', 'Confirmada', 'En proceso', 'Terminada', 'Cancelada'];
        data().reservations.forEach((item) => {
            if (item.status && !statuses.includes(item.status)) statuses.push(item.status);
        });
        return statuses;
    }

    function matchesStatus(item, statusFilter) {
        return !statusFilter || statusFilter === 'all' || reservationStatusLabel(item) === statusFilter || item.status === statusFilter;
    }

    function reservationsForDate(day) {
        const start = startOfDay(day);
        const end = addDays(start, 1);
        return activeScheduledReservations().filter((item) => {
            const slot = new Date(item.scheduledSlot);
            return slot >= start && slot < end;
        });
    }

    function occupancyForDate(day) {
        const { open, close } = businessHours();
        const totalBlocks = Math.max(Math.ceil((close - open) / 30), 0);
        const occupiedBlocks = reservationsForDate(day).reduce((sum, item) => (
            sum + Math.ceil(reservationDuration(item) / 30)
        ), 0);
        const used = Math.min(occupiedBlocks, totalBlocks);
        const free = Math.max(totalBlocks - used, 0);
        const percent = totalBlocks ? Math.round((used / totalBlocks) * 100) : 0;
        return { totalBlocks, used, free, percent };
    }

    function occupancySummary(day) {
        const occupancy = occupancyForDate(day);
        const reservations = reservationsForDate(day);
        const confirmed = reservations.filter((item) => /confirmada|pagad/i.test(item.status || '')).length;
        const pending = reservations.filter((item) => !/confirmada|pagad/i.test(item.status || '')).length;
        return `
            <div class="occupancy-grid">
                <section class="occupancy-card">
                    <span>Ocupacion</span>
                    <strong>${occupancy.percent}%</strong>
                    <div class="meter"><i style="width:${occupancy.percent}%"></i></div>
                </section>
                <section class="occupancy-card"><span>Bloques ocupados</span><strong>${occupancy.used}</strong></section>
                <section class="occupancy-card"><span>Bloques libres</span><strong>${occupancy.free}</strong></section>
                <section class="occupancy-card"><span>Confirmadas / pendientes</span><strong>${confirmed} / ${pending}</strong></section>
            </div>
        `;
    }

    function statusClass(status) {
        if (/pagado|confirmada|terminada|cerrado|activo/i.test(status || '')) return 'ok';
        if (/cancel|rechaz|abierto|vencid/i.test(status || '')) return 'bad';
        return 'warn';
    }

    function isPaidReservation(item) {
        return /pagad|token/i.test(`${item.status || ''} ${item.paymentStatus || ''}`);
    }

    function whatsappLink(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        if (!digits) return '';
        const normalized = digits.startsWith('51') ? digits : `51${digits.slice(-9)}`;
        return `https://wa.me/${normalized}`;
    }

    function normalizedPhone(phone) {
        return String(phone || '').replace(/\D/g, '').slice(-9);
    }

    function samePhone(left, right) {
        const leftPhone = normalizedPhone(left);
        const rightPhone = normalizedPhone(right);
        return Boolean(leftPhone && rightPhone && leftPhone === rightPhone);
    }

    function customerReservations(customer) {
        return data().reservations
            .filter((item) => samePhone(item.phone, customer.phone) || (customer.reservations || []).includes(item.id))
            .sort((left, right) => new Date(right.scheduledSlot || right.createdAt || 0) - new Date(left.scheduledSlot || left.createdAt || 0));
    }

    function customerPayments(customer, reservations = customerReservations(customer)) {
        const reservationIds = new Set(reservations.map((item) => item.id));
        return data().payments
            .filter((item) => reservationIds.has(item.reservationId) || samePhone(item.phone, customer.phone) || String(item.customerName || '').toLowerCase() === String(customer.name || '').toLowerCase())
            .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    }

    function customerClaims(customer) {
        return data().claims
            .filter((item) => samePhone(item.phone, customer.phone) || String(item.name || '').toLowerCase() === String(customer.name || '').toLowerCase())
            .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    }

    function inDateRange(value, start, end) {
        const parsed = new Date(value || 0);
        return !Number.isNaN(parsed.getTime()) && parsed >= start && parsed < end;
    }

    function startOfMonth(value) {
        const dateValue = startOfDay(value);
        return new Date(dateValue.getFullYear(), dateValue.getMonth(), 1);
    }

    function addMonths(value, amount) {
        const next = new Date(value);
        next.setMonth(next.getMonth() + amount);
        return next;
    }

    function groupCount(items, keyGetter) {
        return items.reduce((summary, item) => {
            const key = keyGetter(item) || 'Sin dato';
            summary[key] = (summary[key] || 0) + 1;
            return summary;
        }, {});
    }

    function sortedSummaryRows(summary, valueLabel = 'Cantidad') {
        return Object.entries(summary)
            .sort((left, right) => right[1] - left[1])
            .map(([label, value]) => ({ label, valueLabel, value }));
    }

    function rows(items, columns) {
        if (!items.length) return `<div class="empty">Aun no hay registros.</div>`;
        return `
            <div class="table-wrap">
                <table>
                    <thead><tr>${columns.map((col) => `<th>${col.label}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${items.map((item) => `
                            <tr>${columns.map((col) => `<td>${col.render(item)}</td>`).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }


    function renderSummary() {
        const store = data();
        const pendingReservations = store.reservations.filter((item) => item.status !== 'Terminada' && item.status !== 'Cancelada');
        const pendingPayments = store.payments.filter((item) => !/pagado/i.test(item.status));
        const openClaims = store.claims.filter((item) => item.status !== 'Cerrado');
        const paidTotal = store.payments
            .filter((item) => /pagado|token/i.test(item.status))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        document.getElementById('content').innerHTML = `
            ${sectionTabs('inicio')}
            <div class="grid">
                ${metric('Reservas activas', pendingReservations.length, '📅')}
                ${metric('Clientes', store.customers.length, '👤')}
                ${metric('Pagos registrados', money(paidTotal), '💳')}
                ${metric('Reclamos abiertos', openClaims.length, '⚠')}
            </div>
            <div class="grid two" style="margin-top: 16px;">
                <section class="card">
                    <h2>Ultimas reservas</h2>
                    ${rows(store.reservations.slice(0, 5), reservationColumns(false))}
                </section>
                <section class="card">
                    <h2>Pagos recientes</h2>
                    ${rows(store.payments.slice(0, 5), paymentColumns(false))}
                </section>
            </div>
        `;
    }

    function renderToday() {
        const selectedDate = sessionStorage.getItem('lvdperro_today_date') || dateInputValue();
        const day = startOfDay(selectedDate);
        const nextDay = addDays(day, 1);
        const reservations = data().reservations
            .filter((item) => {
                if (!item.scheduledSlot) return false;
                const slot = new Date(item.scheduledSlot);
                return slot >= day && slot < nextDay;
            })
            .sort((left, right) => new Date(left.scheduledSlot) - new Date(right.scheduledSlot));
        const activeReservations = reservations.filter((item) => !/cancel/i.test(item.status || ''));
        const paidCount = activeReservations.filter(isPaidReservation).length;
        const pendingCount = activeReservations.filter((item) => !isPaidReservation(item) && !/terminada/i.test(item.status || '')).length;
        const inProgressCount = activeReservations.filter((item) => /en proceso/i.test(item.status || '')).length;
        const estimatedIncome = activeReservations.reduce((sum, item) => sum + Number(item.amount || item.price || 0), 0);

        document.getElementById('content').innerHTML = `
            ${sectionTabs('inicio')}
            <div class="toolbar">
                <input class="input compact-date" id="todayDate" type="date" value="${selectedDate}">
                <a class="btn" href="reservas.html">Ver agenda</a>
                <button class="btn primary" id="newReservation">Nueva reserva</button>
            </div>
            <div class="grid today-metrics">
                ${metric('Citas del dia', activeReservations.length, '#')}
                ${metric('Pagadas', paidCount, 'OK')}
                ${metric('Pendientes de pago', pendingCount, '!')}
                ${metric('Ingresos estimados', money(estimatedIncome), 'S/')}
            </div>
            <section class="card today-panel">
                <div class="today-panel-head">
                    <div>
                        <p class="eyebrow">Operacion</p>
                        <h2>Agenda de hoy</h2>
                    </div>
                    <span class="pill ${inProgressCount ? 'warn' : 'ok'}">${inProgressCount} en proceso</span>
                </div>
                ${reservations.length ? `
                    <div class="today-list">
                        ${reservations.map((item) => {
                            const status = reservationStatusLabel(item);
                            const paymentLabel = isPaidReservation(item) ? 'Pagado' : (isPaymentHoldExpired(item) ? 'Pago vencido' : 'Falta pagar');
                            const slot = new Date(item.scheduledSlot);
                            const contactLink = whatsappLink(item.phone);
                            return `
                                <article class="today-item">
                                    <div class="today-time">
                                        <strong>${slot.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</strong>
                                        <span>${reservationDuration(item)} min</span>
                                    </div>
                                    <div class="today-main">
                                        <div class="today-title">
                                            <strong>${item.petName || 'Mascota sin nombre'}</strong>
                                            <span>${item.service || 'Servicio por confirmar'}</span>
                                        </div>
                                        <div class="muted">${item.name || 'Cliente'} · ${item.phone || 'Sin telefono'}</div>
                                        <div class="today-tags">
                                            <span class="pill ${statusClass(status)}">${status}</span>
                                            <span class="pill ${isPaidReservation(item) ? 'ok' : statusClass(paymentLabel)}">${paymentLabel}</span>
                                            <span class="pill">${money(item.amount || item.price || 0)}</span>
                                        </div>
                                    </div>
                                    <div class="today-actions">
                                        ${actionSelect('reservations', item.id, item.status, ['Confirmada', 'En proceso', 'Terminada', 'Cancelada'])}
                                        <button class="btn compact" data-reschedule="${item.id}" type="button">Reprogramar</button>
                                        ${contactLink ? `<a class="btn compact" href="${contactLink}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                                    </div>
                                </article>
                            `;
                        }).join('')}
                    </div>
                ` : '<div class="empty">No hay citas programadas para esta fecha.</div>'}
            </section>
        `;

        document.getElementById('todayDate')?.addEventListener('change', (event) => {
            sessionStorage.setItem('lvdperro_today_date', event.target.value);
            renderToday();
        });
        document.getElementById('newReservation')?.addEventListener('click', () => renderReservationForm());
    }

    function metric(label, value, icon) {
        return `<section class="card metric"><div><p class="eyebrow">${label}</p><strong>${value}</strong></div><span class="icon">${icon}</span></section>`;
    }

    function reservationColumns(withActions = true) {
        return [
            { label: 'Cliente', render: (item) => `<strong>${item.name}</strong><div class="muted">${item.phone}</div>` },
            { label: 'Mascota', render: (item) => `${item.petName || '-'}<div class="muted">${item.service}</div>` },
            { label: 'Cita', render: (item) => `${item.scheduledSlot ? date(item.scheduledSlot) : (item.scheduledAt || 'Por confirmar')}<div class="muted">${item.duration ? `${item.duration} min` : ''}</div>` },
            { label: 'Estado', render: (item) => `<span class="pill ${statusClass(reservationStatusLabel(item))}">${reservationStatusLabel(item)}</span><div class="muted">${paymentHoldLabel(item)}</div>` },
            { label: 'Registro', render: (item) => date(item.createdAt) },
            ...(withActions ? [{
                label: 'Acciones',
                render: (item) => `
                    ${actionSelect('reservations', item.id, item.status, ['Nueva', 'Confirmada', 'En proceso', 'Terminada', 'Cancelada'])}
                    <button class="btn compact" data-reschedule="${item.id}" type="button">Reprogramar</button>
                `
            }] : [])
        ];
    }

    function paymentColumns(withActions = true) {
        return [
            { label: 'Cliente', render: (item) => item.customerName || 'Cliente web' },
            { label: 'Servicio', render: (item) => item.service },
            { label: 'Monto', render: (item) => money(item.amount) },
            { label: 'Estado', render: (item) => `<span class="pill ${statusClass(item.status)}">${item.status}</span><div class="muted">${item.method}</div>` },
            ...(withActions ? [{ label: 'Acciones', render: (item) => actionSelect('payments', item.id, item.status, ['Pendiente de backend', 'Pagado', 'Reembolsado']) }] : [])
        ];
    }

    function actionSelect(collection, id, current, options) {
        const selectOptions = current && !options.includes(current) ? [current, ...options] : options;
        return `
            <select data-update="${collection}" data-id="${id}">
                ${selectOptions.map((option) => `<option ${option === current ? 'selected' : ''}>${option}</option>`).join('')}
            </select>
        `;
    }

    function renderReservations() {
        const store = data();
        const selectedDate = sessionStorage.getItem('lvdperro_calendar_date') || dateInputValue();
        const selectedView = sessionStorage.getItem('lvdperro_reservation_view') || 'table';
        const selectedStatus = sessionStorage.getItem('lvdperro_reservation_status') || 'all';
        const filteredReservations = store.reservations.filter((item) => matchesStatus(item, selectedStatus));
        document.getElementById('content').innerHTML = `
            <div class="toolbar">
                <input class="input" id="search" placeholder="Buscar reserva por cliente, telefono o mascota">
                <div class="segmented" aria-label="Vista de reservas">
                    ${['table', 'day', 'week'].map((view) => `
                        <button class="btn ${selectedView === view ? 'primary' : ''}" data-reservation-view="${view}" type="button">
                            ${view === 'table' ? 'Tabla' : view === 'day' ? 'Dia' : 'Semana'}
                        </button>
                    `).join('')}
                </div>
                <select id="statusFilter" class="compact-select">
                    <option value="all">Todos los estados</option>
                    ${allReservationStatuses().map((status) => `<option value="${status}" ${selectedStatus === status ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
                <input class="input compact-date" id="calendarDate" type="date" value="${selectedDate}">
                <button class="btn primary" id="newReservation">Nueva reserva</button>
            </div>
            ${occupancySummary(startOfDay(selectedDate))}
            <div id="reservationView">${selectedView === 'table' ? `<div id="table">${rows(filteredReservations, reservationColumns())}</div>` : calendarView(selectedView, selectedDate, '', selectedStatus)}</div>
        `;
        if (selectedView === 'table') {
            bindSearch(filteredReservations, reservationColumns(), ['name', 'phone', 'petName', 'service']);
        } else {
            document.getElementById('search')?.addEventListener('input', (event) => {
                document.getElementById('reservationView').innerHTML = calendarView(selectedView, selectedDate, event.target.value, selectedStatus);
            });
        }
        document.getElementById('statusFilter')?.addEventListener('change', (event) => {
            sessionStorage.setItem('lvdperro_reservation_status', event.target.value);
            renderReservations();
        });
        document.querySelectorAll('[data-reservation-view]').forEach((button) => {
            button.addEventListener('click', () => {
                sessionStorage.setItem('lvdperro_reservation_view', button.dataset.reservationView);
                renderReservations();
            });
        });
        document.getElementById('calendarDate')?.addEventListener('change', (event) => {
            sessionStorage.setItem('lvdperro_calendar_date', event.target.value);
            renderReservations();
        });
        document.getElementById('newReservation')?.addEventListener('click', () => renderReservationForm());
    }

    function calendarView(mode, selectedDate, searchTerm = '', statusFilter = 'all') {
        const day = startOfDay(selectedDate);
        return mode === 'week'
            ? weekCalendarView(startOfWeek(day), searchTerm, statusFilter)
            : dayCalendarView(day, searchTerm, statusFilter);
    }

    function matchesCalendarSearch(item, searchTerm, statusFilter = 'all') {
        if (!matchesStatus(item, statusFilter)) return false;
        const term = String(searchTerm || '').trim().toLowerCase();
        if (!term) return true;
        return [item.name, item.phone, item.petName, item.service, item.status]
            .some((value) => String(value || '').toLowerCase().includes(term));
    }

    function reservationCard(item) {
        return `
            <button class="calendar-event ${statusClass(reservationStatusLabel(item))}" data-reschedule="${item.id}" type="button">
                <strong>${new Date(item.scheduledSlot).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} ${item.name}</strong>
                <span>${item.petName || 'Mascota'} - ${item.service}</span>
                <small>${reservationDuration(item)} min - ${reservationStatusLabel(item)}</small>
                ${paymentHoldLabel(item) ? `<small>${paymentHoldLabel(item)}</small>` : ''}
            </button>
        `;
    }

    function dayCalendarView(day, searchTerm = '', statusFilter = 'all') {
        const { open, close } = businessHours();
        const reservations = reservationsForDate(day).filter((item) => matchesCalendarSearch(item, searchTerm, statusFilter));
        const rowsHtml = [];

        for (let minutes = open; minutes < close; minutes += 30) {
            const events = reservations.filter((item) => {
                const slot = new Date(item.scheduledSlot);
                return slot.getHours() * 60 + slot.getMinutes() === minutes;
            });
            rowsHtml.push(`
                <div class="calendar-row">
                    <div class="calendar-time">${timeLabel(minutes)}</div>
                    <div class="calendar-slot ${events.length ? 'busy' : ''}">
                        ${events.length ? events.map(reservationCard).join('') : '<span class="muted">Libre</span>'}
                    </div>
                </div>
            `);
        }

        return `
            <section class="calendar-panel">
                <div class="calendar-heading">
                    <h2>${day.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
                    <span class="pill">${reservations.length} citas activas</span>
                </div>
                <div class="day-calendar">${rowsHtml.join('')}</div>
            </section>
        `;
    }

    function weekCalendarView(weekStart, searchTerm = '', statusFilter = 'all') {
        const { open, close } = businessHours();
        const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
        const weekReservations = days.flatMap((day) => reservationsForDate(day))
            .filter((item) => matchesCalendarSearch(item, searchTerm, statusFilter));
        const gridRows = [];

        for (let minutes = open; minutes < close; minutes += 60) {
            gridRows.push(`
                <div class="week-time">${timeLabel(minutes)}</div>
                ${days.map((day) => {
                    const events = reservationsForDate(day)
                        .filter((item) => matchesCalendarSearch(item, searchTerm, statusFilter))
                        .filter((item) => {
                            const slot = new Date(item.scheduledSlot);
                            const eventMinutes = slot.getHours() * 60 + slot.getMinutes();
                            return eventMinutes >= minutes && eventMinutes < minutes + 60;
                        });
                    return `<div class="week-slot">${events.map(reservationCard).join('')}</div>`;
                }).join('')}
            `);
        }

        return `
            <section class="calendar-panel">
                <div class="calendar-heading">
                    <h2>Semana ${weekStart.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} - ${addDays(weekStart, 6).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</h2>
                    <span class="pill">${weekReservations.length} citas programadas</span>
                </div>
                <div class="week-calendar" style="--calendar-days: ${days.length};">
                    <div class="week-corner"></div>
                    ${days.map((day) => `
                        <div class="week-day">
                            <strong>${day.toLocaleDateString('es-PE', { weekday: 'short' })}</strong>
                            <span>${day.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                    `).join('')}
                    ${gridRows.join('')}
                </div>
            </section>
        `;
    }

    function renderReservationForm() {
        const services = data().services;
        document.getElementById('content').innerHTML = `
            <section class="card">
                <h2>Nueva reserva</h2>
                <form id="reservationForm" class="form-grid" style="margin-top: 16px;">
                    <input class="input" name="name" placeholder="Nombre del cliente" required>
                    <input class="input" name="phone" placeholder="Telefono" required>
                    <input class="input" name="petName" placeholder="Mascota" required>
                    <select name="service" required>${services.map((item) => `<option value="${item.id}">${item.name}</option>`).join('')}</select>
                    <input class="input" type="datetime-local" name="scheduledSlot" required>
                    <textarea class="full" name="message" placeholder="Notas operativas"></textarea>
                    <button class="btn primary" type="submit">Guardar reserva</button>
                    <button class="btn" type="button" onclick="location.reload()">Cancelar</button>
                </form>
            </section>
        `;
        document.getElementById('reservationForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(event.currentTarget));
            const service = services.find((item) => item.id === payload.service);
            payload.duration = Number(service?.duration || 60);
            payload.amount = Number(service?.price || 0);
            if (payload.amount > 0) {
                payload.status = 'Pendiente de pago';
                payload.paymentHoldMinutes = PAYMENT_HOLD_MINUTES;
                payload.paymentHoldExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60000).toISOString();
            }
            if (hasScheduleConflict(payload.scheduledSlot, payload.duration)) {
                alert('Ese horario se cruza con otra reserva activa. Elige otra hora.');
                return;
            }
            payload.scheduledAt = payload.scheduledSlot ? date(payload.scheduledSlot) : '';
            window.BusinessStore.createReservation(payload);
            location.href = 'reservas.html';
        });
    }

    function renderRescheduleForm(reservationId) {
        const reservation = data().reservations.find((item) => item.id === reservationId);
        if (!reservation) return;
        document.getElementById('content').innerHTML = `
            <section class="card">
                <h2>Reprogramar reserva</h2>
                <p>${reservation.name} - ${reservation.petName || 'Mascota sin nombre'} - ${reservation.service}</p>
                <form id="rescheduleForm" class="form-grid" style="margin-top: 16px;">
                    <input class="input" type="datetime-local" name="scheduledSlot" value="${localDateTimeValue(reservation.scheduledSlot)}" required>
                    <select name="status">
                        ${['Nueva', 'Confirmada', 'En proceso', 'Terminada', 'Cancelada'].map((option) => `<option ${option === reservation.status ? 'selected' : ''}>${option}</option>`).join('')}
                    </select>
                    <textarea class="full" name="message" placeholder="Notas operativas">${reservation.message || ''}</textarea>
                    <button class="btn primary" type="submit">Guardar cambios</button>
                    <button class="btn" type="button" onclick="location.href='reservas.html'">Cancelar</button>
                </form>
            </section>
        `;

        document.getElementById('rescheduleForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const payload = Object.fromEntries(new FormData(event.currentTarget));
            payload.duration = reservationDuration(reservation);
            if (hasScheduleConflict(payload.scheduledSlot, payload.duration, reservation.id)) {
                alert('Ese horario se cruza con otra reserva activa. Elige otra hora.');
                return;
            }
            payload.scheduledAt = payload.scheduledSlot ? date(payload.scheduledSlot) : '';
            window.BusinessStore.updateCollection('reservations', reservation.id, payload);
            location.href = 'reservas.html';
        });
    }

    function renderCustomers() {
        const store = data();
        const customerColumns = [
            { label: 'Cliente', render: (item) => `<strong>${item.name}</strong><div class="muted">${item.phone}</div>` },
            { label: 'Mascotas', render: (item) => {
                const pets = [...new Set(customerReservations(item).map((reservation) => reservation.petName).filter(Boolean))];
                if (item.petName && !pets.includes(item.petName)) pets.unshift(item.petName);
                return pets.length ? pets.join(', ') : '-';
            } },
            { label: 'Visitas', render: (item) => customerReservations(item).length },
            { label: 'Pagos', render: (item) => money(customerPayments(item).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)) },
            { label: 'Notas', render: (item) => item.notes || '-' },
            { label: 'Acciones', render: (item) => `<button class="btn compact" data-customer-profile="${item.id}" type="button">Historial</button>` }
        ];
        document.getElementById('content').innerHTML = `
            ${sectionTabs('clientes')}
            <div class="toolbar"><input class="input" id="search" placeholder="Buscar cliente o mascota"></div>
            <div id="table">${rows(store.customers, customerColumns)}</div>
        `;
        bindSearch(store.customers, customerColumns, ['name', 'phone', 'petName', 'notes']);
    }

    function renderCustomerProfile(customerId) {
        const customer = data().customers.find((item) => item.id === customerId);
        if (!customer) return renderCustomers();
        const reservations = customerReservations(customer);
        const payments = customerPayments(customer, reservations);
        const claims = customerClaims(customer);
        const pets = [...new Set([
            customer.petName,
            ...reservations.map((item) => item.petName)
        ].filter(Boolean))];
        const services = reservations.reduce((summary, item) => {
            const key = item.service || 'Servicio por confirmar';
            summary[key] = (summary[key] || 0) + 1;
            return summary;
        }, {});
        const paidTotal = payments
            .filter((item) => /pagado|token/i.test(item.status || ''))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const contactLink = whatsappLink(customer.phone);

        document.getElementById('content').innerHTML = `
            <div class="toolbar">
                <button class="btn" data-back-customers type="button">Volver a clientes</button>
                ${contactLink ? `<a class="btn" href="${contactLink}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            </div>
            <section class="card customer-profile">
                <div class="customer-profile-head">
                    <div>
                        <p class="eyebrow">Historial del cliente</p>
                        <h2>${customer.name || 'Cliente sin nombre'}</h2>
                        <p>${customer.phone || 'Sin telefono'}${customer.email ? ` · ${customer.email}` : ''}</p>
                    </div>
                    <span class="pill ok">${reservations.length} visitas</span>
                </div>
                <div class="grid customer-stats">
                    ${metric('Mascotas', pets.length || '-', 'PET')}
                    ${metric('Servicios tomados', Object.values(services).reduce((sum, count) => sum + count, 0), 'SV')}
                    ${metric('Pagado historico', money(paidTotal), 'S/')}
                    ${metric('Reclamos', claims.length, '!')}
                </div>
                <form id="customerNotesForm" class="customer-notes">
                    <label class="muted" for="customerNotes">Notas internas</label>
                    <textarea id="customerNotes" name="notes" rows="4" placeholder="Preferencias, alergias, indicaciones o acuerdos con el cliente.">${customer.notes || ''}</textarea>
                    <button class="btn primary" type="submit">Guardar notas</button>
                </form>
            </section>
            <div class="grid two customer-history-grid">
                <section class="card">
                    <h2>Mascotas y servicios</h2>
                    ${pets.length ? `
                        <div class="history-list">
                            ${pets.map((pet) => {
                                const petReservations = reservations.filter((item) => item.petName === pet);
                                return `
                                    <article class="history-item">
                                        <strong>${pet}</strong>
                                        <span>${petReservations.length} visitas</span>
                                        <div class="muted">${[...new Set(petReservations.map((item) => item.service).filter(Boolean))].join(', ') || 'Sin servicios registrados'}</div>
                                    </article>
                                `;
                            }).join('')}
                        </div>
                    ` : '<div class="empty">Aun no hay mascotas registradas.</div>'}
                    <div class="service-summary">
                        ${Object.entries(services).map(([service, count]) => `<span class="pill">${service}: ${count}</span>`).join('')}
                    </div>
                </section>
                <section class="card">
                    <h2>Pagos</h2>
                    ${payments.length ? rows(payments, paymentColumns(false)) : '<div class="empty">No hay pagos registrados para este cliente.</div>'}
                </section>
                <section class="card">
                    <h2>Reservas</h2>
                    ${reservations.length ? rows(reservations, reservationColumns(false)) : '<div class="empty">No hay reservas registradas para este cliente.</div>'}
                </section>
                <section class="card">
                    <h2>Reclamos</h2>
                    ${claims.length ? rows(claims, [
                        { label: 'Fecha', render: (item) => date(item.createdAt) },
                        { label: 'Tipo', render: (item) => item.type || '-' },
                        { label: 'Detalle', render: (item) => `<strong>${item.detail || '-'}</strong><div class="muted">${item.order || ''}</div>` },
                        { label: 'Estado', render: (item) => `<span class="pill ${statusClass(item.status)}">${item.status}</span>` }
                    ]) : '<div class="empty">No hay reclamos registrados para este cliente.</div>'}
                </section>
            </div>
        `;

        document.getElementById('customerNotesForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const notes = new FormData(event.currentTarget).get('notes') || '';
            window.BusinessStore.updateCollection('customers', customer.id, { notes });
            renderCustomerProfile(customer.id);
        });
    }

    function renderPayments() {
        const store = data();
        document.getElementById('content').innerHTML = `
            ${sectionTabs('finanzas')}
            <div class="toolbar"><input class="input" id="search" placeholder="Buscar pago"></div>
            <div id="table">${rows(store.payments, paymentColumns())}</div>
        `;
        bindSearch(store.payments, paymentColumns(), ['customerName', 'service', 'status', 'method']);
    }

    function renderClaims() {
        const store = data();
        document.getElementById('content').innerHTML = `${sectionTabs('clientes')}${rows(store.claims, [
            { label: 'Consumidor', render: (item) => `<strong>${item.name}</strong><div class="muted">${item.dni} · ${item.phone}</div>` },
            { label: 'Tipo', render: (item) => item.type },
            { label: 'Detalle', render: (item) => `<strong>${item.detail}</strong><div class="muted">${item.order}</div>` },
            { label: 'Estado', render: (item) => `<span class="pill ${statusClass(item.status)}">${item.status}</span>` },
            { label: 'Acciones', render: (item) => actionSelect('claims', item.id, item.status, ['Abierto', 'En revision', 'Cerrado']) }
        ])}`;
    }

    function reportList(items) {
        if (!items.length) return '<div class="empty">Aun no hay datos suficientes.</div>';
        const max = Math.max(...items.map((item) => item.value), 1);
        return `
            <div class="report-list">
                ${items.map((item) => `
                    <article class="report-row">
                        <div>
                            <strong>${item.label}</strong>
                            <span>${item.value} ${item.valueLabel.toLowerCase()}</span>
                        </div>
                        <div class="meter"><i style="width:${Math.round((item.value / max) * 100)}%"></i></div>
                    </article>
                `).join('')}
            </div>
        `;
    }

    function renderReports() {
        const store = data();
        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);
        const weekStart = startOfWeek(today);
        const nextWeek = addDays(weekStart, 7);
        const monthStart = startOfMonth(today);
        const nextMonth = addMonths(monthStart, 1);
        const paidPayments = store.payments.filter((item) => /pagado|token/i.test(item.status || ''));
        const paidInRange = (start, end) => paidPayments
            .filter((item) => inDateRange(item.createdAt, start, end))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const reservationsInRange = (start, end) => store.reservations
            .filter((item) => inDateRange(item.scheduledSlot || item.createdAt, start, end));
        const activeReservations = store.reservations.filter((item) => !/cancel/i.test(item.status || ''));
        const pendingPayments = activeReservations.filter((item) => !isPaidReservation(item) && !/terminada/i.test(item.status || ''));
        const expiredPayments = pendingPayments.filter(isPaymentHoldExpired);
        const openClaims = store.claims.filter((item) => !/cerrado/i.test(item.status || ''));
        const serviceRows = sortedSummaryRows(groupCount(activeReservations, (item) => item.service), 'Reservas').slice(0, 8);
        const sourceRows = sortedSummaryRows(groupCount(activeReservations, (item) => item.source), 'Reservas');
        const hourRows = sortedSummaryRows(groupCount(
            activeReservations.filter((item) => item.scheduledSlot),
            (item) => new Date(item.scheduledSlot).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        ), 'Citas').slice(0, 8);
        const recurringCustomers = store.customers
            .map((customer) => ({ customer, visits: customerReservations(customer).length }))
            .filter((item) => item.visits > 1)
            .sort((left, right) => right.visits - left.visits)
            .slice(0, 8);
        const todayReservations = reservationsInRange(today, tomorrow);
        const weekReservations = reservationsInRange(weekStart, nextWeek);
        const monthReservations = reservationsInRange(monthStart, nextMonth);

        document.getElementById('content').innerHTML = `
            ${sectionTabs('finanzas')}
            <div class="grid reports-metrics">
                ${metric('Ventas hoy', money(paidInRange(today, tomorrow)), 'S/')}
                ${metric('Ventas semana', money(paidInRange(weekStart, nextWeek)), 'S/')}
                ${metric('Ventas mes', money(paidInRange(monthStart, nextMonth)), 'S/')}
                ${metric('Pagos pendientes', pendingPayments.length, '!')}
            </div>
            <div class="grid reports-metrics">
                ${metric('Citas hoy', todayReservations.length, '#')}
                ${metric('Citas semana', weekReservations.length, '#')}
                ${metric('Citas mes', monthReservations.length, '#')}
                ${metric('Reclamos abiertos', openClaims.length, '!')}
            </div>
            <div class="grid two reports-grid">
                <section class="card">
                    <h2>Servicios mas vendidos</h2>
                    ${reportList(serviceRows)}
                </section>
                <section class="card">
                    <h2>Origen de reservas</h2>
                    ${reportList(sourceRows)}
                </section>
                <section class="card">
                    <h2>Horarios mas ocupados</h2>
                    ${reportList(hourRows)}
                </section>
                <section class="card">
                    <h2>Clientes recurrentes</h2>
                    ${recurringCustomers.length ? `
                        <div class="history-list">
                            ${recurringCustomers.map(({ customer, visits }) => `
                                <article class="history-item">
                                    <strong>${customer.name || 'Cliente'}</strong>
                                    <span>${visits} visitas</span>
                                    <div class="muted">${customer.phone || ''}</div>
                                </article>
                            `).join('')}
                        </div>
                    ` : '<div class="empty">Aun no hay clientes recurrentes.</div>'}
                </section>
                <section class="card">
                    <h2>Pagos pendientes o vencidos</h2>
                    ${pendingPayments.length ? rows(pendingPayments, [
                        { label: 'Cliente', render: (item) => `<strong>${item.name}</strong><div class="muted">${item.phone || ''}</div>` },
                        { label: 'Servicio', render: (item) => item.service || '-' },
                        { label: 'Monto', render: (item) => money(item.amount || item.price || 0) },
                        { label: 'Estado', render: (item) => `<span class="pill ${statusClass(reservationStatusLabel(item))}">${reservationStatusLabel(item)}</span><div class="muted">${paymentHoldLabel(item)}</div>` }
                    ]) : '<div class="empty">No hay pagos pendientes.</div>'}
                    ${expiredPayments.length ? `<p class="muted">${expiredPayments.length} pendientes ya estan vencidos.</p>` : ''}
                </section>
                <section class="card">
                    <h2>Reclamos abiertos</h2>
                    ${openClaims.length ? rows(openClaims, [
                        { label: 'Cliente', render: (item) => `<strong>${item.name}</strong><div class="muted">${item.phone || item.email || ''}</div>` },
                        { label: 'Tipo', render: (item) => item.type || '-' },
                        { label: 'Estado', render: (item) => `<span class="pill ${statusClass(item.status)}">${item.status}</span>` },
                        { label: 'Fecha', render: (item) => date(item.createdAt) }
                    ]) : '<div class="empty">No hay reclamos abiertos.</div>'}
                </section>
            </div>
        `;
    }

    function renderServices() {
        const store = data();
        document.getElementById('content').innerHTML = `
            <section class="services-catalog">
                <header class="services-catalog-head">
                    <div>
                        <h2>Catalogo de servicios</h2>
                        <p>${store.services.filter((item) => item.active).length} activos de ${store.services.length} servicios</p>
                    </div>
                    <button type="button" class="btn primary" id="newService">+ Nuevo servicio</button>
                </header>
                <div class="services-tools">
                    <div class="service-filters" aria-label="Filtrar servicios">
                        <button type="button" class="service-filter is-active" data-service-filter="all" aria-pressed="true">Todos</button>
                        <button type="button" class="service-filter" data-service-filter="active" aria-pressed="false">Activos</button>
                        <button type="button" class="service-filter" data-service-filter="inactive" aria-pressed="false">Inactivos</button>
                    </div>
                    <input class="input service-search" id="serviceSearch" type="search" placeholder="Buscar servicio">
                </div>
                <div class="service-list" id="serviceList">
                    ${store.services.length ? store.services.map((item) => `
                        <article class="service-row" data-service-id="${item.id}" data-active="${item.active ? 'true' : 'false'}" data-search="${`${item.name} ${item.id}`.toLowerCase()}">
                            <div class="service-identity"><strong>${item.name}</strong><span>${item.id}</span></div>
                            <div class="service-data service-price"><span>Precio</span><strong>${money(item.price)}</strong></div>
                            <div class="service-data"><span>Duracion</span><strong>${item.duration} min</strong></div>
                            <div><span class="pill ${item.active ? 'ok' : 'bad'}">${item.active ? 'Activo' : 'Inactivo'}</span></div>
                            <button type="button" class="btn service-edit" data-service-id="${item.id}">Editar</button>
                        </article>
                    `).join('') : '<div class="empty">Aun no hay servicios registrados.</div>'}
                    <div class="service-no-results" id="serviceNoResults" hidden>No encontramos servicios con esos filtros.</div>
                </div>
            </section>
            <div class="service-modal-backdrop" id="serviceModal" hidden>
                <section class="service-modal" role="dialog" aria-modal="true" aria-labelledby="serviceModalTitle">
                    <header class="service-modal-head">
                        <div><h2 id="serviceModalTitle">Nuevo servicio</h2><p id="serviceModalHelp">Agrega un servicio al catalogo de reservas.</p></div>
                        <button type="button" class="btn service-modal-close" id="serviceModalClose" aria-label="Cerrar">Cerrar</button>
                    </header>
                    <form id="serviceForm" class="form-grid">
                        <div class="service-field"><label for="serviceId">ID corto</label><input class="input" id="serviceId" name="id" placeholder="bano-premium" required></div>
                        <div class="service-field"><label for="serviceName">Nombre</label><input class="input" id="serviceName" name="name" placeholder="Nombre del servicio" required></div>
                        <div class="service-field"><label for="servicePrice">Precio S/</label><input class="input" id="servicePrice" name="price" type="number" min="0" step="1" required></div>
                        <div class="service-field"><label for="serviceDuration">Duracion en minutos</label><input class="input" id="serviceDuration" name="duration" type="number" min="0" step="5" required></div>
                        <label class="service-active"><input name="active" type="checkbox" checked> Disponible para WhatsApp</label>
                        <div class="service-modal-actions full">
                            <button class="btn" id="serviceCancelEdit" type="button">Cancelar</button>
                            <button class="btn primary" type="submit">Guardar servicio</button>
                        </div>
                    </form>
                </section>
            </div>
        `;
        const serviceForm = document.getElementById('serviceForm');
        const idField = serviceForm?.elements.namedItem('id');
        const nameField = serviceForm?.elements.namedItem('name');
        const priceField = serviceForm?.elements.namedItem('price');
        const durationField = serviceForm?.elements.namedItem('duration');
        const activeField = serviceForm?.elements.namedItem('active');
        const serviceModal = document.getElementById('serviceModal');
        const cancelEditButton = document.getElementById('serviceCancelEdit');
        const modalCloseButton = document.getElementById('serviceModalClose');
        const modalTitle = document.getElementById('serviceModalTitle');
        const modalHelp = document.getElementById('serviceModalHelp');
        let editingId = null;

        const resetServiceForm = () => {
            serviceForm?.reset();
            if (idField) idField.readOnly = false;
            const submitButton = serviceForm?.querySelector('button[type="submit"]');
            if (submitButton) submitButton.textContent = 'Guardar servicio';
            if (modalTitle) modalTitle.textContent = 'Nuevo servicio';
            if (modalHelp) modalHelp.textContent = 'Agrega un servicio al catalogo de reservas.';
            editingId = null;
        };

        const closeServiceModal = () => {
            if (serviceModal) serviceModal.hidden = true;
            resetServiceForm();
        };

        const openServiceModal = (service) => {
            if (!serviceForm || !serviceModal) return;
            resetServiceForm();
            if (service) {
                editingId = service.id;
                idField.value = service.id;
                idField.readOnly = true;
                nameField.value = service.name || '';
                priceField.value = Number(service.price || 0);
                durationField.value = Number(service.duration || 0);
                activeField.checked = service.active !== false;
                serviceForm.querySelector('button[type="submit"]').textContent = 'Actualizar servicio';
                modalTitle.textContent = 'Editar servicio';
                modalHelp.textContent = 'El ID se bloquea para evitar servicios duplicados.';
            }
            serviceModal.hidden = false;
            (service ? priceField : idField).focus();
        };

        document.getElementById('newService')?.addEventListener('click', () => openServiceModal());

        document.querySelectorAll('.service-edit').forEach((button) => {
            button.addEventListener('click', () => {
                const serviceId = button.dataset.serviceId;
                const service = data().services.find((item) => item.id === serviceId);
                if (service) openServiceModal(service);
            });
        });

        cancelEditButton?.addEventListener('click', closeServiceModal);
        modalCloseButton?.addEventListener('click', closeServiceModal);
        serviceModal?.addEventListener('click', (event) => {
            if (event.target === serviceModal) closeServiceModal();
        });

        let currentFilter = 'all';
        const serviceSearch = document.getElementById('serviceSearch');
        const serviceRows = [...document.querySelectorAll('.service-row')];
        const serviceNoResults = document.getElementById('serviceNoResults');
        const filterServices = () => {
            const query = String(serviceSearch?.value || '').trim().toLowerCase();
            let visible = 0;
            serviceRows.forEach((row) => {
                const matchesFilter = currentFilter === 'all' || row.dataset.active === String(currentFilter === 'active');
                const matchesQuery = !query || row.dataset.search.includes(query);
                row.hidden = !(matchesFilter && matchesQuery);
                if (!row.hidden) visible += 1;
            });
            if (serviceNoResults) serviceNoResults.hidden = visible > 0 || !serviceRows.length;
        };

        serviceSearch?.addEventListener('input', filterServices);
        document.querySelectorAll('.service-filter').forEach((button) => {
            button.addEventListener('click', () => {
                currentFilter = button.dataset.serviceFilter || 'all';
                document.querySelectorAll('.service-filter').forEach((filterButton) => {
                    const selected = filterButton === button;
                    filterButton.classList.toggle('is-active', selected);
                    filterButton.setAttribute('aria-pressed', String(selected));
                });
                filterServices();
            });
        });

        serviceForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const service = {
                id: String(form.get('id') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                name: String(form.get('name') || '').trim(),
                price: Number(form.get('price') || 0),
                duration: Number(form.get('duration') || 0),
                active: form.get('active') === 'on'
            };
            if (!service.id || !service.name) return;
            const next = data();
            const exists = next.services.some((item) => item.id === service.id);
            if (!exists && !editingId && !window.confirm(`El ID "${service.id}" no existe. Se creara un servicio nuevo. Continuar?`)) return;
            next.services = exists
                ? next.services.map((item) => item.id === service.id ? service : item)
                : [service, ...next.services];
            window.BusinessStore.write(next);
            renderServices();
        });
    }

    function renderMessages() {
        const store = data();
        const leads = store.reservations.map((item) => ({
            id: item.id,
            name: item.name,
            phone: item.phone,
            content: `Reserva solicitada para ${item.petName}: ${item.service}`,
            createdAt: item.createdAt
        }));
        document.getElementById('content').innerHTML = `${sectionTabs('clientes')}${rows(leads, [
            { label: 'Contacto', render: (item) => `<strong>${item.name}</strong><div class="muted">${item.phone}</div>` },
            { label: 'Mensaje', render: (item) => item.content },
            { label: 'Fecha', render: (item) => date(item.createdAt) },
            { label: 'WhatsApp', render: (item) => `<a class="btn" href="https://wa.me/51${String(item.phone).replace(/\D/g, '').slice(-9)}" target="_blank">Abrir</a>` }
        ])}`;
    }

    function renderSettings() {
        const store = data();
        const firebaseStatus = firebaseEnabled
            ? '<span class="pill ok">Firebase activo</span>'
            : '<span class="pill warn">Modo localStorage</span>';
        document.getElementById('content').innerHTML = `
            <section class="card" style="margin-bottom: 16px;">
                <h2>Estado de datos</h2>
                <p>${firebaseStatus}</p>
                <p class="muted">Si CONFIG.FIREBASE_CONFIG esta completo, reservas, pagos y reclamos se guardan en Firestore. Si no, se usa modo local.</p>
            </section>
            <section class="card">
                <h2>Configuracion del negocio</h2>
                <form id="settingsForm" class="form-grid" style="margin-top: 16px;">
                    <input class="input" name="businessName" value="${store.settings.businessName}" placeholder="Negocio">
                    <input class="input" name="phone" value="${store.settings.phone}" placeholder="Telefono">
                    <input class="input" name="whatsapp" value="${store.settings.whatsapp}" placeholder="WhatsApp con codigo pais">
                    <input class="input" name="hours" value="${store.settings.hours}" placeholder="Horario">
                    <input class="input full" name="address" value="${store.settings.address}" placeholder="Direccion">
                    <button class="btn primary" type="submit">Guardar</button>
                </form>
            </section>
            <section class="card" style="margin-top: 16px;">
                <h2>Exportar data operativa</h2>
                <p>Util para migrar luego a Firestore o revisar reservas fuera del navegador.</p>
                <button class="btn" id="exportData">Descargar JSON</button>
            </section>
        `;
        document.getElementById('settingsForm').addEventListener('submit', (event) => {
            event.preventDefault();
            const next = data();
            next.settings = { ...next.settings, ...Object.fromEntries(new FormData(event.currentTarget)) };
            window.BusinessStore.write(next);
            alert('Configuracion guardada.');
        });
        document.getElementById('exportData').addEventListener('click', () => {
            const blob = new Blob([window.BusinessStore.exportData()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'la-vecindad-dashboard-data.json';
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    function bindSearch(items, columns, keys) {
        const search = document.getElementById('search');
        const table = document.getElementById('table');
        if (!search || !table) return;
        search.addEventListener('input', () => {
            const term = search.value.toLowerCase();
            const filtered = items.filter((item) => keys.some((key) => String(item[key] || '').toLowerCase().includes(term)));
            table.innerHTML = rows(filtered, columns);
        });
    }

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (!target.matches('[data-update]')) return;
        window.BusinessStore.updateCollection(target.dataset.update, target.dataset.id, { status: target.value });
    });

    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-reschedule]');
        if (!target) return;
        renderRescheduleForm(target.dataset.reschedule);
    });

    document.addEventListener('click', (event) => {
        const profileTarget = event.target.closest('[data-customer-profile]');
        if (profileTarget) {
            renderCustomerProfile(profileTarget.dataset.customerProfile);
            return;
        }

        if (event.target.closest('[data-back-customers]')) {
            renderCustomers();
        }
    });

    if (page === 'login') {
        const emailField = document.getElementById('email');
        const passwordField = document.getElementById('password');
        const forgotPassword = document.getElementById('forgotPassword');
        const loginHelp = document.getElementById('loginHelp');
        const feedback = document.getElementById('loginError');

        const showFeedback = (message, success = false) => {
            feedback.textContent = message;
            feedback.style.color = success ? '#86efac' : '#fca5a5';
        };

        const authErrorMessage = (authError, fallback) => {
            const code = authError?.code || '';
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                return 'El correo o la contraseña no son correctos.';
            }
            if (code === 'auth/invalid-email') return 'Ingresa un correo válido.';
            if (code === 'auth/too-many-requests') return 'Hubo demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
            if (code === 'auth/network-request-failed') return 'No se pudo conectar. Revisa tu internet e inténtalo nuevamente.';
            return fallback;
        };

        loginHelp.textContent = firebaseEnabled
            ? 'Ingresa con tu usuario de Firebase Auth.'
            : 'Firebase Auth no está disponible. Contacta al administrador.';

        document.getElementById('loginForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            showFeedback('');

            try {
                if (!firebaseEnabled) {
                    showFeedback('Firebase Auth no está disponible. Contacta al administrador.');
                    return;
                }

                if (!emailField.value || !passwordField.value) {
                    showFeedback('Ingresa correo y contraseña.');
                    return;
                }

                await window.BusinessStore.signIn(emailField.value, passwordField.value);
                location.href = 'index.html';
            } catch (loginError) {
                showFeedback(authErrorMessage(loginError, 'No se pudo iniciar sesión.'));
            }
        });

        forgotPassword.addEventListener('click', async () => {
            const email = emailField.value.trim();
            showFeedback('');

            if (!email) {
                showFeedback('Escribe tu correo y luego pulsa “¿Olvidaste tu contraseña?”.');
                emailField.focus();
                return;
            }

            forgotPassword.disabled = true;
            try {
                await window.BusinessStore.resetPassword(email);
                showFeedback('Te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam.', true);
            } catch (resetError) {
                showFeedback(authErrorMessage(resetError, 'No se pudo enviar el correo de recuperación.'));
            } finally {
                forgotPassword.disabled = false;
            }
        });
        return;
    }

    setActiveNav();
    document.getElementById('logout')?.addEventListener('click', async () => {
        await window.BusinessStore.signOut();
        location.href = 'login.html';
    });

    const renderers = {
        resumen: renderSummary,
        hoy: renderToday,
        reservas: renderReservations,
        clientes: renderCustomers,
        pagos: renderPayments,
        reclamos: renderClaims,
        reportes: renderReports,
        servicios: renderServices,
        mensajes: renderMessages,
        configuracion: renderSettings
    };

    const contentEl = document.getElementById('content');
    let lastPainted = '';
    let refreshPending = false;

    function storeSnapshot() {
        return JSON.stringify(window.BusinessStore.read());
    }

    function storeHasCachedData(store) {
        return Boolean(
            (store.reservations || []).length ||
            (store.customers || []).length ||
            (store.payments || []).length ||
            (store.claims || []).length
        );
    }

    function userIsEditing() {
        const active = document.activeElement;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return true;
        return Boolean(document.querySelector('.service-modal-backdrop:not([hidden])'));
    }

    function paint() {
        const snapshot = storeSnapshot();
        if (snapshot === lastPainted) return;
        lastPainted = snapshot;
        renderers[page]?.();
    }

    // Primera pintura con los datos ya guardados en el navegador: la seccion
    // aparece al instante, sin esperar a que Firestore responda.
    if (storeHasCachedData(data())) {
        paint();
    } else if (contentEl) {
        contentEl.innerHTML = '<p class="muted">Cargando datos...</p>';
    }

    // Cuando Firestore termina de responder, la seccion se actualiza sola.
    window.BusinessStore.ready?.then(() => {
        if (userIsEditing()) {
            refreshPending = true;
            return;
        }
        paint();
    });

    window.addEventListener('business-data-updated', () => {
        if (userIsEditing()) {
            refreshPending = true;
            return;
        }
        paint();
    });

    document.addEventListener('focusout', () => {
        if (!refreshPending) return;
        refreshPending = false;
        setTimeout(() => {
            if (!userIsEditing()) paint();
        }, 150);
    });
})();
