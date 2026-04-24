document.addEventListener('DOMContentLoaded', () => {
    // Prevent double execution
    if (window.themeInitialized) return;
    window.themeInitialized = true;

    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const iconLight = document.querySelector('.theme-icon-light');
    const iconDark = document.querySelector('.theme-icon-dark');
    const mobileThemeQuery = window.matchMedia('(max-width: 768px)');

    // Check for saved user preference
    const savedTheme = localStorage.getItem('theme');

    // Check for system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    applyTheme();

    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (isMobileViewport()) {
                body.classList.add('dark-mode');
                updateIcons(true);
                return;
            }

            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateIcons(isDark);
        });
    }

    if (mobileThemeQuery.addEventListener) {
        mobileThemeQuery.addEventListener('change', applyTheme);
    } else if (mobileThemeQuery.addListener) {
        mobileThemeQuery.addListener(applyTheme);
    }

    function isMobileViewport() {
        return mobileThemeQuery.matches;
    }

    function applyTheme() {
        if (!body) return;

        if (isMobileViewport()) {
            body.classList.add('dark-mode');
            updateIcons(true);
            return;
        }

        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            body.classList.add('dark-mode');
            updateIcons(true);
        } else {
            body.classList.remove('dark-mode');
            updateIcons(false);
        }
    }

    function updateIcons(isDark) {
        if (!iconLight || !iconDark) return;

        if (isDark) {
            iconLight.style.display = 'inline';
            iconDark.style.display = 'none';
            if (themeToggle) themeToggle.setAttribute('data-tooltip', 'Modo Claro');
        } else {
            iconLight.style.display = 'none';
            iconDark.style.display = 'inline';
            if (themeToggle) themeToggle.setAttribute('data-tooltip', 'Modo Oscuro');
        }
    }
});
