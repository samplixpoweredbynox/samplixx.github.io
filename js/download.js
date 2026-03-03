/**
 * Samplix Download Page – GitHub Release Fetcher
 * Fetches latest releases from GitHub API and renders platform-specific download cards.
 * 
 * PASSWORD: Set to null or "" to disable the password gate entirely.
 */

const DOWNLOAD_PASSWORD = 'Sx7#kQ9mW2pL4';
const GITHUB_REPO = 'samplixpoweredbynox/SAMPLIX-TOOLS';
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

// ─── Helpers ──────────────────────────────────────────────

function classifyRelease(release) {
    const tag = (release.tag_name || '').toLowerCase();
    const name = (release.name || '').toLowerCase();

    if (tag.includes('vst')) return 'vst';
    if (tag.includes('beta') || name.includes('beta') || release.prerelease) return 'beta';
    return 'stable';
}

function identifyPlatform(asset) {
    const name = asset.name.toLowerCase();
    if (name.endsWith('.exe')) return 'windows';
    if (name.includes('macos') && name.includes('intel')) return 'macos-intel';
    if (name.includes('macos') && name.endsWith('.zip')) return 'macos-arm';
    if (name.endsWith('.zip') && name.includes('mac')) return 'macos-arm';
    return null;
}

const PLATFORM_META = {
    'windows': {
        label: 'Windows',
        icon: '🖥️',
        ext: '.exe'
    },
    'macos-arm': {
        label: 'macOS (Apple Silicon)',
        icon: '🍎',
        ext: '.zip'
    },
    'macos-intel': {
        label: 'macOS (Intel)',
        icon: '🍏',
        ext: '.zip'
    }
};

// ─── Rendering ────────────────────────────────────────────

function renderPlatformCards(release, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!release) {
        container.innerHTML = `
            <div class="dl-empty">
                <div class="badge" style="font-size:1.2rem; padding:10px 24px;">SOON!</div>
            </div>`;
        return;
    }

    const assets = release.assets || [];
    const platformAssets = {};

    assets.forEach(asset => {
        const platform = identifyPlatform(asset);
        if (platform) {
            platformAssets[platform] = asset;
        }
    });

    const version = release.tag_name;

    if (Object.keys(platformAssets).length === 0) {
        container.innerHTML = `
            <div class="dl-empty">
                <p>Brak plików do pobrania w tym wydaniu (${version}).</p>
            </div>`;
        return;
    }

    let html = '<div class="platform-cards">';

    ['windows', 'macos-arm', 'macos-intel'].forEach(platformKey => {
        const asset = platformAssets[platformKey];
        const meta = PLATFORM_META[platformKey];

        if (asset) {
            html += `
                <div class="platform-card">
                    <div class="platform-icon">${meta.icon}</div>
                    <h3>${meta.label}</h3>
                    <p class="platform-version">${version}</p>
                    <p class="platform-file">${asset.name}</p>
                    <button class="btn primary platform-dl-btn"
                            data-url="${asset.browser_download_url}"
                            data-name="${asset.name}">
                        ⬇ Pobierz
                    </button>
                </div>`;
        } else {
            html += `
                <div class="platform-card platform-card--disabled">
                    <div class="platform-icon">${meta.icon}</div>
                    <h3>${meta.label}</h3>
                    <p class="platform-version">—</p>
                    <p class="platform-file">Niedostępne</p>
                    <button class="btn secondary platform-dl-btn" disabled
                            style="opacity:0.4;cursor:not-allowed;">
                        Wkrótce
                    </button>
                </div>`;
        }
    });

    html += '</div>';
    html += `
        <div class="dl-instruction">
            <p>�️ <strong>Windows:</strong> Jeśli system blokuje plik, kliknij <strong>Więcej informacji</strong> → <strong>Uruchom mimo to</strong>.</p>
            <p style="margin-top:8px;">🍎 <strong>macOS:</strong> Przy komunikacie o „nieznanym deweloperze" — kliknij Anuluj, następnie wejdź w <strong>Ustawienia → Prywatność i bezpieczeństwo</strong>, zjedź na dół i kliknij <strong>Otwórz mimo to</strong>. Potwierdź hasłem / Touch ID i kliknij <strong>Otwórz</strong>.</p>
        </div>`;

    container.innerHTML = html;
    attachDownloadListeners(container);
}

