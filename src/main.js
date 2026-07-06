const START_MINUTES = 7 * 60;
const END_MINUTES = 17 * 60;
const SLOT_MINUTES = 5;
const PX_PER_MINUTE = 2;
const DEFAULT_TILE_DURATION = 30;
const MIN_TILE_DURATION = 10;
const MAX_TILE_DURATION = 60;

const categories = [
  { name: 'Health', color: '#2f80ed', activities: ['Walk', 'Swim', 'Stretch'] },
  { name: 'Lead Generation', color: '#e63946', activities: ['Circle Prospecting', 'Follow-up Calls'] },
  { name: 'Active Listings', color: '#2ea44f', activities: ['SkySlope', 'Photos', 'Flyers', 'MLS Upload', 'Client Update', 'Closing'] },
  { name: 'Listing Presentation', color: '#8b5cf6', activities: ['CMA', 'Listing Strategy', 'Listing Paperwork', 'Listing Presentation'] },
  { name: 'Growth', color: '#d6a21d', activities: ['Brandon Coaching', 'Office Meeting', 'Continuing Education'] },
  { name: 'Isaiah', color: '#67c7ff', activities: ['Read', 'Write', 'LEGO', 'Outside', 'Chores', 'Music'] },
  { name: 'Admin', color: '#8b949e', activities: ['Email', 'Calendar', 'Phone Calls', 'Miscellaneous', 'Drive Time'] },
];

const ghostSchedule = [
  { start: '7:00', end: '8:00', label: 'Prayer / Coffee / Stretch' },
  { start: '8:00', end: '9:00', label: 'Walk' },
  { start: '9:00', end: '9:30', label: 'Email / Calendar' },
  { start: '9:30', end: '11:30', label: 'Circle Prospecting' },
  { start: '11:30', end: '12:00', label: 'Lunch' },
  { start: '12:00', end: '13:00', label: 'Follow-up Calls' },
  { start: '13:15', end: '14:15', label: 'Swim' },
  { start: '14:15', end: '14:45', label: 'Review / Plan Tomorrow' },
  { start: '14:45', end: '17:00', label: 'Flexible\n(Listings / Appointments / Admin / Family)' },
];

let expandedCategoryName = 'Health';
let placedTiles = [];
let activeTileId = null;

const timeline = document.querySelector('#timeline');
const timeLabels = document.querySelector('#time-labels');
const gridLines = document.querySelector('#grid-lines');
const ghostLayer = document.querySelector('#ghost-layer');
const placedLayer = document.querySelector('#placed-layer');
const categoryTabs = document.querySelector('#category-tabs');
const panelTitle = document.querySelector('#panel-title');
const activities = document.querySelector('#activities');
const popupBackdrop = document.querySelector('#popup-backdrop');

function parseTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours24 % 12 || 12}:${String(minutes).padStart(2, '0')}`;
}

function updateClock() {
  const now = new Date();
  document.querySelector('#current-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  document.querySelector('#current-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderTimelineGuide() {
  for (let minute = START_MINUTES; minute <= END_MINUTES; minute += 30) {
    const label = document.createElement('div');
    label.className = 'time-label';
    label.style.top = `${(minute - START_MINUTES) * PX_PER_MINUTE}px`;
    label.textContent = formatTime(minute);
    timeLabels.append(label);

    const line = document.createElement('div');
    line.className = 'grid-line';
    line.style.top = `${(minute - START_MINUTES) * PX_PER_MINUTE}px`;
    gridLines.append(line);
  }

  ghostSchedule.forEach((item) => {
    const start = parseTime(item.start);
    const end = parseTime(item.end);
    const block = document.createElement('div');
    block.className = 'ghost-block';
    block.style.top = `${(start - START_MINUTES) * PX_PER_MINUTE}px`;
    block.style.height = `${(end - start) * PX_PER_MINUTE}px`;
    block.textContent = item.label;
    ghostLayer.append(block);
  });
}

function renderCategories() {
  categoryTabs.innerHTML = '';
  categories.forEach((category) => {
    const tab = document.createElement('button');
    tab.className = `category-tab${category.name === expandedCategoryName ? ' active' : ''}`;
    tab.style.setProperty('--category-color', category.color);
    tab.textContent = category.name;
    tab.addEventListener('click', () => {
      expandedCategoryName = category.name;
      renderCategories();
    });
    categoryTabs.append(tab);
  });

  const expandedCategory = categories.find((category) => category.name === expandedCategoryName);
  panelTitle.textContent = expandedCategory.name;
  activities.innerHTML = '';
  expandedCategory.activities.forEach((activity) => {
    const tile = document.createElement('div');
    tile.className = 'activity-tile';
    tile.draggable = true;
    tile.textContent = activity;
    tile.style.borderColor = expandedCategory.color;
    tile.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('application/json', JSON.stringify({ activity, category: expandedCategory.name, color: expandedCategory.color }));
      event.dataTransfer.effectAllowed = 'copy';
    });
    activities.append(tile);
  });
}

function renderPlacedTiles() {
  placedLayer.innerHTML = '';
  placedTiles.forEach((tile) => {
    const button = document.createElement('button');
    button.className = 'placed-tile';
    button.style.top = `${(tile.start - START_MINUTES) * PX_PER_MINUTE}px`;
    button.style.height = `${tile.duration * PX_PER_MINUTE}px`;
    button.style.background = tile.color;
    button.innerHTML = `<strong>${tile.name}</strong><span>${formatTime(tile.start)}–${formatTime(tile.start + tile.duration)}</span>`;
    button.addEventListener('click', () => {
      activeTileId = tile.id;
      popupBackdrop.classList.remove('hidden');
    });
    placedLayer.append(button);
  });
}

timeline.addEventListener('dragover', (event) => event.preventDefault());
timeline.addEventListener('drop', (event) => {
  event.preventDefault();
  const payload = JSON.parse(event.dataTransfer.getData('application/json'));
  const rect = timeline.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const snappedMinutes = Math.round(y / (SLOT_MINUTES * PX_PER_MINUTE)) * SLOT_MINUTES;
  const start = Math.min(END_MINUTES - DEFAULT_TILE_DURATION, Math.max(START_MINUTES, START_MINUTES + snappedMinutes));
  placedTiles.push({ id: crypto.randomUUID(), name: payload.activity, category: payload.category, color: payload.color, start, duration: DEFAULT_TILE_DURATION });
  renderPlacedTiles();
});

function changeDuration(delta) {
  placedTiles = placedTiles.map((tile) => {
    if (tile.id !== activeTileId) return tile;
    const maxDurationForSlot = Math.min(MAX_TILE_DURATION, END_MINUTES - tile.start);
    return { ...tile, duration: Math.max(MIN_TILE_DURATION, Math.min(maxDurationForSlot, tile.duration + delta)) };
  });
  renderPlacedTiles();
}

document.querySelector('#plus-five').addEventListener('click', () => changeDuration(5));
document.querySelector('#minus-five').addEventListener('click', () => changeDuration(-5));
document.querySelector('#delete-tile').addEventListener('click', () => {
  placedTiles = placedTiles.filter((tile) => tile.id !== activeTileId);
  activeTileId = null;
  popupBackdrop.classList.add('hidden');
  renderPlacedTiles();
});
document.querySelector('#done-edit').addEventListener('click', () => popupBackdrop.classList.add('hidden'));
popupBackdrop.addEventListener('click', (event) => {
  if (event.target === popupBackdrop) popupBackdrop.classList.add('hidden');
});

updateClock();
setInterval(updateClock, 1000);
renderTimelineGuide();
renderCategories();
