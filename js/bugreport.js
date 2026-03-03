/**
 * Samplix Bug Tracker – Form handler + GitHub version fetcher
 *
 * CONFIGURATION:
 * Set GOOGLE_SCRIPT_URL to your deployed Google Apps Script web app URL.
 * Set it to null to disable form submission (for testing).
 */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxaMsNXM8bWj6AvuapV8AO-Ea1G0AFd85HWhKln2tZQAZupQRFTlPhXnun6ns8JPhr7/exec';
const BUG_GITHUB_REPO = 'samplixpoweredbynox/SAMPLIX-TOOLS';
const BUG_API_URL = `https://api.github.com/repos/${BUG_GITHUB_REPO}/releases`;

// ─── Fetch versions from GitHub ─────────────────────────

async function loadVersions() {
    const select = document.getElementById('bug-version');
    if (!select) return;

    try {
        const response = await fetch(BUG_API_URL);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const releases = await response.json();

        select.innerHTML = '<option value="" disabled selected>Wybierz wersję...</option>';

        if (releases.length === 0) {
            select.innerHTML += '<option value="unknown">Brak wydań</option>';
            return;
        }

        releases.forEach(release => {
            const tag = release.tag_name;
            const label = release.prerelease ? `${tag} (Beta)` : tag;
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = label;
            select.appendChild(option);
        });

    } catch (err) {
        console.error('Failed to fetch versions:', err);
        select.innerHTML = '<option value="" disabled selected>Błąd ładowania</option>';
        select.innerHTML += '<option value="unknown">Nie mogę pobrać wersji</option>';
    }
}

// ─── Form submission ────────────────────────────────────

function initBugForm() {
    const form = document.getElementById('bug-form');
    const submitBtn = document.getElementById('bug-submit');
    const statusEl = document.getElementById('form-status');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect data
        const data = {
            nick: form.nick.value.trim(),
            email: form.email.value.trim(),
            version: form.version.value,
            tag: form.tag.value,
            description: form.description.value.trim(),
            media: form.media.value.trim(),
            timestamp: new Date().toISOString()
        };

        // Validate
        if (!data.nick || !data.version || !data.tag || !data.description) {
            showStatus('error', '❌ Wypełnij wszystkie wymagane pola.');
            return;
        }

        // Check if script URL is configured
        if (!GOOGLE_SCRIPT_URL) {
            showStatus('error', '⚠️ Backend nie jest jeszcze skonfigurowany (GOOGLE_SCRIPT_URL).');
            console.log('Form data that would be sent:', data);
            return;
        }

        // Submit
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Wysyłanie...';

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            // no-cors means we can't read the response, but if no error was thrown, it likely succeeded
            showStatus('success', '✅ Zgłoszono błąd');
            form.reset();

            // Re-load versions to reset the select
            loadVersions();

        } catch (err) {
            console.error('Submission error:', err);
            showStatus('error', '❌ Wystąpił błąd. Spróbuj ponownie później.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Wyślij zgłoszenie';
        }
    });
}

function showStatus(type, message) {
    const statusEl = document.getElementById('form-status');
    if (!statusEl) return;

    statusEl.className = `form-status ${type}`;
    statusEl.textContent = message;

    // Auto-hide after 6s
    setTimeout(() => {
        statusEl.className = 'form-status';
        statusEl.textContent = '';
    }, 6000);
}

// ─── Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadVersions();
    initBugForm();
});
