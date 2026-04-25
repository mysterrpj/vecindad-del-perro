(function () {
    const STORAGE_KEY = 'lvdperro_business_data_v1';
    const COLLECTIONS = ['reservations', 'customers', 'payments', 'claims', 'messages', 'services'];

    const defaultServices = [
        { id: 'bano', name: 'Baño Completo', price: 35, duration: 90, active: true },
        { id: 'grooming', name: 'Grooming Completo', price: 55, duration: 120, active: true },
        { id: 'indumentaria', name: 'Indumentaria', price: 20, duration: 30, active: true },
        { id: 'spa', name: 'Spa Relax', price: 65, duration: 120, active: true },
        { id: 'dental', name: 'Higiene Dental', price: 25, duration: 45, active: true },
        { id: 'domicilio', name: 'Servicio a Domicilio', price: 15, duration: 60, active: true }
    ];

    const defaultData = {
        reservations: [],
        customers: [],
        payments: [],
        claims: [],
        messages: [],
        services: defaultServices,
        settings: {
            businessName: 'La Vecindad del Perro',
            phone: '970 716 064',
            whatsapp: '51970716064',
            address: 'Mz P1 Lote 26, Montenegro, SJL',
            hours: '7:00 AM - 8:00 PM',
            dashboardPin: '1234'
        }
    };

    const firebaseState = {
        enabled: Boolean(window.CONFIG?.FIREBASE_CONFIG?.apiKey),
        ready: false,
        error: null,
        app: null,
        auth: null,
        db: null,
        user: null,
        api: null
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeData(data) {
        return {
            ...clone(defaultData),
            ...(data || {}),
            settings: { ...clone(defaultData.settings), ...(data?.settings || {}) },
            services: data?.services?.length ? data.services : clone(defaultServices)
        };
    }

    function read() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return clone(defaultData);
            return normalizeData(JSON.parse(raw));
        } catch (error) {
            console.error('No se pudo leer la data local', error);
            return clone(defaultData);
        }
    }

    function write(data, options = {}) {
        const next = normalizeData(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('business-data-updated', { detail: next }));

        if (!options.skipCloud) {
            syncSettingsToCloud(next.settings);
            syncServicesToCloud(next.services);
        }

        return next;
    }

    function id(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    }

    function toIso(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value.toDate) return value.toDate().toISOString();
        if (value.seconds) return new Date(value.seconds * 1000).toISOString();
        return new Date(value).toISOString();
    }

    function normalizeDoc(docSnap) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: toIso(data.createdAt),
            updatedAt: toIso(data.updatedAt),
            scheduledSlot: toIso(data.scheduledSlot),
            paymentHoldExpiresAt: toIso(data.paymentHoldExpiresAt)
        };
    }

    async function initFirebase() {
        if (!firebaseState.enabled) {
            firebaseState.ready = true;
            return;
        }

        try {
            const appModule = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
            const authModule = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
            const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');

            firebaseState.api = { ...authModule, ...firestoreModule };
            firebaseState.app = appModule.initializeApp(window.CONFIG.FIREBASE_CONFIG);
            firebaseState.auth = authModule.getAuth(firebaseState.app);
            firebaseState.db = firestoreModule.getFirestore(firebaseState.app);

            firebaseState.user = await new Promise((resolve) => {
                const unsubscribe = authModule.onAuthStateChanged(firebaseState.auth, (user) => {
                    unsubscribe();
                    resolve(user);
                });
            });

            if (firebaseState.user) {
                await loadFromCloud();
            }

            firebaseState.ready = true;
        } catch (error) {
            firebaseState.error = error;
            firebaseState.enabled = false;
            firebaseState.ready = true;
            console.error('Firebase no pudo inicializar. Se usara localStorage.', error);
        }
    }

    async function loadFromCloud() {
        if (!firebaseState.db || !firebaseState.api) return read();

        const { collection, getDocs, doc, getDoc, setDoc } = firebaseState.api;
        const next = clone(defaultData);

        await Promise.all(COLLECTIONS.map(async (name) => {
            const snapshot = await getDocs(collection(firebaseState.db, name));
            next[name] = snapshot.docs.map(normalizeDoc);
        }));

        const settingsSnap = await getDoc(doc(firebaseState.db, 'settings', 'business'));
        if (settingsSnap.exists()) {
            next.settings = { ...next.settings, ...settingsSnap.data() };
        } else {
            await setDoc(doc(firebaseState.db, 'settings', 'business'), next.settings, { merge: true });
        }

        if (!next.services.length) {
            next.services = clone(defaultServices);
            await Promise.all(next.services.map((service) => (
                setDoc(doc(firebaseState.db, 'services', service.id), service, { merge: true })
            )));
        }

        return write(next, { skipCloud: true });
    }

    function canUseCloud() {
        return Boolean(firebaseState.enabled && firebaseState.db && firebaseState.api && firebaseState.user && !firebaseState.error);
    }

    function canWritePublicCloud() {
        return Boolean(firebaseState.enabled && firebaseState.db && firebaseState.api && !firebaseState.error);
    }

    async function setCloudDoc(collectionName, item) {
        if (firebaseState.enabled && !firebaseState.ready) {
            await readyPromise;
        }
        if (!canWritePublicCloud()) return;
        const { doc, setDoc, serverTimestamp } = firebaseState.api;
        await setDoc(doc(firebaseState.db, collectionName, item.id), {
            ...item,
            createdAt: item.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    async function updateCloudDoc(collectionName, itemId, patch) {
        if (!canUseCloud()) return;
        const { doc, updateDoc, serverTimestamp } = firebaseState.api;
        await updateDoc(doc(firebaseState.db, collectionName, itemId), {
            ...patch,
            updatedAt: serverTimestamp()
        });
    }

    async function syncSettingsToCloud(settings) {
        if (!canUseCloud()) return;
        const { doc, setDoc, serverTimestamp } = firebaseState.api;
        await setDoc(doc(firebaseState.db, 'settings', 'business'), {
            ...settings,
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    async function syncServicesToCloud(services) {
        if (!canUseCloud()) return;
        const { doc, setDoc, serverTimestamp } = firebaseState.api;
        await Promise.all((services || []).map((service) => (
            setDoc(doc(firebaseState.db, 'services', service.id), {
                ...service,
                price: Number(service.price || 0),
                duration: Number(service.duration || 0),
                active: service.active !== false,
                updatedAt: serverTimestamp()
            }, { merge: true })
        )));
    }

    function upsertCustomer(data, reservationId) {
        const store = read();
        const phone = String(data.phone || '').replace(/\D/g, '');
        let customer = store.customers.find((item) => String(item.phone || '').replace(/\D/g, '') === phone);

        if (!customer) {
            customer = {
                id: id('cus'),
                name: data.name,
                phone: data.phone,
                email: data.email || '',
                petName: data.petName || '',
                notes: data.message || '',
                reservations: [],
                createdAt: new Date().toISOString()
            };
            store.customers.unshift(customer);
        }

        if (reservationId && !customer.reservations.includes(reservationId)) {
            customer.reservations.unshift(reservationId);
        }

        write(store, { skipCloud: true });
        setCloudDoc('customers', customer);
        return customer;
    }

    function createReservation(payload) {
        const store = read();
        const service = store.services.find((item) => item.id === payload.service || item.name === payload.service);
        const reservation = {
            id: id('res'),
            name: payload.name,
            phone: payload.phone,
            petName: payload.petName,
            service: service?.name || payload.service || 'Servicio por confirmar',
            serviceId: service?.id || payload.service || '',
            amount: Number(payload.amount || service?.price || 0),
            message: payload.message || '',
            status: payload.status || 'Nueva',
            source: payload.source || 'Formulario web',
            duration: Number(payload.duration || service?.duration || 60),
            createdAt: new Date().toISOString(),
            scheduledAt: payload.scheduledAt || '',
            scheduledSlot: payload.scheduledSlot || '',
            paymentHoldMinutes: Number(payload.paymentHoldMinutes || 0),
            paymentHoldExpiresAt: payload.paymentHoldExpiresAt || ''
        };

        store.reservations.unshift(reservation);
        write(store, { skipCloud: true });
        upsertCustomer(payload, reservation.id);
        setCloudDoc('reservations', reservation);
        return reservation;
    }

    function createPayment(payload) {
        const store = read();
        const payment = {
            id: id('pay'),
            reservationId: payload.reservationId || '',
            customerName: payload.customerName || payload.name || 'Cliente web',
            service: payload.service || 'Servicio',
            amount: Number(payload.amount || 0),
            method: payload.method || 'Culqi',
            status: payload.status || 'Pendiente de backend',
            tokenReceived: Boolean(payload.token),
            tokenPreview: payload.token ? `${payload.token.slice(0, 8)}...` : '',
            createdAt: new Date().toISOString()
        };
        store.payments.unshift(payment);
        write(store, { skipCloud: true });
        setCloudDoc('payments', payment);
        return payment;
    }

    function createClaim(payload) {
        const store = read();
        const claim = {
            id: id('cla'),
            name: payload.name,
            dni: payload.dni,
            email: payload.email,
            phone: payload.phone,
            address: payload.address,
            type: payload.type,
            detail: payload.detail,
            order: payload.order,
            status: 'Abierto',
            createdAt: new Date().toISOString()
        };
        store.claims.unshift(claim);
        write(store, { skipCloud: true });
        setCloudDoc('claims', claim);
        return claim;
    }

    function updateCollection(collectionName, itemId, patch) {
        const store = read();
        store[collectionName] = (store[collectionName] || []).map((item) => (
            item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
        ));
        write(store, { skipCloud: true });
        updateCloudDoc(collectionName, itemId, patch);
        return store;
    }

    function removeFromCollection(collectionName, itemId) {
        const store = read();
        store[collectionName] = (store[collectionName] || []).filter((item) => item.id !== itemId);
        write(store, { skipCloud: true });
        return store;
    }

    async function signIn(email, password) {
        if (!firebaseState.enabled || firebaseState.error) {
            throw new Error('Firebase Auth no esta configurado.');
        }
        const { signInWithEmailAndPassword } = firebaseState.api;
        const credential = await signInWithEmailAndPassword(firebaseState.auth, email, password);
        firebaseState.user = credential.user;
        await loadFromCloud();
        return credential.user;
    }

    async function signOut() {
        if (canUseCloud()) {
            await firebaseState.api.signOut(firebaseState.auth);
        }
        firebaseState.user = null;
        sessionStorage.removeItem('lvdperro_admin');
    }

    function isFirebaseEnabled() {
        return Boolean(window.CONFIG?.FIREBASE_CONFIG?.apiKey);
    }

    function getUser() {
        return firebaseState.user;
    }

    function exportData() {
        return JSON.stringify(read(), null, 2);
    }

    const readyPromise = initFirebase();

    window.BusinessStore = {
        ready: readyPromise,
        read,
        write,
        createReservation,
        createPayment,
        createClaim,
        updateCollection,
        removeFromCollection,
        signIn,
        signOut,
        isFirebaseEnabled,
        getUser,
        exportData,
        defaultServices
    };
})();
