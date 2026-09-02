const rooms = [
  { id: 'lager', name: 'Lager' },
  { id: 'ausgabe', name: 'Ausgabe' },
  { id: 'transport', name: 'Transport' }
];

const state = {
  bottles: [
    { id: 'F-101', room: 'Lager', status: 'voll', updatedAt: '2026-09-02T08:00:00' },
    { id: 'F-204', room: 'Ausgabe', status: 'reserviert', updatedAt: '2026-09-02T09:00:00' },
    { id: 'F-307', room: 'Transport', status: 'leer', updatedAt: '2026-09-02T10:15:00' }
  ],
  history: [
    { message: 'F-101 wurde in Lager eingefügt.', at: '2026-09-02T08:00:00' },
    { message: 'F-204 wurde nach Ausgabe verschoben.', at: '2026-09-02T09:00:00' },
    { message: 'F-307 wurde als leer markiert.', at: '2026-09-02T10:15:00' }
  ]
};

const inventoryTableBody = document.getElementById('inventoryTableBody');
const historyList = document.getElementById('historyList');
const bottleForm = document.getElementById('bottleForm');
const bottleNumberInput = document.getElementById('bottleNumber');
const roomSelect = document.getElementById('roomSelect');
const statusSelect = document.getElementById('statusSelect');
const filterRoomSelect = document.getElementById('filterRoomSelect');
const filterStatusSelect = document.getElementById('filterStatusSelect');
const exportCsvBtn = document.getElementById('exportCsvBtn');

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function populateSelects() {
  roomSelect.innerHTML = rooms
    .map((room) => `<option value="${room.name}">${room.name}</option>`)
    .join('');

  filterRoomSelect.innerHTML = ['<option value="all">Alle</option>']
    .concat(rooms.map((room) => `<option value="${room.name}">${room.name}</option>`))
    .join('');
}

function getFilteredBottles() {
  const selectedRoom = filterRoomSelect.value;
  const selectedStatus = filterStatusSelect.value;

  return state.bottles.filter((bottle) => {
    const roomMatch = selectedRoom === 'all' || bottle.room === selectedRoom;
    const statusMatch = selectedStatus === 'all' || bottle.status === selectedStatus;
    return roomMatch && statusMatch;
  });
}

function renderInventory() {
  const filteredBottles = getFilteredBottles();

  inventoryTableBody.innerHTML = filteredBottles.map((bottle) => `
    <tr>
      <td>${bottle.id}</td>
      <td>${bottle.room}</td>
      <td><span class="status ${bottle.status}">${bottle.status}</span></td>
      <td>${formatDate(bottle.updatedAt)}</td>
      <td>
        <button class="action-btn" data-move="${bottle.id}">Verschieben</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const bottle = state.bottles.find((item) => item.id === button.dataset.move);
      if (!bottle) return;

      const nextRoom = rooms[(rooms.findIndex((room) => room.name === bottle.room) + 1) % rooms.length].name;
      bottle.room = nextRoom;
      bottle.updatedAt = new Date().toISOString();
      recordHistory(`${bottle.id} wurde nach ${nextRoom} verschoben.`);
      render();
    });
  });
}

function renderHistory() {
  historyList.innerHTML = state.history
    .slice()
    .reverse()
    .map((entry) => `<li><strong>${formatDate(entry.at)}</strong> — ${entry.message}</li>`)
    .join('');
}

function recordHistory(message) {
  state.history.push({
    message,
    at: new Date().toISOString()
  });
}

function render() {
  renderInventory();
  renderHistory();
}

function addBottle(event) {
  event.preventDefault();

  const id = bottleNumberInput.value.trim();
  const room = roomSelect.value;
  const status = statusSelect.value;

  if (!id) return;

  const alreadyExists = state.bottles.some((bottle) => bottle.id.toLowerCase() === id.toLowerCase());
  if (alreadyExists) {
    alert('Diese Flaschennummer existiert bereits.');
    return;
  }

  state.bottles.push({
    id,
    room,
    status,
    updatedAt: new Date().toISOString()
  });

  recordHistory(`${id} wurde in ${room} mit Status ${status} angelegt.`);
  bottleForm.reset();
  render();
}

function exportFilteredCsv() {
  const rows = getFilteredBottles();
  const header = ['Flasche', 'Raum', 'Status', 'Letzte Änderung'];
  const csvContent = [
    header.join(','),
    ...rows.map((row) => [row.id, row.room, row.status, row.updatedAt].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gasflaschen-filter.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

bottleForm.addEventListener('submit', addBottle);
filterRoomSelect.addEventListener('change', renderInventory);
filterStatusSelect.addEventListener('change', renderInventory);
exportCsvBtn.addEventListener('click', exportFilteredCsv);

populateSelects();
render();
