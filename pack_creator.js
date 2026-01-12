
document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentState = {
        packInfo: { name: "", author: "", description: "" },
        samples: {} // relative_path -> { role, key, bpm, map_pos }
    };
    // Separate storage for File objects (not included in JSON export)
    let fileStorage = {}; // relative_path -> File object
    let packRootName = "";
    let audioContext = null;

    // Elements
    const dropZone = id('dropZone');
    const folderInput = id('folderInput');
    const editorPanel = id('editorPanel');
    const loadingSpinner = id('loadingSpinner');

    const inputName = id('packName');
    const inputAuthor = id('packAuthor');
    const inputDesc = id('packDesc');
    const packNameDisplay = id('packNameDisplay');

    const tableBody = id('samplesTable').querySelector('tbody');
    const btnExport = id('btnExport');
    const btnNew = id('btnNew');

    // Canvas
    const canvas = id('mapCanvas');
    const ctx = canvas.getContext('2d');
    let mapPoints = []; // Cache for rendering {x, y, color, path}

    // Constants
    const ROLES = ["kick", "snare", "hats", "fx", "clap", "perc", "vocal", "loop", "synth", "other"];
    const KEYS = ["---", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const COLORS = {
        kick: "#FF5733", snare: "#33FF57", hats: "#3357FF",
        fx: "#FF33F6", clap: "#F6FF33", perc: "#33FFF6",
        vocal: "#FF8C33", loop: "#8C33FF", synth: "#FF338C",
        other: "#AAAAAA"
    };

    // --- Events ---

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleDrop(e.dataTransfer.items);
    });

    folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Inputs
    inputName.addEventListener('input', (e) => {
        currentState.packInfo.name = e.target.value;
        packNameDisplay.textContent = e.target.value || packRootName;
    });
    inputAuthor.addEventListener('input', (e) => currentState.packInfo.author = e.target.value);
    inputDesc.addEventListener('input', (e) => currentState.packInfo.description = e.target.value);

    // Export
    btnExport.addEventListener('click', () => {
        const jsonStr = JSON.stringify({
            version: "1.0",
            pack_info: currentState.packInfo,
            samples: currentState.samples
        }, null, 4);

        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "samplix_pack.json";
        a.click();
        URL.revokeObjectURL(url);
    });

    // Reset
    btnNew.addEventListener('click', () => {
        location.reload();
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            const content = id(tabId);
            content.style.display = (tabId === 'tableView') ? 'flex' : 'block';

            if (tabId === 'mapView') {
                resizeCanvas();
                drawMap();
            }
        });
    });

    // Map Click (Playback)
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find nearest point
        let nearest = null;
        let minDist = 1000;

        mapPoints.forEach(p => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            const dx = x - px;
            const dy = y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 10 && dist < minDist) { // 10px tolerance
                minDist = dist;
                nearest = p;
            }
        });

        if (nearest) {
            playSample(nearest.path);
        }
    });

    // --- Logic ---

    async function handleDrop(items) {
        if (!items) return;

        setLoading(true);

        // This is a simplified folder scan for web
        // Real folder structure reading in browser is tricky without File System Access API or webkitGetAsEntry
        // We will assume a flat list of files or use webkitGetAsEntry if available.

        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.webkitGetAsEntry) {
                const entry = item.webkitGetAsEntry();
                if (entry) entries.push(entry);
            }
        }

        if (entries.length > 0) {
            const files = await scanEntries(entries);
            await processFiles(files);
        }

        setLoading(false);
    }

    function handleFiles(fileList) {
        setLoading(true);
        // Convert FileList to Array
        const files = Array.from(fileList);
        processFiles(files).then(() => setLoading(false));
    }

    async function scanEntries(entries) {
        let files = [];
        for (const entry of entries) {
            if (entry.isFile) {
                files.push(await getFile(entry));
            } else if (entry.isDirectory) {
                files = files.concat(await readDirectory(entry));
            }
        }
        return files;
    }

    function readDirectory(dirEntry) {
        return new Promise(resolve => {
            const reader = dirEntry.createReader();
            const files = [];

            function readEntries() {
                reader.readEntries(async (entries) => {
                    if (entries.length === 0) {
                        resolve(files);
                    } else {
                        for (const entry of entries) {
                            if (entry.isFile) {
                                files.push(await getFile(entry));
                            } else if (entry.isDirectory) {
                                files.push(...await readDirectory(entry));
                            }
                        }
                        readEntries(); // Continue reading
                    }
                });
            }
            readEntries();
        });
    }

    function getFile(fileEntry) {
        return new Promise(resolve => fileEntry.file(resolve));
    }

    async function processFiles(files) {
        // Filter audio files & json
        const audioFiles = files.filter(f => /\.(wav|mp3|ogg|flac|aif|aiff)$/i.test(f.name));
        const jsonFile = files.find(f => f.name === 'samplix_pack.json');

        if (audioFiles.length === 0 && !jsonFile) {
            alert("No audio files found!");
            return;
        }

        // Determine Root Name (Pack Name) from first file path or folder name
        if (files.length > 0) {
            // webkitRelativePath is e.g. "MyPack/kick.wav"
            const parts = files[0].webkitRelativePath.split('/');
            packRootName = parts[0] || "My Pack";
        }

        // Apply Defaults
        currentState.packInfo.name = packRootName;
        inputName.value = packRootName;
        packNameDisplay.textContent = packRootName;

        // If JSON exists, parse it
        if (jsonFile) {
            try {
                const text = await jsonFile.text();
                const json = JSON.parse(text);
                if (json.pack_info) {
                    currentState.packInfo = { ...currentState.packInfo, ...json.pack_info };
                    inputName.value = currentState.packInfo.name;
                    inputAuthor.value = currentState.packInfo.author || "";
                    inputDesc.value = currentState.packInfo.description || "";
                    packNameDisplay.textContent = currentState.packInfo.name;
                }
                if (json.samples) {
                    currentState.samples = json.samples;
                }
            } catch (e) {
                console.error("Error parsing JSON", e);
            }
        }

        // Add Audio Files to State (Merging)
        audioFiles.forEach(f => {
            // We use webkitRelativePath usually. If dropped as loose files, might be empty, so use name.
            let relPath = f.webkitRelativePath || f.name;
            // Remove root folder if present to keep paths cleaner relative to pack root
            if (relPath.startsWith(packRootName + "/")) {
                relPath = relPath.substring(packRootName.length + 1);
            }

            // Store the file blob for playback
            fileStorage[relPath] = f;

            if (!currentState.samples[relPath]) {
                // Auto-classify
                let role = "other";
                const lowName = relPath.toLowerCase();
                for (const r of ROLES) {
                    if (lowName.includes(r)) {
                        role = r;
                        break;
                    }
                }

                // Random position for map connection
                currentState.samples[relPath] = {
                    role: role,
                    key: "---",
                    bpm: "---",
                    map_pos: {
                        x: Math.random() * 0.8 + 0.1,
                        y: Math.random() * 0.8 + 0.1
                    }
                };
            }
        });

        renderTable();

        // Switch view
        dropZone.style.display = 'none';
        editorPanel.style.display = 'flex';
        // Force list view default
        document.querySelector('[data-tab="tableView"]').click();
    }

    function renderTable() {
        tableBody.innerHTML = "";

        Object.keys(currentState.samples).sort().forEach(path => {
            const info = currentState.samples[path];
            const tr = document.createElement('tr');

            // Play Button
            const tdPlay = document.createElement('td');
            const btnPlay = document.createElement('button');
            btnPlay.textContent = "▶";
            btnPlay.className = "btn secondary small"; // styles might need adjustment
            btnPlay.style.padding = "4px 8px";
            btnPlay.style.minWidth = "30px";
            btnPlay.title = "Play";
            btnPlay.onclick = () => playSample(path);
            tdPlay.appendChild(btnPlay);
            tr.appendChild(tdPlay);

            // Name
            const tdName = document.createElement('td');
            tdName.textContent = path;
            tr.appendChild(tdName);

            // Role
            const tdRole = document.createElement('td');
            const selRole = document.createElement('select');
            ROLES.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                if (r === info.role) opt.selected = true;
                selRole.appendChild(opt);
            });
            selRole.addEventListener('change', (e) => {
                info.role = e.target.value;
                mapPoints = []; // Invalidate map cache
            });
            tdRole.appendChild(selRole);
            tr.appendChild(tdRole);

            // Key
            const tdKey = document.createElement('td');
            const selKey = document.createElement('select');
            KEYS.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k;
                if (k === info.key) opt.selected = true;
                selKey.appendChild(opt);
            });
            selKey.addEventListener('change', (e) => info.key = e.target.value);
            tdKey.appendChild(selKey);
            tr.appendChild(tdKey);

            // BPM
            const tdBpm = document.createElement('td');
            const inpBpm = document.createElement('input');
            inpBpm.type = 'text';
            inpBpm.value = info.bpm || "---";
            inpBpm.style.width = "60px";
            inpBpm.style.background = "var(--input-bg)";
            inpBpm.style.border = "1px solid var(--border-color)";
            inpBpm.style.color = "var(--text-primary)";
            inpBpm.addEventListener('change', (e) => info.bpm = e.target.value);
            tdBpm.appendChild(inpBpm);
            tr.appendChild(tdBpm);

            tableBody.appendChild(tr);
        });
    }

    async function playSample(path) {
        const file = fileStorage[path];
        if (!file) {
            console.warn("File not found in storage for path:", path);
            return;
        }

        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') await audioContext.resume();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (e) {
            console.error("Playback failed", e);
        }
    }

    // --- Map Logic ---
    function resizeCanvas() {
        const container = id('mapContainer');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    function drawMap() {
        // Clear
        ctx.fillStyle = "#161616";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (mapPoints.length === 0) {
            // Rebuild points cache
            Object.keys(currentState.samples).forEach(path => {
                const info = currentState.samples[path];
                if (info.map_pos && info.map_pos.x !== undefined) {
                    mapPoints.push({
                        path: path,
                        role: info.role,
                        x: info.map_pos.x, // Normalized 0-1
                        y: info.map_pos.y,
                        color: COLORS[info.role] || "#fff"
                    });
                }
            });
        }

        // Draw Grid
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw Points
        mapPoints.forEach(p => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
    }

    function id(x) { return document.getElementById(x); }
    function setLoading(bool) {
        loadingSpinner.style.display = bool ? 'block' : 'none';
        dropZone.style.opacity = bool ? '0.5' : '1';
    }
});
