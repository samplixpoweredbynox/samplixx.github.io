const defaultTheme = {
    "name": "My Custom Theme",
    "author": "Creator",
    "dark": {
        "primary": "#4fffa3",
        "bg_dark": "#2d2d2d",
        "bg_panel": "#333333",
        "title_bar": "#2d2d2d",
        "border": "#444444",
        "hover": "#3d3d3d",
        "text": "#e0faea",
        "text_on_primary": "#0f221a",
        "selection_bg": "#254a3e",
        "accent": "#4fffa3"
    },
    "light": {
        "primary": "#005f40",
        "bg_dark": "#f3f3f3",
        "bg_panel": "#ffffff",
        "title_bar": "#f0f0f0",
        "border": "#dddddd",
        "hover": "#e6fff4",
        "text": "#333333",
        "text_on_primary": "#ffffff",
        "selection_bg": "#005f40",
        "accent": "#005f40"
    }
};

let currentTheme = JSON.parse(JSON.stringify(defaultTheme));

// DOM Elements
const themeNameInput = document.getElementById('themeName');
const themeAuthorInput = document.getElementById('themeAuthor');
const darkContainer = document.getElementById('dark');
const lightContainer = document.getElementById('light');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const btnImport = document.getElementById('btnImport');
const importFile = document.getElementById('importFile');
const btnExport = document.getElementById('btnExport');

// Initialize
function init() {
    renderColors();
    setupEventListeners();
}

function renderColors() {
    renderColorGrid(darkContainer, 'dark');
    renderColorGrid(lightContainer, 'light');
}

function renderColorGrid(container, mode) {
    container.innerHTML = '';
    const colors = currentTheme[mode];

    Object.keys(colors).forEach(key => {
        const hex = colors[key];
        const item = document.createElement('div');
        item.className = 'color-item';

        const friendlyName = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        item.innerHTML = `
            <div class="color-preview-wrapper" style="background-color: ${hex}">
                <input type="color" value="${hex}" data-mode="${mode}" data-key="${key}">
            </div>
            <div class="color-label">
                <span class="color-name" title="${friendlyName}">${friendlyName}</span>
                <span class="color-hex">${hex}</span>
            </div>
        `;

        container.appendChild(item);

        // Add event listener to input
        const input = item.querySelector('input[type="color"]');
        input.addEventListener('input', (e) => {
            const newColor = e.target.value;
            item.querySelector('.color-preview-wrapper').style.backgroundColor = newColor;
            item.querySelector('.color-hex').textContent = newColor;
            currentTheme[mode][key] = newColor;
        });
    });
}

function setupEventListeners() {
    // Inputs
    themeNameInput.addEventListener('input', (e) => currentTheme.name = e.target.value);
    themeAuthorInput.addEventListener('input', (e) => currentTheme.author = e.target.value);

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Import/Export
    btnExport.addEventListener('click', exportTheme);
    btnImport.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', handleFileImport);
}

function exportTheme() {
    const dataStr = JSON.stringify(currentTheme, null, 4);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${currentTheme.name.replace(/\s+/g, '_')}.sltheme`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (!loadedData.dark || !loadedData.light) {
                alert('Invalid theme file format');
                return;
            }

            // Merge loaded data into current structure to preset keys
            currentTheme = { ...defaultTheme, ...loadedData }; // simple merge may lose missing keys in defaultTheme if loadedData has extra, but safe for this tool

            // Re-render
            themeNameInput.value = currentTheme.name || '';
            themeAuthorInput.value = currentTheme.author || '';
            renderColors();
            alert('Theme loaded successfully!');

        } catch (error) {
            console.error(error);
            alert('Failed to load theme. Check console for details.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}

// Start
init();
