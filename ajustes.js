/* ==========================================================================
   PANEL DE CONTROL - La Vecindad del Perro
   --------------------------------------------------------------------------
   Este es el UNICO archivo que necesitas abrir para:
     1) Cambiar el numero de WhatsApp del negocio.
     2) Encender o apagar los cobros con tarjeta (Culqi).
     3) Encender o apagar el bot automatico de WhatsApp (Twilio).

   Al cambiar algo aqui, se aplica en toda la web (botones, enlaces, panel).
   ========================================================================== */
window.AJUSTES = {
    // Numero de WhatsApp del negocio. Con codigo de pais y solo digitos.
    // Peru: 51 + numero. Ejemplo: 51991845638
    whatsapp: '51991845638',

    // Como se muestra el numero en la web.
    telefonoVisible: '991 845 638',

    // INTERRUPTORES. Deja false mientras no se use cada funcion.
    // Para encenderla, cambia false por true y publica el sitio.

    // Cobros con tarjeta (Culqi).
    cobrosConTarjeta: false,

    // Bot automatico de WhatsApp (Twilio).
    botAutomatico: false
};

/* --------------------------------------------------------------------------
   A partir de aqui no hace falta tocar nada: es lo que aplica los ajustes
   en la pagina (enlaces de WhatsApp y numero visible).
   -------------------------------------------------------------------------- */
(function aplicarAjustesEnLaPagina() {
    const numero = String(window.AJUSTES.whatsapp || '').replace(/\D/g, '');
    const visible = window.AJUSTES.telefonoVisible || '';

    function aplicar() {
        if (numero) {
            document.querySelectorAll('a[href*="wa.me/"]').forEach((enlace) => {
                const actual = enlace.getAttribute('href') || '';
                enlace.setAttribute('href', actual.replace(/wa\.me\/\d+/, 'wa.me/' + numero));
            });
        }
        if (visible) {
            document.querySelectorAll('[data-telefono-visible]').forEach((nodo) => {
                nodo.textContent = visible;
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicar);
    } else {
        aplicar();
    }
})();