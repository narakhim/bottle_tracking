const STORAGE_KEY = "gasflaschen-tracker-data";
const STATIONS = ["Nord", "Süd", "West", "Ost"];
const STATION_COLORS = { Nord: "mint", Süd: "coral", West: "blue", Ost: "yellow" };
const initialData = {
    rooms: [{ id: "room-101", name: "Room 101", stationId: "Nord", color: "mint" }, { id: "room-102", name: "Room 102", stationId: "Süd", color: "coral" }],
    bottles: [
        { id: "bottle-01", code: "Flasche-01", status: "active", currentRoomId: "room-102", history: [{ fromRoomId: null, toRoomId: "room-102", action: "assigned", movedAt: "2026-08-26T09:30:00.000Z" }] },
        { id: "bottle-02", code: "Flasche-02", status: "active", currentRoomId: null, history: [{ fromRoomId: null, toRoomId: null, action: "assigned", movedAt: "2026-08-26T09:35:00.000Z" }] }
    ]
};

let state = loadState();
let scannerStream;
let scannerFrame;
let scannerReader;
let scannerControls;
let scannerTarget;
const roomGrid = document.querySelector("#room-grid");
const emptyState = document.querySelector("#empty-state");
const totalCount = document.querySelector("#total-count");
const searchInput = document.querySelector("#search-input");
const toast = document.querySelector("#toast");
const filterPanel = document.querySelector("#filter-panel");
const stationFilter = document.querySelector("#station-filter");
const roomFilter = document.querySelector("#room-filter");
const filterCount = document.querySelector("#filter-count");
const roomStation = document.querySelector("#room-station");
const scannerDialog = document.querySelector("#scanner-dialog");
const cameraPreview = document.querySelector("#camera-preview");
const scannerMessage = document.querySelector("#scanner-message");
const bulkRoomSelect = document.querySelector("#bulk-room-select");
const bulkBottleInput = document.querySelector("#bulk-bottle-input");
const bulkAssignStatus = document.querySelector("#bulk-assign-status");

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && Array.isArray(saved.rooms) && Array.isArray(saved.bottles)) return normalizeState(saved);
        if (saved && Array.isArray(saved.rooms) && Array.isArray(saved.unassigned)) return migrateLegacyState(saved);
    } catch (error) {
        // Ungueltige lokale Daten werden durch die Demo ersetzt.
    }
    return structuredClone(initialData);
}

function normalizeState(saved) {
    return {
        rooms: saved.rooms.map((room, index) => ({ id: room.id || `room-${index + 1}`, name: room.name, stationId: room.stationId || STATIONS[index % STATIONS.length], color: stationColor(room.stationId || STATIONS[index % STATIONS.length]) })),
        bottles: saved.bottles.map((bottle, index) => ({
            id: bottle.id || `bottle-${index + 1}`, code: bottle.code || bottle.nummer,
                status: ["active", "empty", "missing", "deactivated"].includes(bottle.status) ? bottle.status : (bottle.currentRoomId ? "active" : "missing"), note: typeof bottle.note === "string" ? bottle.note : "", currentRoomId: bottle.currentRoomId || null,
            history: Array.isArray(bottle.history) ? bottle.history.map(entry => ({ fromRoomId: entry.fromRoomId ?? null, toRoomId: entry.toRoomId ?? entry.roomId ?? null, action: entry.action || "moved", movedAt: entry.movedAt })) : []
        }))
    };
}

function migrateLegacyState(saved) {
    const rooms = saved.rooms.map((room, index) => ({ id: `room-${index + 1}`, name: room.name, stationId: STATIONS[index % STATIONS.length], color: stationColor(STATIONS[index % STATIONS.length]) }));
    const bottles = [];
    saved.unassigned.forEach((code, index) => bottles.push(createBottle(code, null, index)));
    saved.rooms.forEach((room, roomIndex) => room.bottles.forEach((code, bottleIndex) => bottles.push(createBottle(code, rooms[roomIndex].id, bottleIndex))));
    return { rooms, bottles };
}