function renderVSTSection(release) {
    const container = document.getElementById('vst-releases');
    if (!container) return;

    if (!release) {
        // Keep existing "Coming Soon" content
        return;
    }

    // If VST releases exist in the future, render them similarly
    renderPlatformCards(release, 'vst-releases');
}

// ─── Password Modal ──────────────────────────────────────

let pendingDownloadUrl = null;

function showPasswordModal(downloadUrl) {
    pendingDownloadUrl = downloadUrl;
    const modal = document.getElementById('password-modal');
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');

    if (modal) {
        modal.classList.add('active');
        input.value = '';
        error.style.display = 'none';
        setTimeout(() => input.focus(), 100);
    }
}

function hidePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    pendingDownloadUrl = null;
}

function handlePasswordSubmit() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');
    const value = input.value.trim();

    if (value === DOWNLOAD_PASSWORD) {
        error.style.display = 'none';
        if (pendingDownloadUrl) {
            window.location.href = pendingDownloadUrl;
        }
        hidePasswordModal();
    } else {
        error.style.display = 'block';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
    }
}

function attachDownloadListeners(scope) {
    const buttons = scope.querySelectorAll('.platform-dl-btn:not([disabled])');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            if (!url) return;

            // If password is disabled, download directly
            if (!DOWNLOAD_PASSWORD) {
                window.location.href = url;
                return;
            }

            showPasswordModal(url);
        });
    });
}

// ─── Tabs ─────────────────────────────────────────────────

function initTabs(sectionPrefix) {
    const tabs = document.querySelectorAll(`[data-tab-group="${sectionPrefix}"]`);
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab-target');

            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            document.querySelectorAll(`[data-tab-section="${sectionPrefix}"]`).forEach(section => {
                section.style.display = 'none';
            });
            const targetEl = document.getElementById(target);
            if (targetEl) targetEl.style.display = 'block';
        });
    });
}

// ─── Main Init ────────────────────────────────────────────

async function initDownloadPage() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

        const releases = await response.json();

        let latestStable = null;
        let latestBeta = null;
        let latestVST = null;

        for (const release of releases) {
            const type = classifyRelease(release);

            if (type === 'stable' && !latestStable) {
                latestStable = release;
            } else if (type === 'beta' && !latestBeta) {
                latestBeta = release;
            } else if (type === 'vst' && !latestVST) {
                latestVST = release;
            }

            // Stop early if we have everything
            if (latestStable && latestBeta && latestVST) break;
        }

        // Render Desktop section
        renderPlatformCards(latestStable, 'desktop-stable');
        renderPlatformCards(latestBeta, 'desktop-beta');

        // Render VST section
        renderVSTSection(latestVST);

        // Update version in "What's New" header if stable exists
        if (latestStable) {
            const whatsNewEl = document.getElementById('whats-new-version');
            if (whatsNewEl) whatsNewEl.textContent = latestStable.tag_name;
        }

    } catch (err) {
        console.error('Failed to fetch releases:', err);
        const containers = ['desktop-stable', 'desktop-beta'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `
                    <div class="dl-empty dl-error">
                        <p>⚠️ Nie udało się pobrać danych z GitHub. Spróbuj ponownie później.</p>
                    </div>`;
            }
        });
    }

    // Init tabs
    initTabs('desktop');

    // Password modal events
    const confirmBtn = document.getElementById('password-confirm');
    const cancelBtn = document.getElementById('password-cancel');
    const overlay = document.getElementById('password-modal');
    const passwordInput = document.getElementById('password-input');

    if (confirmBtn) confirmBtn.addEventListener('click', handlePasswordSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', hidePasswordModal);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) hidePasswordModal();
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePasswordSubmit();
        });
    }
}

document.addEventListener('DOMContentLoaded', initDownloadPage);
