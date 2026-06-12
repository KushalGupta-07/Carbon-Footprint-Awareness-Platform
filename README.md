# 🌿 EcoTrack — Carbon Footprint Tracker

## To test the code use this URL :
 https://ecosystem-orcin.vercel.app/ 


> **Understand, track, and reduce your personal carbon footprint through simple actions and personalized insights.**

EcoTrack is a premium, fully self-contained web application that helps individuals measure their monthly CO₂ emissions across four key life areas, visualize their impact with animated charts, build daily eco-habits, and compare themselves against global benchmarks — all powered by IPCC-backed emission factors and stored locally with no server or account needed.

---

## 📋 Table of Contents

- [Live Demo](#live-demo)
- [Screenshots](#screenshots)
- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Calculation Methodology](#calculation-methodology)
- [Emission Factors](#emission-factors)
- [Carbon Grading System](#carbon-grading-system)
- [Personalized Tips Engine](#personalized-tips-engine)
- [Daily Habit Tracker](#daily-habit-tracker)
- [Benchmarks & Global Context](#benchmarks--global-context)
- [Data Persistence](#data-persistence)
- [Accessibility](#accessibility)
- [Responsive Design](#responsive-design)
- [Design System](#design-system)
- [Browser Compatibility](#browser-compatibility)
- [Data Sources & References](#data-sources--references)
- [License](#license)

---

## 🚀 Live Demo

Open directly in any modern browser — no build step, no server, no dependencies:

```
index.html  ←  just double-click or drag into your browser
```

---

## ✨ Features

### 🌍 Hero Section
- Atmospheric dark-green hero with animated floating particle system
- Key global statistics: world average (4.7t/yr), Paris 2050 target (2t/yr), potential 73% reduction
- Smooth scroll CTAs into the calculator

### 📊 Carbon Dashboard
- **Animated Canvas score ring** — color-coded from green (A+) to red (F)
- **4 category stat cards**: Transport 🚗 · Energy ⚡ · Diet 🥗 · Shopping 🛍️
- Animated number counters on every value
- Annual CO₂ equivalent displayed in tonnes
- One-click recalculate shortcut

### 🧮 Multi-Step Carbon Calculator
A guided 4-step form with a live estimate that updates as you type:

| Step | Category | Key Inputs |
|------|----------|-----------|
| 1 | 🚗 **Transport** | Weekly driving distance, vehicle type, flight hours/year, public transit % |
| 2 | ⚡ **Home Energy** | Home floor area (m²), electricity source type, heating system |
| 3 | 🥗 **Diet & Food** | Diet type, food waste level |
| 4 | 🛍️ **Shopping** | Online orders/month, clothing items/year, recycling habits |

- Animated step indicator with connector lines
- Persistent live estimate badge in the footer bar
- Results screen with animated ring + 4-category breakdown
- Grade badge (A+ → F) with label (Outstanding → Critical)

### 📈 Insights & Charts
- **Animated donut chart** (pure Canvas API) showing emission proportions by category
- **Color-coded legend** matching each category
- **Personalized tips engine** — surfaces top 6 actionable reduction tips ranked by kg CO₂e savings
- Impact badges: `↑↑ High` / `↑ Medium` / `↓ Low`
- Each tip shows estimated monthly CO₂ saving

### ✅ Daily Habit Tracker
- **10 pre-built eco-habits** to log each day:
  - 🚶 Walked or cycled instead of driving
  - 🚌 Took public transit instead of car
  - 🥗 Had a meat-free meal
  - 🧺 Washed laundry on cold cycle
  - ♻️ Used a reusable bag/bottle/cup
  - 📵 Skipped an hour of streaming
  - 🍱 Finished all leftovers (no food waste)
  - 💡 Turned off unused lights & devices
  - 🌿 Bought local / seasonal produce
  - 🚗 Carpooled with someone today
- **Streak counter** with animated flame 🔥
- **Weekly dot calendar** (Mon–Sun) showing active days
- Each habit shows estimated CO₂ savings in kg
- All data persisted via `localStorage`

### 🏆 Benchmarks
- Animated horizontal bar chart comparing:
  - 👤 **You** — your calculated footprint
  - 🇺🇸 **USA Average** — 16t/yr
  - 🇪🇺 **EU Average** — ~7t/yr
  - 🌍 **World Average** — 4.7t/yr
  - 🎯 **Paris 2050 Target** — 2t/yr
- Global targets info card with context and source citations

### 🔔 Toast Notifications
- Non-intrusive slide-up toasts on habit check-in, calculator completion, and page load
- Auto-dismiss after 4 seconds with smooth exit animation

---

## 📁 Project Structure

```
ecosysytem/
│
├── index.html          # App shell — all markup, 5 sections, nav, footer
├── style.css           # Design system — tokens, components, animations
├── app.js              # Application logic — state, calculator, charts, tracker
├── README.md           # This file
│
└── assets/
    └── eco-bg.png      # AI-generated atmospheric hero background image
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic, ARIA-annotated) |
| Styling | Vanilla CSS (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES2020, no frameworks) |
| Charts | Canvas 2D API (custom donut + ring charts) |
| Fonts | Google Fonts — Outfit (headings) + Inter (body) |
| Storage | Browser `localStorage` |
| Build | **None** — zero build step required |
| Dependencies | **None** — fully self-contained |

---

## 🏁 Getting Started

### Option 1 — Open Directly (Recommended)
```
Double-click  index.html
```
Or drag `index.html` into any browser window.

### Option 2 — Local Dev Server (optional, for stricter CORS)
```bash
# Python (built-in)
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code
# Use the "Live Server" extension and click "Go Live"
```
Then visit: `http://localhost:8080`

---

## 🔢 Calculation Methodology

All emissions are estimated in **kg CO₂e per month** using the formula below:

### Transport
```
Monthly kg CO₂e =
  (carKm/week × 4.33 weeks × EF[carType] × (1 – transitPercent/100))
  + (flightHours/year ÷ 12 × EF[flight_economy])
```

### Home Energy
```
Monthly kg CO₂e =
  (homeM² × 0.85 kWh/m²/month × EF[electricityType])
  + (homeM² × EF[heatingType])
```

### Diet
```
Monthly kg CO₂e = EF[dietType] × wasteMutiplier[foodWasteLevel]
```

### Shopping
```
Monthly kg CO₂e =
  (clothingItemsPerYear × 20 + onlineOrdersPerMonth × 4.5)
  × recyclingMultiplier[recyclingLevel]
```

### Total
```
Total = Transport + Energy + Diet + Shopping
```

---

## 📊 Emission Factors

### Transport (kg CO₂e per km)
| Vehicle | Factor |
|---------|--------|
| Petrol car | 0.21 |
| Diesel car | 0.19 |
| Hybrid car | 0.12 |
| Electric vehicle | 0.05 |
| Motorcycle | 0.10 |
| Bus | 0.089 |
| Train | 0.041 |
| Flight (economy, per hour) | 255 |

### Electricity (kg CO₂e per kWh)
| Source | Factor |
|--------|--------|
| Standard grid (coal/gas) | 0.233 |
| Mixed (some renewables) | 0.150 |
| 100% Renewable / Solar | 0.020 |

### Heating (kg CO₂e per m² per month)
| System | Factor |
|--------|--------|
| Gas boiler | 3.5 |
| Electric heating | 4.2 |
| Heat pump | 1.2 |
| District heating | 2.1 |
| None | 0.0 |

### Diet (kg CO₂e per month)
| Diet Type | Monthly Emissions |
|-----------|------------------|
| Vegan | 30 kg |
| Vegetarian | 55 kg |
| Omnivore | 100 kg |
| Heavy meat eater | 180 kg |

### Shopping
| Item | Factor |
|------|--------|
| Clothing item (new) | 20 kg CO₂e |
| Online order (delivery) | 4.5 kg CO₂e |

### Recycling Multipliers
| Level | Multiplier |
|-------|-----------|
| None | 1.00× |
| Partial | 0.88× |
| Full (+ composting) | 0.75× |

---

## 🏅 Carbon Grading System

| Grade | Monthly CO₂e | Label | Colour |
|-------|-------------|-------|--------|
| 🌟 A+ | < 200 kg | Outstanding | `#00e676` |
| ✅ A | 200–350 kg | Excellent | `#69f0ae` |
| 👍 B | 350–500 kg | Good | `#b2ff59` |
| ⚠️ C | 500–750 kg | Average | `#ffa726` |
| ⚡ D | 750–1100 kg | High | `#ff7043` |
| 🚨 F | > 1100 kg | Critical | `#ef5350` |

---

## 💡 Personalized Tips Engine

The tips engine evaluates your calculator inputs and surfaces the top 6 most impactful actions **specific to your lifestyle**. Tips are ranked by estimated monthly CO₂ saving.

| Tip | Category | Potential Saving |
|-----|----------|-----------------|
| Switch to an Electric Vehicle | Transport | ~180 kg/month |
| Work from Home 2 Days/Week | Transport | ~60 kg/month |
| Reduce Short-Haul Flights | Transport | ~255 kg/month |
| Switch to Renewable Electricity | Energy | ~90 kg/month |
| Install a Heat Pump | Energy | ~120 kg/month |
| Lower Thermostat 2°C | Energy | ~35 kg/month |
| Try Plant-Based Mondays | Diet | ~25 kg/month |
| Halve Your Food Waste | Diet | ~20 kg/month |
| Buy Secondhand Clothing | Shopping | ~40 kg/month |
| Start Recycling Properly | Shopping | ~15 kg/month |
| Consolidate Online Orders | Shopping | ~10 kg/month |
| Cycle for Short Trips | Transport | ~30 kg/month |

Tips are **conditional** — e.g. the EV tip only appears if you drive more than 100 km/week and don't already have an EV.

---

## ✅ Daily Habit Tracker

| Habit | CO₂ Saved Today |
|-------|----------------|
| 🚶 Walked or cycled instead of driving | 1.2 kg |
| 🚌 Took public transit instead of car | 0.9 kg |
| 🥗 Had a meat-free meal | 1.5 kg |
| 🧺 Washed laundry on cold cycle | 0.6 kg |
| ♻️ Used a reusable bag/bottle/cup | 0.3 kg |
| 📵 Skipped an hour of streaming | 0.1 kg |
| 🍱 Finished all leftovers | 0.8 kg |
| 💡 Turned off unused lights & devices | 0.4 kg |
| 🌿 Bought local/seasonal produce | 0.7 kg |
| 🚗 Carpooled with someone | 1.0 kg |

---

## 🌍 Benchmarks & Global Context

| Benchmark | Annual CO₂e | Monthly |
|-----------|------------|---------|
| 🇺🇸 USA Average | 16.0 t/yr | 1,333 kg |
| 🇪🇺 EU Average | ~7.0 t/yr | 583 kg |
| 🌍 World Average | 4.7 t/yr | 392 kg |
| 🎯 Paris 2050 Target | 2.0 t/yr | 167 kg |

---

## 💾 Data Persistence

All user data is stored in the browser's `localStorage` under the key `ecotrack_state`. This includes:

- Calculator inputs (all 4 categories)
- Calculated CO₂ scores
- Daily habit check-ins (keyed by date: `YYYY-M-D`)
- Current and best streak counts
- Calculator completion status

**No data is ever sent to a server.** The app works fully offline after first load (fonts require internet on first visit).

To reset all data:
```javascript
// Open browser DevTools console and run:
localStorage.removeItem('ecotrack_state');
location.reload();
```

---

## ♿ Accessibility

- Semantic HTML5 elements throughout (`<nav>`, `<section>`, `<footer>`, `<main>`)
- ARIA roles: `role="navigation"`, `role="list"`, `role="tablist"`, `role="form"`, `role="region"`
- ARIA labels on all interactive elements and canvas charts
- `aria-live="polite"` on toast notification container and live estimate
- `aria-selected` state on calculator step tabs
- Keyboard-navigable form controls
- Sufficient color contrast ratios on all text

---

## 📱 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | 2-column dashboard + hero visual, 3-column tips |
| Tablet (768–1023px) | 1-column dashboard, 2-column tips, tracker stacked |
| Mobile (480–767px) | All single column, compact spacing |
| Small mobile (< 480px) | Step labels hidden, condensed step connectors |

---

## 🎨 Design System

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deepest` | `#050f0c` | Page background |
| `--bg-deep` | `#0d1f1a` | Section backgrounds |
| `--bg-surface` | `#1a3a2e` | Card surfaces |
| `--accent` | `#00e676` | Primary accent (electric emerald) |
| `--amber` | `#ffa726` | Secondary accent (warnings, streaks) |
| `--text-primary` | `#e8f5e9` | Main text |
| `--text-muted` | `#558b6e` | Subdued text |

### Typography
- **Headings**: [Outfit](https://fonts.google.com/specimen/Outfit) — weights 300–900
- **Body**: [Inter](https://fonts.google.com/specimen/Inter) — weights 300–600

### Visual Effects
- **Glassmorphism cards**: `backdrop-filter: blur(20px)` with semi-transparent backgrounds
- **Glow effects**: `box-shadow` with accent color at 25% opacity
- **Gradient text**: Linear gradient clipped to text on headings
- **Scroll reveal**: `IntersectionObserver`-driven fade-up animations
- **Micro-animations**: Hover lifts, spring-eased checkbox toggles, flame flicker

---

## 🌐 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Edge 90+ | ✅ Full |
| Safari 14+ | ✅ Full (backdrop-filter supported) |
| Opera 76+ | ✅ Full |
| IE 11 | ❌ Not supported |

> **Note:** `backdrop-filter` (glassmorphism) requires a Chromium-based browser or Safari 14+. On Firefox, cards will render without the blur effect but remain fully functional.

---

## 📚 Data Sources & References

| Source | Used For |
|--------|----------|
| [IPCC Sixth Assessment Report (AR6), 2022](https://www.ipcc.ch/ar6-syr/) | Emission factors, climate targets |
| [IEA CO₂ Emissions from Fuel Combustion, 2023](https://www.iea.org/data-and-statistics) | Per-capita national averages |
| [US EPA Emission Factors Hub](https://www.epa.gov/climateleadership/ghg-emission-factors-hub) | Transport & energy factors |
| [UK DESNZ Greenhouse Gas Conversion Factors, 2023](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023) | Electricity & heating factors |
| [Our World in Data — CO₂ per capita](https://ourworldindata.org/co2-per-capita) | Benchmark reference values |

---

## 🤝 Contributing

This project is a single-developer educational tool. If you'd like to contribute:

1. Fork or clone the repository
2. Make your changes to `index.html`, `style.css`, or `app.js`
3. Test by opening `index.html` in a browser
4. Update this `README.md` if adding new features or changing emission factors

---

## 📄 License

MIT License — free to use, modify, and distribute with attribution.

---

<div align="center">

**Built for a cooler planet 🌍**

*EcoTrack · 2026 · All data stored locally · No tracking · No ads*

</div>
