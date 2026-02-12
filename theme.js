document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const iconLight = document.querySelector('.theme-icon-light');
    const iconDark = document.querySelector('.theme-icon-dark');

    // Check for saved user preference
    const savedTheme = localStorage.getItem('theme');

    // Check for system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        body.classList.add('dark-mode');
        updateIcons(true);
    } else {
        updateIcons(false);
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcons(isDark);
    });

    function updateIcons(isDark) {
        if (isDark) {
            iconLight.style.display = 'inline';
            iconDark.style.display = 'none';
            document.getElementById('themeToggle').setAttribute('data-tooltip', 'Modo Claro');
        } else {
            iconLight.style.display = 'none';
            iconDark.style.display = 'inline';
            document.getElementById('themeToggle').setAttribute('data-tooltip', 'Modo Oscuro');
        }
    }
});