function createBottle(code, currentRoomId, index = 0, status = "active") {
    return { id: `bottle-${Date.now()}-${index}`, code, status, note: "", currentRoomId, history: [{ fromRoomId: null, toRoomId: currentRoomId, action: status === "missing" ? "missing" : "assigned", movedAt: new Date().toISOString() }] };
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function roomById(id) { return state.rooms.find(room => room.id === id); }
function formatDate(timestamp) { return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp)); }
function statusLabel(status) { return { active: "Aktiv", empty: "Leer", missing: "Missing", deactivated: "Deaktiviert" }[status]; }
function stationColor(stationId) { return STATION_COLORS[stationId] || "mint"; }
function roomHistory(roomId) { return state.bottles.filter(bottle => bottle.history.some(entry => entry.fromRoomId === roomId || entry.toRoomId === roomId)); }
function selectedFilterValues(name) { return new Set([...filterPanel.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value)); }
function matchesBottleQuery(bottle, query) {
    if (!query) return true;
    const currentRoom = roomById(bottle.currentRoomId);
    return bottle.code.toLowerCase().includes(query) || (!currentRoom && "lager".includes(query)) || currentRoom?.name.toLowerCase().includes(query) || currentRoom?.stationId.toLowerCase().includes(query) || bottle.history.some(entry => {
        const fromRoom = roomById(entry.fromRoomId);
        const toRoom = roomById(entry.toRoomId);
        return fromRoom?.name.toLowerCase().includes(query) || toRoom?.name.toLowerCase().includes(query);
    });
}

function render() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatuses = selectedFilterValues("status-filter");
    const selectedStations = selectedFilterValues("station-filter");
    const selectedRooms = new Set([...selectedFilterValues("room-filter")].filter(roomId => roomId === "__storage" || state.rooms.some(room => room.id === roomId)));
    const selectedStation = roomStation.value;
    roomStation.innerHTML = STATIONS.map(station => `<option value="${escapeAttribute(station)}">${escapeHtml(station)}</option>`).join("");
    roomStation.value = STATIONS.includes(selectedStation) ? selectedStation : STATIONS[0];
    stationFilter.innerHTML = STATIONS.map(station => `<label><input name="station-filter" type="checkbox" value="${escapeAttribute(station)}"${selectedStations.has(station) ? " checked" : ""}> ${escapeHtml(station)}</label>`).join("");
    roomFilter.innerHTML = `<label><input name="room-filter" type="checkbox" value="__storage"${selectedRooms.has("__storage") ? " checked" : ""}> Lager</label>${state.rooms.map(room => `<label><input name="room-filter" type="checkbox" value="${escapeAttribute(room.id)}"${selectedRooms.has(room.id) ? " checked" : ""}> ${escapeHtml(room.name)}</label>`).join("")}`;
    filterCount.textContent = selectedStatuses.size + selectedStations.size + selectedRooms.size;
    const visibleBottles = state.bottles.filter(bottle => matchesBottleQuery(bottle, query));
    const visibleRooms = state.rooms.filter(room => (!selectedStations.size || selectedStations.has(room.stationId)) && (!selectedRooms.size || selectedRooms.has(room.id)) && (!query || room.name.toLowerCase().includes(query) || visibleBottles.some(bottle => bottle.currentRoomId === room.id))).sort((firstRoom, secondRoom) => {
        const stationOrder = STATIONS.indexOf(firstRoom.stationId) - STATIONS.indexOf(secondRoom.stationId);
        return stationOrder || firstRoom.name.localeCompare(secondRoom.name, "de");
    });
    const filteredBottles = visibleBottles.filter(bottle => (!selectedStatuses.size || selectedStatuses.has(bottle.status)) && (!selectedStations.size || selectedStations.has(roomById(bottle.currentRoomId)?.stationId)) && (!selectedRooms.size || (bottle.currentRoomId === null ? selectedRooms.has("__storage") : selectedRooms.has(bottle.currentRoomId))));
    totalCount.textContent = state.bottles.length;
    const selectedRoom = bulkRoomSelect.value;
    bulkRoomSelect.innerHTML = `<option value="">Zielraum auswählen...</option>${state.rooms.map(room => `<option value="${escapeAttribute(room.id)}">${escapeHtml(room.name)}</option>`).join("")}`;
    bulkRoomSelect.value = state.rooms.some(room => room.id === selectedRoom) ? selectedRoom : "";
    bulkAssignStatus.textContent = bulkRoomSelect.value ? `Bereit für Flaschen in ${roomById(bulkRoomSelect.value).name}.` : "Zuerst einen Zielraum auswählen.";
    bulkAssignStatus.classList.toggle("ready", Boolean(bulkRoomSelect.value));
    const cards = [];
    const unassigned = filteredBottles.filter(bottle => bottle.currentRoomId === null);
    if (unassigned.length && !selectedStations.size && (!selectedRooms.size || selectedRooms.has("__storage"))) cards.push(roomCard({ id: "__storage", name: "Lager" }, unassigned, 0, true));
    visibleRooms.forEach((room, index) => cards.push(roomCard(room, filteredBottles.filter(bottle => bottle.currentRoomId === room.id), index + 1)));
    roomGrid.innerHTML = cards.join("");
    emptyState.hidden = cards.length > 0;
    emptyState.querySelector("h3").textContent = query && !cards.length ? "Nichts gefunden" : "Noch kein Bestand";
    emptyState.querySelector("p").textContent = query && !cards.length ? "Passe deinen Suchbegriff an." : "Lege links einen Raum oder eine Flasche an.";
}

