function setLanguage(lang) {
    if (!translations[lang]) return;

    localStorage.setItem('samplix_lang', lang);
    document.documentElement.lang = lang;

    updateContent(lang);
    updateActiveSwitcher(lang);
}

function updateContent(lang) {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.innerHTML = translations[lang][key];
        }
    });

    // Update placeholders if needed
    const inputs = document.querySelectorAll('[data-i18n-placeholder]');
    inputs.forEach(input => {
        const key = input.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            input.placeholder = translations[lang][key];
        }
    });
}

function updateActiveSwitcher(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function initLanguage() {
    const savedLang = localStorage.getItem('samplix_lang');
    const systemLang = navigator.language.startsWith('pl') ? 'pl' : 'en';
    const lang = savedLang || systemLang;

    setLanguage(lang);
}

document.addEventListener('DOMContentLoaded', () => {
    // Inject Language Switcher
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const div = document.createElement('div');
        div.className = 'lang-switcher';
        div.style.marginLeft = '20px';
        div.style.display = 'inline-flex';
        div.style.gap = '10px';

        div.innerHTML = `
            <button class="lang-btn" data-lang="en" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-weight:500;">EN</button>
            <span style="color:var(--text-secondary)">/</span>
            <button class="lang-btn" data-lang="pl" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-weight:500;">PL</button>
        `;

        navLinks.appendChild(div);

        // Add styles for active state
        const style = document.createElement('style');
        style.textContent = `
            .lang-btn.active { color: var(--accent) !important; font-weight: 700 !important; }
            .lang-btn:hover { color: var(--text-primary) !important; }
        `;
        document.head.appendChild(style);

        // Add events
        div.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
        });
    }

    initLanguage();
});
