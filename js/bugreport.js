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

// ─── Translations Helper ──────────────────────────────────

function getI18n(key, fallback = '') {
    const lang = localStorage.getItem('samplix_lang') || 'en';
    return (translations[lang] && translations[lang][key]) ? translations[lang][key] : (fallback || key);
}

// ─── Fetch versions from GitHub ─────────────────────────

async function loadVersions() {
    const select = document.getElementById('bug-version');
    if (!select) return;

    try {
        const response = await fetch(BUG_API_URL);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const releases = await response.json();

        select.innerHTML = `<option value="" disabled selected>${getI18n('bug.version_select', 'Select version...')}</option>`;

        if (releases.length === 0) {
            select.innerHTML += `<option value="unknown">${getI18n('bug.version_none', 'No releases')}</option>`;
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
        select.innerHTML = `<option value="" disabled selected>${getI18n('bug.version_error', 'Loading error')}</option>`;
        select.innerHTML += `<option value="unknown">${getI18n('bug.version_none', 'No releases')}</option>`;
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
            showStatus('error', getI18n('bug.error_required', '❌ Please fill in all required fields.'));
            return;
        }

        // Check if script URL is configured
        if (!GOOGLE_SCRIPT_URL) {
            showStatus('error', getI18n('bug.error_backend', '⚠️ Backend not configured.'));
            console.log('Form data that would be sent:', data);
            return;
        }

        // Submit
        submitBtn.disabled = true;
        submitBtn.textContent = getI18n('bug.sending', '⏳ Sending...');

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            // no-cors means we can't read the response, but if no error was thrown, it likely succeeded
            showStatus('success', getI18n('bug.success', '✅ Bug reported successfully'));
            form.reset();

            // Re-load versions to reset the select
            loadVersions();

        } catch (err) {
            console.error('Submission error:', err);
            showStatus('error', getI18n('bug.error_generic', '❌ An error occurred.'));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = getI18n('bug.submit', '🚀 Send Report');
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