function roomCard(room, bottles, index, unassigned = false) {
    const bottleMarkup = bottles.length ? `<ul class="bottle-list">${bottles.map(bottle => bottleRow(bottle, room.id)).join("")}</ul>` : `<p class="empty-bottle">Keine Flaschen zugewiesen</p>`;
    const history = unassigned ? "" : `<details class="room-history"><summary>Raumhistorie</summary><ol>${roomHistory(room.id).flatMap(bottle => bottle.history.filter(entry => entry.fromRoomId === room.id || entry.toRoomId === room.id).map(entry => `<li><strong>${escapeHtml(bottle.code)}</strong><span>${entry.fromRoomId === room.id ? "ausgehend" : "eingegangen"} · ${formatDate(entry.movedAt)}</span></li>`)).join("") || "<li>Keine Bewegungen erfasst.</li>"}</ol></details>`;
    return `<article class="room-card room-${escapeAttribute(room.color || "mint")} ${unassigned ? "unassigned-card" : ""}" style="animation-delay:${index * 60}ms"><header><div><h3>${escapeHtml(room.name)}</h3>${unassigned ? "" : `<span class="station-label">Station ${escapeHtml(room.stationId)}</span>`}</div><span class="room-count">${bottles.length.toString().padStart(2, "0")} FL</span></header>${bottleMarkup}${history}</article>`;
}

