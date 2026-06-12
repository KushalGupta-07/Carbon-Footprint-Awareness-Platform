/* ═══════════════════════════════════════════════════════════
   EcoTrack — Application Logic
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Security & HTML Escaping ─────────────────────────────────
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SCHEMA = {
  inputs: {
    transport: {
      carKm: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000 ? v : 150,
      carType: (v) => ['petrol', 'diesel', 'hybrid', 'ev', 'motorcycle'].includes(v) ? v : 'petrol',
      flightHours: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : 2,
      publicPct: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : 20,
    },
    energy: {
      homeSize: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 20 && v <= 400 ? v : 80,
      electricType: (v) => ['standard', 'mixed', 'renewable'].includes(v) ? v : 'standard',
      heatType: (v) => ['gas', 'electric', 'heat_pump', 'district', 'none'].includes(v) ? v : 'gas',
    },
    diet: {
      dietType: (v) => ['vegan', 'vegetarian', 'omnivore', 'heavy_meat'].includes(v) ? v : 'omnivore',
      foodWaste: (v) => ['none', 'low', 'high'].includes(v) ? v : 'low',
    },
    shopping: {
      onlineOrders: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 30 ? v : 4,
      clothingItems: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : 8,
      recycling: (v) => ['none', 'partial', 'full'].includes(v) ? v : 'partial',
    },
  },
  scores: {
    transport: (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0,
    energy: (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0,
    diet: (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0,
    shopping: (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0,
    total: (v) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0,
  },
  streak: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0,
  bestStreak: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0,
  lastCheckedDate: (v) => typeof v === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(v) ? v : null,
  calculatorDone: (v) => typeof v === 'boolean' ? v : false,
};

// ── Constants & Emission Factors ─────────────────────────────
// Sources: IPCC AR6, EPA, UK DESNZ 2023 (kg CO₂e per unit)
const EF = {
  // Transport (per km)
  car_petrol:       0.21,
  car_diesel:       0.19,
  car_hybrid:       0.12,
  car_ev:           0.05,
  motorcycle:       0.10,
  bus:              0.089,
  train:            0.041,
  // Flights (per hour ≈ 800 km, economy)
  flight_economy:   255,   // kg CO₂e per hour
  flight_business:  510,
  // Diet (monthly kg CO₂e)
  diet_vegan:       30,
  diet_vegetarian:  55,
  diet_omnivore:    100,
  diet_heavy_meat:  180,
  // Food waste multiplier
  food_waste_none:  1.0,
  food_waste_low:   1.1,
  food_waste_high:  1.3,
  // Energy (per kWh)
  electric_standard:  0.233,
  electric_mixed:     0.15,
  electric_renewable: 0.02,
  // Heating (per m² per month)
  heat_gas:          3.5,
  heat_electric:     4.2,
  heat_heat_pump:    1.2,
  heat_district:     2.1,
  heat_none:         0,
  // Shopping (per item/order)
  clothing_item:    20,
  online_order:     4.5,
  // Recycling reduction factor
  recycle_none:     1.0,
  recycle_partial:  0.88,
  recycle_full:     0.75,
};

const BENCHMARKS = {
  you:      0,    // dynamic
  usa:      1333, // kg/month (16t/yr)
  eu:       583,  // kg/month (~7t/yr)
  world:    392,  // kg/month (~4.7t/yr)
  paris:    167,  // kg/month (~2t/yr)
};

const CATEGORY_COLORS = {
  transport: '#29b6f6',
  energy:    '#ffa726',
  diet:      '#00e676',
  shopping:  '#ab47bc',
};

const TIPS = [
  {
    id: 'ev',
    category: 'transport',
    title: 'Switch to an Electric Vehicle',
    desc: 'EVs produce ~75% fewer emissions over their lifetime than petrol cars, especially on a renewable grid.',
    saving: 180,
    impact: 'high',
    emoji: '⚡',
    condition: (s) => s.transport.carType !== 'ev' && s.transport.carKm > 100,
  },
  {
    id: 'remote',
    category: 'transport',
    title: 'Work from Home 2 Days/Week',
    desc: 'Eliminating two commute days a week can cut your transport emissions by up to 40%.',
    saving: 60,
    impact: 'high',
    emoji: '🏠',
    condition: (s) => s.transport.carKm > 200,
  },
  {
    id: 'flight',
    category: 'transport',
    title: 'Reduce Short-Haul Flights',
    desc: 'Replace one short flight per year with train travel. Trains emit ~80% less CO₂ per km.',
    saving: 255,
    impact: 'high',
    emoji: '🚂',
    condition: (s) => s.transport.flightHours > 4,
  },
  {
    id: 'renewable',
    category: 'energy',
    title: 'Switch to Renewable Electricity',
    desc: 'A green tariff or solar panels can cut your home electricity emissions by up to 90%.',
    saving: 90,
    impact: 'high',
    emoji: '☀️',
    condition: (s) => s.energy.electricType !== 'renewable',
  },
  {
    id: 'thermostat',
    category: 'energy',
    title: 'Lower Your Thermostat 2°C',
    desc: 'Reducing your heating by 2°C saves roughly 10% on heating bills and emissions.',
    saving: 35,
    impact: 'medium',
    emoji: '🌡️',
    condition: (s) => s.energy.heatType === 'gas' || s.energy.heatType === 'electric',
  },
  {
    id: 'heatpump',
    category: 'energy',
    title: 'Install a Heat Pump',
    desc: 'Heat pumps are 3–4× more efficient than gas boilers, dramatically cutting heating emissions.',
    saving: 120,
    impact: 'high',
    emoji: '🔋',
    condition: (s) => s.energy.heatType === 'gas',
  },
  {
    id: 'vegan',
    category: 'diet',
    title: 'Try Plant-Based Mondays',
    desc: 'One meat-free day a week saves an estimated 52 kg CO₂e per year — and improves health.',
    saving: 25,
    impact: 'medium',
    emoji: '🥦',
    condition: (s) => s.diet.dietType === 'omnivore' || s.diet.dietType === 'heavy_meat',
  },
  {
    id: 'waste',
    category: 'diet',
    title: 'Halve Your Food Waste',
    desc: 'Food waste accounts for ~8% of global emissions. Meal planning and composting make a big difference.',
    saving: 20,
    impact: 'medium',
    emoji: '♻️',
    condition: (s) => s.diet.foodWaste !== 'none',
  },
  {
    id: 'secondhand',
    category: 'shopping',
    title: 'Buy Secondhand Clothing',
    desc: 'Secondhand fashion cuts clothing emissions by up to 82%. Thrifting is the new black.',
    saving: 40,
    impact: 'medium',
    emoji: '👕',
    condition: (s) => s.shopping.clothingItems > 5,
  },
  {
    id: 'recycle',
    category: 'shopping',
    title: 'Start Recycling Properly',
    desc: 'Proper recycling of paper, plastic, glass and metal saves significant embodied energy.',
    saving: 15,
    impact: 'low',
    emoji: '🗑️',
    condition: (s) => s.shopping.recycling !== 'full',
  },
  {
    id: 'consolidate',
    category: 'shopping',
    title: 'Consolidate Online Orders',
    desc: 'Bundling deliveries reduces last-mile delivery emissions by up to 35%.',
    saving: 10,
    impact: 'low',
    emoji: '📦',
    condition: (s) => s.shopping.onlineOrders > 4,
  },
  {
    id: 'bike',
    category: 'transport',
    title: 'Cycle for Short Trips',
    desc: 'Replacing car trips under 5 km with cycling saves emissions and improves wellbeing.',
    saving: 30,
    impact: 'medium',
    emoji: '🚴',
    condition: (s) => s.transport.carKm > 50,
  },
];

const HABITS = [
  { id: 'walked',     emoji: '🚶', name: 'Walked or cycled instead of driving', saving: 1.2 },
  { id: 'transit',    emoji: '🚌', name: 'Took public transit instead of car',   saving: 0.9 },
  { id: 'meatfree',   emoji: '🥗', name: 'Had a meat-free meal',                 saving: 1.5 },
  { id: 'cold_wash',  emoji: '🧺', name: 'Washed laundry on cold cycle',          saving: 0.6 },
  { id: 'reusable',   emoji: '♻️', name: 'Used a reusable bag/bottle/cup',        saving: 0.3 },
  { id: 'no_stream',  emoji: '📵', name: 'Skipped an hour of streaming',          saving: 0.1 },
  { id: 'food_waste', emoji: '🍱', name: 'Finished all leftovers (no food waste)',saving: 0.8 },
  { id: 'lights',     emoji: '💡', name: 'Turned off unused lights & devices',    saving: 0.4 },
  { id: 'local_food', emoji: '🌿', name: 'Bought local / seasonal produce',       saving: 0.7 },
  { id: 'carpooled',  emoji: '🚗', name: 'Carpooled with someone today',          saving: 1.0 },
];

// ── App State ─────────────────────────────────────────────────
const State = {
  currentStep: 0,
  totalSteps: 4,
  scores: {
    transport: 0,
    energy:    0,
    diet:      0,
    shopping:  0,
    total:     0,
  },
  inputs: {
    transport: {
      carKm:       150,
      carType:     'petrol',
      flightHours: 2,
      publicPct:   20,
    },
    energy: {
      homeSize:    80,
      electricType:'standard',
      heatType:    'gas',
    },
    diet: {
      dietType:   'omnivore',
      foodWaste:  'low',
    },
    shopping: {
      onlineOrders:  4,
      clothingItems: 8,
      recycling:     'partial',
    },
  },
  habits: {},
  streak: 0,
  bestStreak: 0,
  lastCheckedDate: null,
  calculatorDone: false,
};

// ── LocalStorage ──────────────────────────────────────────────
function saveState() {
  try {
    localStorage.setItem('ecotrack_state', JSON.stringify(State));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('ecotrack_state');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return;

    // Validate inputs
    if (saved.inputs && typeof saved.inputs === 'object') {
      for (const cat of ['transport', 'energy', 'diet', 'shopping']) {
        if (saved.inputs[cat] && typeof saved.inputs[cat] === 'object') {
          for (const key in SCHEMA.inputs[cat]) {
            if (saved.inputs[cat][key] !== undefined) {
              State.inputs[cat][key] = SCHEMA.inputs[cat][key](saved.inputs[cat][key]);
            }
          }
        }
      }
    }

    // Validate scores
    if (saved.scores && typeof saved.scores === 'object') {
      for (const key in SCHEMA.scores) {
        if (saved.scores[key] !== undefined) {
          State.scores[key] = SCHEMA.scores[key](saved.scores[key]);
        }
      }
    }

    // Validate habits
    if (saved.habits && typeof saved.habits === 'object') {
      for (const dateKey in saved.habits) {
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateKey) && saved.habits[dateKey] && typeof saved.habits[dateKey] === 'object') {
          State.habits[dateKey] = {};
          for (const habitId in saved.habits[dateKey]) {
            const habitExists = HABITS.some(h => h.id === habitId);
            if (habitExists) {
              State.habits[dateKey][habitId] = !!saved.habits[dateKey][habitId];
            }
          }
        }
      }
    }

    if (saved.streak !== undefined) State.streak = SCHEMA.streak(saved.streak);
    if (saved.bestStreak !== undefined) State.bestStreak = SCHEMA.bestStreak(saved.bestStreak);
    if (saved.lastCheckedDate !== undefined) State.lastCheckedDate = SCHEMA.lastCheckedDate(saved.lastCheckedDate);
    if (saved.calculatorDone !== undefined) State.calculatorDone = SCHEMA.calculatorDone(saved.calculatorDone);
  } catch(e) {
    console.error("Error loading state: ", e);
  }
}

// ── Calculation Engine ────────────────────────────────────────
function calcTransport(inp) {
  const carFactor = EF[`car_${inp.carType}`] || EF.car_petrol;
  // Compute car emissions for the fraction of travel done by car
  const carKmMonth = inp.carKm * 4.33 * (1 - inp.publicPct / 100);
  const carKgMonth = carKmMonth * carFactor;
  
  // Compute public transit emissions for the fraction of travel done by transit
  // Use average of bus (0.089) and train (0.041) factors
  const transitFactor = (EF.bus + EF.train) / 2;
  const transitKmMonth = inp.carKm * 4.33 * (inp.publicPct / 100);
  const transitKgMonth = transitKmMonth * transitFactor;

  // Flights: hours per year to hours per month, economy is default
  const flightKgMonth = (inp.flightHours / 12) * EF.flight_economy;
  
  return Math.round(carKgMonth + transitKgMonth + flightKgMonth);
}

function calcEnergy(inp) {
  const electricFactor = EF[`electric_${inp.electricType}`] || EF.electric_standard;
  const kwhMonth = inp.homeSize * 0.85;
  const electricKg = kwhMonth * electricFactor;
  const heatFactor = EF[`heat_${inp.heatType}`] !== undefined ? EF[`heat_${inp.heatType}`] : EF.heat_none;
  const heatKg = heatFactor * inp.homeSize;
  return Math.round(electricKg + heatKg);
}

function calcDiet(inp) {
  const base = EF[`diet_${inp.dietType}`] || EF.diet_omnivore;
  const wasteMult = EF[`food_waste_${inp.foodWaste}`] || 1.1;
  return Math.round(base * wasteMult);
}

function calcShopping(inp) {
  const clothing = inp.clothingItems * EF.clothing_item;
  const orders   = inp.onlineOrders  * EF.online_order;
  const recycMult= EF[`recycle_${inp.recycling}`] || 1.0;
  return Math.round((clothing + orders) * recycMult);
}

function recalcAll() {
  State.scores.transport = calcTransport(State.inputs.transport);
  State.scores.energy    = calcEnergy(State.inputs.energy);
  State.scores.diet      = calcDiet(State.inputs.diet);
  State.scores.shopping  = calcShopping(State.inputs.shopping);
  State.scores.total     = State.scores.transport + State.scores.energy +
                           State.scores.diet      + State.scores.shopping;
}

function getGrade(total) {
  if (total < 200) return { grade: 'A+', label: 'Outstanding', color: '#00e676', emoji: '🌟' };
  if (total < 350) return { grade: 'A',  label: 'Excellent',   color: '#69f0ae', emoji: '✅' };
  if (total < 500) return { grade: 'B',  label: 'Good',        color: '#b2ff59', emoji: '👍' };
  if (total < 750) return { grade: 'C',  label: 'Average',     color: '#ffa726', emoji: '⚠️' };
  if (total < 1100)return { grade: 'D',  label: 'High',        color: '#ff7043', emoji: '⚡' };
  return               { grade: 'F',  label: 'Critical',   color: '#ef5350', emoji: '🚨' };
}

// ── DOM Helpers ───────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function animateCount(el, from, to, duration = 1000, suffix = '') {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * ease);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Canvas Donut Chart ────────────────────────────────────────
function drawDonut(canvas, segments, options = {}) {
  const dpr = window.devicePixelRatio || 1;
  const size = options.size || 200;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.26;
  const gap    = 0.025;
  const total  = segments.reduce((a, s) => a + s.value, 0) || 1;

  let startAngle = -Math.PI / 2;
  const animDuration = options.animate ? 900 : 0;
  const startTime = performance.now();

  function frame(now) {
    ctx.clearRect(0, 0, size, size);
    const progress = animDuration > 0
      ? Math.min((now - startTime) / animDuration, 1)
      : 1;
    const eased = 1 - Math.pow(1 - progress, 3);

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();

    let angle = -Math.PI / 2;
    segments.forEach(seg => {
      const sliceAngle = (seg.value / total) * Math.PI * 2 * eased - gap;
      if (sliceAngle <= 0) return;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, angle + gap/2, angle + sliceAngle + gap/2);
      ctx.arc(cx, cy, innerR, angle + sliceAngle + gap/2, angle + gap/2, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;

      // Glow
      ctx.shadowColor  = seg.color;
      ctx.shadowBlur   = 12;
      ctx.fill();
      ctx.shadowBlur   = 0;

      angle += sliceAngle + gap;
    });

    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── Canvas Score Ring ─────────────────────────────────────────
function drawScoreRing(canvas, value, maxVal, color, size = 220, animate = true) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const r  = size * 0.44;
  const lw = size * 0.065;
  const pct = Math.min(value / maxVal, 1);

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.stroke();

  const startAngle = -Math.PI / 2;
  const duration   = animate ? 1200 : 0;
  const startTime  = performance.now();

  function frame(now) {
    const elapsed  = now - startTime;
    const progress = animate ? Math.min(elapsed / duration, 1) : 1;
    const ease     = 1 - Math.pow(1 - progress, 4);
    const endAngle = startAngle + Math.PI * 2 * pct * ease;

    ctx.clearRect(0, 0, size, size);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = lw;
    ctx.stroke();

    // Filled arc
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, color);
    grad.addColorStop(1, adjustColor(color, 40));
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur  = 20;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function adjustColor(hex, amount) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.min(255, parseInt(result[1], 16) + amount);
  const g = Math.min(255, parseInt(result[2], 16) + amount);
  const b = Math.min(255, parseInt(result[3], 16) + amount);
  return `rgb(${r},${g},${b})`;
}

// ── Toast Notifications ───────────────────────────────────────
function showToast(title, msg, emoji = '🌿', duration = 4000) {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${escapeHTML(emoji)}</span>
    <div class="toast-text">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${msg ? `<div class="toast-msg">${escapeHTML(msg)}</div>` : ''}
    </div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Scroll Reveal ─────────────────────────────────────────────
function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Animate benchmark bars when section visible
        if (entry.target.classList.contains('benchmark-bar-fill')) {
          entry.target.classList.add('animate');
        }
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  $$('.reveal').forEach(el => observer.observe(el));
  $$('.benchmark-bar-fill').forEach(el => observer.observe(el));
}

// ── Navbar scroll effect ──────────────────────────────────────
function setupNavbar() {
  const navbar = $('#navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Active nav link highlight
  const sections = $$('section[id]');
  const navLinks = $$('.nav-links a');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        const active = navLinks.find(a => a.getAttribute('href') === `#${e.target.id}`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => io.observe(s));
}

// ── Floating Particles ────────────────────────────────────────
function createParticles() {
  const container = $('.hero-particles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size    = Math.random() * 6 + 2;
    const isLeaf  = Math.random() > 0.6;
    const delay   = Math.random() * 12;
    const duration= Math.random() * 10 + 8;
    const left    = Math.random() * 100;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${left}%;
      background: ${isLeaf ? '#00e676' : 'rgba(0,230,118,0.3)'};
      box-shadow: 0 0 ${size * 2}px rgba(0,230,118,0.5);
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
    `;
    container.appendChild(p);
  }
}

// ── Calculator ────────────────────────────────────────────────
let currentStep = 0;

function setupCalculator() {
  updateCalcUI();

  // Range inputs live update
  $$('.form-range').forEach(range => {
    range.addEventListener('input', function() {
      const display = this.closest('.range-wrapper')?.querySelector('.range-value');
      if (display) {
        const unit = this.dataset.unit || '';
        display.textContent = Number(this.value).toLocaleString() + unit;
      }
    });
  });

  // Toggle buttons
  $$('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const group = this.dataset.group;
      $$(`.toggle-btn[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      collectCurrentStepInputs();
      recalcAll();
      updateLiveEstimate();
    });
  });

  // Next / Prev buttons
  $('#calc-next').addEventListener('click', nextStep);
  $('#calc-prev').addEventListener('click', prevStep);

  // Recalculate on any input change
  document.querySelectorAll('#calculator input, #calculator select').forEach(el => {
    el.addEventListener('input', debounce(() => {
      collectCurrentStepInputs();
      recalcAll();
      updateLiveEstimate();
    }, 200));
  });

  recalcAll();
  updateLiveEstimate();
  populateInputsFromState();
}

function nextStep() {
  collectCurrentStepInputs();
  recalcAll();
  if (currentStep < State.totalSteps - 1) {
    currentStep++;
    updateCalcUI();
  } else {
    showResults();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    updateCalcUI();
  }
}

function updateCalcUI() {
  // Panel visibility
  $$('.calc-panel').forEach((p, i) => {
    p.classList.toggle('active', i === currentStep);
  });

  // Step bubbles
  $$('.calc-step-item').forEach((item, i) => {
    const bubble = item.querySelector('.calc-step-bubble');
    const label  = item.querySelector('.calc-step-label');
    const conn   = item.querySelector('.calc-step-connector');

    if (i < currentStep) {
      bubble.classList.add('done');
      bubble.classList.remove('active');
      bubble.textContent = '✓';
    } else if (i === currentStep) {
      bubble.classList.add('active');
      bubble.classList.remove('done');
      bubble.textContent = i + 1;
    } else {
      bubble.classList.remove('active', 'done');
      bubble.textContent = i + 1;
    }

    if (label) label.classList.toggle('active', i === currentStep);
    if (conn)  conn.classList.toggle('done', i < currentStep);
  });

  // Progress text
  $('#calc-progress-text').textContent = `Step ${currentStep + 1} of ${State.totalSteps}`;

  // Button states
  const prevBtn = $('#calc-prev');
  const nextBtn = $('#calc-next');
  prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  if (currentStep === State.totalSteps - 1) {
    nextBtn.textContent = '🌿 See My Results';
    nextBtn.classList.add('btn-primary');
    nextBtn.classList.remove('btn-ghost');
  } else {
    nextBtn.textContent = 'Next →';
    nextBtn.classList.add('btn-ghost');
    nextBtn.classList.remove('btn-primary');
  }
}

function collectCurrentStepInputs() {
  const categories = ['transport', 'energy', 'diet', 'shopping'];
  const cat = categories[currentStep];
  const panel = $(`.calc-panel[data-step="${currentStep}"]`);
  if (!panel) return;

  panel.querySelectorAll('input[name], select[name]').forEach(el => {
    State.inputs[cat][el.name] = el.tagName === 'INPUT' && el.type === 'range'
      ? Number(el.value)
      : el.value;
  });

  // Toggle buttons
  panel.querySelectorAll('.toggle-btn.selected').forEach(btn => {
    State.inputs[cat][btn.dataset.group] = btn.dataset.value;
  });
}

function populateInputsFromState() {
  const categories = ['transport', 'energy', 'diet', 'shopping'];
  categories.forEach((cat, stepIdx) => {
    const panel = $(`.calc-panel[data-step="${stepIdx}"]`);
    if (!panel) return;
    const data = State.inputs[cat];

    panel.querySelectorAll('input[name]').forEach(el => {
      if (data[el.name] !== undefined) {
        el.value = data[el.name];
        const display = el.closest('.range-wrapper')?.querySelector('.range-value');
        if (display) {
          const unit = el.dataset.unit || '';
          display.textContent = Number(el.value).toLocaleString() + unit;
        }
      }
    });
    panel.querySelectorAll('select[name]').forEach(sel => {
      if (data[sel.name] !== undefined) sel.value = data[sel.name];
    });
    panel.querySelectorAll('.toggle-btn').forEach(btn => {
      const group = btn.dataset.group;
      if (data[group] !== undefined) {
        btn.classList.toggle('selected', btn.dataset.value === String(data[group]));
      }
    });
  });
}

function updateLiveEstimate() {
  const el = $('#live-estimate-value');
  if (el) el.textContent = State.scores.total.toLocaleString() + ' kg';
}

// ── Results Display ───────────────────────────────────────────
function showResults() {
  State.calculatorDone = true;
  saveState();

  // Switch view
  $$('.calc-panel').forEach(p => p.classList.remove('active'));
  const resultsPanel = $('#results-panel');
  resultsPanel.classList.add('active');

  const grade = getGrade(State.scores.total);

  // Draw ring
  const canvas = $('#results-ring-canvas');
  const maxVal = 1500;
  drawScoreRing(canvas, State.scores.total, maxVal, grade.color, 200, true);

  // Animate score
  const valEl = $('#results-value');
  animateCount(valEl, 0, State.scores.total, 1400, '');

  // Breakdown values
  ['transport', 'energy', 'diet', 'shopping'].forEach(cat => {
    const el = $(`#result-${cat}`);
    if (el) animateCount(el, 0, State.scores[cat], 1000, '');
  });

  // Grade badge
  const gradeEl = $('#results-grade');
  if (gradeEl) {
    gradeEl.textContent = `${grade.emoji} ${grade.grade} — ${grade.label}`;
    gradeEl.style.color = grade.color;
  }

  // Update main dashboard
  updateDashboard();
  updateInsightsSection();
  updateBenchmarks();

  showToast('Calculation complete!', `Your footprint: ${State.scores.total} kg CO₂e/month`, '🌍');

  setTimeout(() => {
    document.getElementById('insights').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 2000);
}

function resetCalculator() {
  currentStep = 0;
  const resultsPanel = $('#results-panel');
  resultsPanel.classList.remove('active');
  updateCalcUI();
}

// ── Dashboard ─────────────────────────────────────────────────
function updateDashboard() {
  recalcAll();
  const grade = getGrade(State.scores.total);

  // Score ring
  const ringCanvas = $('#score-ring-canvas');
  if (ringCanvas) drawScoreRing(ringCanvas, State.scores.total, 1500, grade.color, 220, true);

  // Score value
  const scoreValEl = $('#score-value');
  if (scoreValEl) animateCount(scoreValEl, 0, State.scores.total, 1200, '');

  // Grade
  const gradeBadge = $('#score-grade');
  if (gradeBadge) {
    gradeBadge.textContent = `${grade.emoji} ${grade.grade} — ${grade.label}`;
    gradeBadge.style.color      = grade.color;
    gradeBadge.style.background = grade.color + '18';
    gradeBadge.style.border     = `1px solid ${grade.color}55`;
  }

  // Stats
  const statEls = {
    '#stat-transport': State.scores.transport,
    '#stat-energy':    State.scores.energy,
    '#stat-diet':      State.scores.diet,
    '#stat-shopping':  State.scores.shopping,
  };
  Object.entries(statEls).forEach(([sel, val]) => {
    const el = $(sel);
    if (el) animateCount(el, 0, val, 900, '');
  });

  // Annual value
  const annualEl = $('#score-annual');
  if (annualEl) annualEl.textContent = ((State.scores.total * 12) / 1000).toFixed(1) + 't CO₂e';
}

// ── Insights & Charts ─────────────────────────────────────────
function updateInsightsSection() {
  // Donut chart
  const donutCanvas = $('#donut-canvas');
  if (donutCanvas) {
    const segments = [
      { label: 'Transport', value: State.scores.transport, color: CATEGORY_COLORS.transport },
      { label: 'Energy',    value: State.scores.energy,    color: CATEGORY_COLORS.energy    },
      { label: 'Diet',      value: State.scores.diet,      color: CATEGORY_COLORS.diet      },
      { label: 'Shopping',  value: State.scores.shopping,  color: CATEGORY_COLORS.shopping  },
    ];
    drawDonut(donutCanvas, segments, { size: 200, animate: true });

    // Legend
    const legend = $('#donut-legend');
    if (legend) {
      legend.innerHTML = segments.map(s => {
        const safeColor = escapeHTML(s.color);
        return `
          <div class="legend-item">
            <div class="legend-dot-label">
              <div class="legend-dot" style="background:${safeColor}"></div>
              <span class="legend-label">${escapeHTML(s.label)}</span>
            </div>
            <span class="legend-val" style="color:${safeColor}">${escapeHTML(s.value.toString())} kg</span>
          </div>`;
      }).join('');
    }
  }

  // Tips
  renderTips();
}

function renderTips() {
  const container = $('#tips-container');
  if (!container) return;

  const applicable = TIPS.filter(tip => tip.condition(State.inputs))
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 6);

  container.innerHTML = applicable.map(tip => {
    const safeImpact = escapeHTML(tip.impact);
    return `
      <div class="tip-card ${safeImpact === 'high' ? 'high-impact' : ''} reveal">
        <div class="tip-header">
          <span class="tip-emoji">${escapeHTML(tip.emoji)}</span>
          <span class="impact-badge ${safeImpact}">
            ${safeImpact === 'high' ? '↑↑ High' : safeImpact === 'medium' ? '↑ Medium' : '↓ Low'} Impact
          </span>
        </div>
        <div class="tip-title">${escapeHTML(tip.title)}</div>
        <div class="tip-desc">${escapeHTML(tip.desc)}</div>
        <div class="tip-saving">
          <span>🌿</span>
          <span>Save ~${escapeHTML(tip.saving.toString())} kg CO₂e/month</span>
        </div>
      </div>`;
  }).join('');

  // Re-observe new tips for scroll reveal
  $$('#tips-container .reveal').forEach(el => {
    el.classList.add('visible');
  });
}

// ── Benchmarks ────────────────────────────────────────────────
function updateBenchmarks() {
  BENCHMARKS.you = State.scores.total;
  const maxVal = Math.max(...Object.values(BENCHMARKS), 1400);

  const rows = {
    'you':    { label: 'You',          color: getGrade(State.scores.total).color, flag: '👤' },
    'usa':    { label: 'USA Average',  color: '#ef5350', flag: '🇺🇸' },
    'eu':     { label: 'EU Average',   color: '#ffa726', flag: '🇪🇺' },
    'world':  { label: 'World Average',color: '#29b6f6', flag: '🌍' },
    'paris':  { label: 'Paris Target', color: '#00e676', flag: '🎯' },
  };

  const container = $('#benchmark-bars');
  if (!container) return;

  container.innerHTML = Object.entries(BENCHMARKS).map(([key, val]) => {
    const info  = rows[key];
    const pct   = (val / maxVal) * 100;
    const annual= ((val * 12) / 1000).toFixed(1);
    const safeColor = escapeHTML(info.color);
    return `
      <div class="benchmark-row">
        <div class="benchmark-row-header">
          <span class="benchmark-name">${escapeHTML(info.flag)} ${escapeHTML(info.label)}</span>
          <span class="benchmark-val" style="color:${safeColor}">${escapeHTML(annual)}t/yr</span>
        </div>
        <div class="benchmark-bar-track">
          <div class="benchmark-bar-fill" style="width:${pct}%; background:${safeColor}; box-shadow: 0 0 12px ${safeColor}55;"></div>
        </div>
      </div>`;
  }).join('');

  // Animate bars
  setTimeout(() => {
    $$('.benchmark-bar-fill').forEach(bar => bar.classList.add('animate'));
  }, 300);
}

// ── Habit Tracker ─────────────────────────────────────────────
function setupTracker() {
  const todayKey = getTodayKey();
  if (!State.habits[todayKey]) State.habits[todayKey] = {};

  const list = $('#habits-list');
  if (!list) return;

  list.innerHTML = HABITS.map(h => {
    const done = !!State.habits[todayKey][h.id];
    const safeId = escapeHTML(h.id);
    return `
      <div class="habit-item ${done ? 'checked' : ''}" data-habit="${safeId}" id="habit-${safeId}">
        <span class="habit-emoji">${escapeHTML(h.emoji)}</span>
        <div class="habit-info">
          <div class="habit-name">${escapeHTML(h.name)}</div>
          <div class="habit-co2">Saves ~${escapeHTML(h.saving.toString())} kg CO₂e today</div>
        </div>
        <div class="habit-check">
          <span class="habit-check-icon">✓</span>
        </div>
      </div>`;
  }).join('');

  // Event delegation
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.habit-item');
    if (!item) return;
    const habitId = item.dataset.habit;
    const todayK  = getTodayKey();
    if (!State.habits[todayK]) State.habits[todayK] = {};
    const wasDone = !!State.habits[todayK][habitId];
    State.habits[todayK][habitId] = !wasDone;
    item.classList.toggle('checked', !wasDone);

    if (!wasDone) {
      const habit = HABITS.find(h => h.id === habitId);
      showToast('Habit logged! 🎉', `${habit?.name} — great job!`, '✅', 3000);
    }

    updateStreakDisplay();
    saveState();
  });

  updateStreakDisplay();
  renderWeeklyDots();

  // Date header
  const dateEl = $('#habits-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getDayKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function dayHasActivity(key) {
  const day = State.habits[key];
  return day && Object.values(day).some(Boolean);
}

function updateStreakDisplay() {
  // Calculate current streak
  let streak = 0;
  let i = 0;
  while (true) {
    const key = getDayKey(i);
    if (dayHasActivity(key)) { streak++; i++; }
    else break;
  }
  State.streak = streak;
  State.bestStreak = Math.max(State.bestStreak, streak);

  const streakEl = $('#streak-number');
  if (streakEl) streakEl.textContent = streak;

  const bestEl = $('#best-streak');
  if (bestEl) bestEl.textContent = `Best: ${State.bestStreak} days`;

  saveState();
}

function renderWeeklyDots() {
  const container = $('#weekly-dots');
  if (!container) return;
  const days = ['M','T','W','T','F','S','S'];
  const today = new Date().getDay(); // 0=Sun
  // Map to Mon-start
  const dotDays = [1,2,3,4,5,6,0];

  container.innerHTML = days.map((d, i) => {
    const daysAgo = (today - dotDays[i] + 7) % 7;
    const key = getDayKey(daysAgo);
    const done = dayHasActivity(key);
    const isToday = daysAgo === 0;
    return `<div class="weekly-dot ${done ? 'done' : ''} ${isToday && !done ? 'today' : ''}">${escapeHTML(d)}</div>`;
  }).join('');
}

// ── Utility ───────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  recalcAll();

  setupNavbar();
  createParticles();
  setupScrollReveal();
  setupCalculator();
  setupTracker();

  updateDashboard();
  updateInsightsSection();
  updateBenchmarks();

  // Results panel reset button
  const resetBtn = $('#reset-calc-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetCalculator);

  // Smooth hero CTA scroll
  $('#hero-cta-btn').addEventListener('click', () => {
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
  });

  // Dashboard CTA
  const dashCta = $('#dashboard-cta');
  if (dashCta) {
    dashCta.addEventListener('click', () => {
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Bonus: Animate goal bar after page load
  setTimeout(() => {
    const bar = $('#goal-bar');
    if (bar) {
      const todayKey = getTodayKey();
      const todayHabits = State.habits[todayKey] || {};
      const count = Object.values(todayHabits).filter(Boolean).length;
      const pct = Math.min((count / 5) * 100, 100);
      setTimeout(() => { bar.style.width = pct + '%'; }, 600);
    }

    // Animate hero ring with dynamic values from State
    const heroCanvas = $('#hero-ring-canvas');
    if (heroCanvas) {
      const gradeColor = getGrade(State.scores.total).color;
      drawScoreRing(heroCanvas, State.scores.total, 1500, gradeColor, 220, false);
      const heroValue = $('.score-value', heroCanvas.closest('.score-card'));
      if (heroValue) {
        heroValue.textContent = State.scores.total > 0 ? State.scores.total.toLocaleString() : '--';
        heroValue.style.color = gradeColor;
      }
      const heroDesc = heroCanvas.closest('.score-card').querySelector('p');
      if (heroDesc && State.scores.total > 0) {
        heroDesc.textContent = 'Welcome back! Here is your current carbon score.';
      }
    }
  }, 500);

  // Initial welcome toast
  setTimeout(() => {
    showToast('Welcome to EcoTrack 🌿', 'Start by calculating your carbon footprint below.', '🌍', 5000);
  }, 1500);

  console.log('%c🌿 EcoTrack loaded', 'color:#00e676;font-size:1.2rem;font-weight:bold;');
});