function bottleRow(bottle, fromRoomId) {
    const targetRooms = state.rooms.filter(room => room.id !== fromRoomId);
    const options = targetRooms.map(room => `<option value="${escapeAttribute(room.id)}">${escapeHtml(room.name)}</option>`).join("");
    const historyMarkup = bottle.history.slice().reverse().map(entry => `<li><strong>${escapeHtml(entry.toRoomId ? roomById(entry.toRoomId)?.name || "Unbekannter Raum" : "Lager")}</strong><time>${formatDate(entry.movedAt)}</time></li>`).join("");
    const noteMarkup = bottle.note ? `<p class="bottle-note"><strong>Info:</strong> ${escapeHtml(bottle.note)}</p>` : "";
    const selectMarkup = options ? `<select class="move-select" data-bottle-id="${escapeAttribute(bottle.id)}" aria-label="${escapeAttribute(bottle.code)} verschieben"><option value="">Verschieben nach...</option>${options}</select>` : "";
    const nextStatus = bottle.status === "deactivated" ? "active" : "deactivated";
    const nextStatusText = bottle.status === "deactivated" ? "Reaktivieren" : "Deaktivieren";
    return `<li class="bottle-row"><details class="bottle-details"><summary><span class="bottle-line"><span class="bottle ${bottle.status}">${escapeHtml(bottle.code)}</span><span class="status-chip ${bottle.status}">${statusLabel(bottle.status)}</span></span></summary><div class="bottle-controls">${noteMarkup}${selectMarkup}<button class="small-button" type="button" data-status-id="${escapeAttribute(bottle.id)}" data-status="${bottle.status === "empty" ? "active" : "empty"}">${bottle.status === "empty" ? "Als voll markieren" : "Als leer markieren"}</button><button class="small-button" type="button" data-status-id="${escapeAttribute(bottle.id)}" data-status="missing">Als vermisst markieren</button><button class="small-button" type="button" data-status-id="${escapeAttribute(bottle.id)}" data-status="${nextStatus}">${nextStatusText}</button><details class="history"><summary>Flaschenhistorie (${bottle.history.length})</summary><ol>${historyMarkup}</ol></details></div></details></li>`;
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
function escapeAttribute(value) { return escapeHtml(value); }

function addRoom(event) {
    event.preventDefault();
    const input = document.querySelector("#room-name");
    const name = input.value.trim();
    if (!name) return;
    if (state.rooms.some(room => room.name.toLowerCase() === name.toLowerCase())) return showToast("Dieser Raum existiert bereits.");
    state.rooms.push({ id: `room-${Date.now()}`, name, stationId: roomStation.value, color: stationColor(roomStation.value) }); input.value = ""; saveState(); render(); showToast(`Raum "${name}" angelegt.`);
}

function moveBottle(event) {
    if (!event.target.matches(".move-select") || !event.target.value) return;
    const bottle = state.bottles.find(item => item.id === event.target.dataset.bottleId);
    const room = roomById(event.target.value);
    if (!bottle || !room) return;
        const previousRoomId = bottle.currentRoomId;
        bottle.currentRoomId = room.id; bottle.status = bottle.status === "missing" ? "active" : bottle.status;
        if (previousRoomId !== room.id) bottle.history.push({ fromRoomId: previousRoomId, toRoomId: room.id, action: previousRoomId ? "moved" : "assigned", movedAt: new Date().toISOString() });
    saveState(); render(); showToast(`${bottle.code} nach ${room.name} verschoben.`);
}

function assignBulkBottle(note = "") {
    note = typeof note === "string" ? note.trim() : "";
    const room = roomById(bulkRoomSelect.value);
    const code = bulkBottleInput.value.trim();
    if (!room) return showToast("Bitte zuerst einen Zielraum auswählen.");
    if (!code) return;
    let bottle = state.bottles.find(item => item.code.toLowerCase() === code.toLowerCase());
    if (!bottle) {
        bottle = createBottle(code, room.id);
        bottle.note = note;
        state.bottles.push(bottle);
        showToast(`${code} registriert und ${room.name} zugeordnet.`);
    } else if (bottle.currentRoomId === room.id) {
        if (note) bottle.note = note;
        showToast(`${code} befindet sich bereits in ${room.name}.`);
    } else {
            const previousRoomId = bottle.currentRoomId;
            bottle.currentRoomId = room.id;
            bottle.status = bottle.status === "missing" ? "active" : bottle.status;
            if (previousRoomId !== room.id) bottle.history.push({ fromRoomId: previousRoomId, toRoomId: room.id, action: previousRoomId ? "moved" : "assigned", movedAt: new Date().toISOString() });
        showToast(`${code} nach ${room.name} verschoben.`);
    }
    bulkBottleInput.value = "";
    saveState(); render(); bulkBottleInput.focus();
}

function updateStatus(event) {
    if (!event.target.matches("[data-status-id]")) return;
    const bottle = state.bottles.find(item => item.id === event.target.dataset.statusId);
    if (!bottle) return;
    bottle.status = event.target.dataset.status; saveState(); render(); showToast(`${bottle.code}: ${statusLabel(bottle.status)}.`);
}

function csvCell(value) { return `"${String(value).replace(/"/g, '""')}"`; }
function exportCsv() {
    const rows = [["Flaschennummer", "Station", "Raum", "Raumfarbe", "Status", "Letzte Änderung", "Historie"]];
    state.bottles.forEach(bottle => {
        const room = roomById(bottle.currentRoomId);
        rows.push([bottle.code, room?.stationId || "", room?.name || "Lager", room?.color || "", statusLabel(bottle.status), bottle.history.length ? formatDate(bottle.history[bottle.history.length - 1].movedAt) : "", bottle.history.map(entry => `${entry.fromRoomId ? roomById(entry.fromRoomId)?.name || "Unbekannter Raum" : "Lager"} → ${entry.toRoomId ? roomById(entry.toRoomId)?.name || "Unbekannter Raum" : "Lager"} (${formatDate(entry.movedAt)})`).join(" | ")]);
    });
    const csv = rows.map(row => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `gasflaschen-bestand-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    showToast(`${rows.length - 1} Flaschen als CSV exportiert.`);
}

async function openScanner(target) {
    scannerTarget = target;
    document.querySelector("#scanner-title").textContent = target === "search-input" ? "Flasche oder Raum suchen" : `${target === "room-name" ? "Raum" : "Flasche"} scannen`;
    scannerMessage.textContent = "Kamera wird vorbereitet..."; document.querySelector("#scanner-input").value = ""; document.querySelector("#scan-note-enabled").checked = false; document.querySelector("#scan-note").value = ""; document.querySelector("#scan-note").hidden = true; scannerDialog.showModal();
    if (!navigator.mediaDevices?.getUserMedia) return scannerMessage.textContent = "Kamera nicht verfügbar. Nutze die manuelle Eingabe.";
    try {
        if ("BarcodeDetector" in window) {
            scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }); cameraPreview.srcObject = scannerStream;
            const detector = new BarcodeDetector({ formats: ["aztec", "code_128", "code_39", "code_93", "codabar", "data_matrix", "ean_13", "ean_8", "itf", "pdf417", "qr_code", "upc_a", "upc_e"] }); scannerMessage.textContent = "Code in den Rahmen halten..."; scannerFrame = requestAnimationFrame(() => detectBarcode(detector));
        } else if (window.ZXingBrowser?.BrowserMultiFormatReader) {
            scannerMessage.textContent = "Code in den Rahmen halten...";
            scannerReader = new ZXingBrowser.BrowserMultiFormatReader();
            scannerControls = await scannerReader.decodeFromConstraints({ video: { facingMode: { ideal: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } }, audio: false }, cameraPreview, (result, error) => {
                if (result) useScannerValue(result.getText());
                if (error && error.name !== "NotFoundException") scannerMessage.textContent = "Code wird gesucht... Halte ihn ruhig und gut beleuchtet in den Rahmen.";
            });
        } else scannerMessage.textContent = "Barcode-Scanner konnte nicht geladen werden. Nutze die manuelle Eingabe.";
    } catch (error) { scannerMessage.textContent = "Kamerazugriff nicht möglich. Erlaube die Kamera oder nutze die manuelle Eingabe."; }
}

async function detectBarcode(detector) {
    if (!scannerDialog.open || !cameraPreview.srcObject) return;
    try { const codes = await detector.detect(cameraPreview); if (codes.length) return useScannerValue(codes[0].rawValue); } catch (error) { scannerMessage.textContent = "Code konnte nicht gelesen werden. Halte ihn ruhig in den Rahmen."; }
    scannerFrame = requestAnimationFrame(() => detectBarcode(detector));
}

function useScannerValue(value) {
    if (!value) return;
    if (scannerTarget === "bulk-room-input") {
        const room = state.rooms.find(item => item.id === value || item.name.toLowerCase() === value.toLowerCase());
        closeScanner();
        if (!room) return showToast(`Kein Raum mit dem Code "${value}" gefunden.`);
        bulkRoomSelect.value = room.id; render(); showToast(`Zielraum "${room.name}" ausgewählt.`); return;
    }
    const note = document.querySelector("#scan-note-enabled").checked ? document.querySelector("#scan-note").value.trim() : "";
    document.querySelector(`#${scannerTarget}`).value = value; closeScanner(); showToast(`Code "${value}" übernommen.`);
    if (scannerTarget === "search-input") render();
    if (scannerTarget === "bulk-bottle-input") { assignBulkBottle(note); }
}
function closeScanner() { if (scannerFrame) cancelAnimationFrame(scannerFrame); scannerControls?.stop(); scannerControls = null; scannerReader = null; scannerStream?.getTracks().forEach(track => track.stop()); scannerStream = null; cameraPreview.srcObject = null; if (scannerDialog.open) scannerDialog.close(); }

document.querySelector("#room-form").addEventListener("submit", addRoom);
document.querySelector("#export-button").addEventListener("click", exportCsv);
document.querySelector("#reset-button").addEventListener("click", () => { state = structuredClone(initialData); saveState(); render(); showToast("Demo-Daten wurden zurückgesetzt."); });
roomGrid.addEventListener("change", moveBottle); roomGrid.addEventListener("click", updateStatus); searchInput.addEventListener("input", render);
filterPanel.addEventListener("change", event => { if (event.target.matches('input[type="checkbox"]')) render(); });
bulkRoomSelect.addEventListener("change", render);
document.querySelector("#bulk-assign-button").addEventListener("click", assignBulkBottle);
bulkBottleInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); assignBulkBottle(); } });
document.querySelectorAll("[data-scan-target]").forEach(button => button.addEventListener("click", () => openScanner(button.dataset.scanTarget)));
document.querySelector("#scan-search-button").addEventListener("click", () => openScanner("search-input"));
document.querySelector("#close-scanner").addEventListener("click", closeScanner);
document.querySelector("#use-scanner-input").addEventListener("click", () => useScannerValue(document.querySelector("#scanner-input").value.trim()));
document.querySelector("#scan-note-enabled").addEventListener("change", event => { document.querySelector("#scan-note").hidden = !event.target.checked; });
scannerDialog.addEventListener("cancel", closeScanner);
render();
