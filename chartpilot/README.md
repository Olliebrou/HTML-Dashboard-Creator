# ChartPilot — Visual Dashboard Builder

**ChartPilot** is a free, fully browser-based dashboard builder. Create beautiful, interactive charts and dashboards without writing a line of code — then export your work as a portable JSON file.

🔗 **[Live demo → https://olliebrou.github.io/HTML-Dashboard-Creator/](https://olliebrou.github.io/HTML-Dashboard-Creator/)**

---

## ✨ Features

| Feature | Details |
|---|---|
| **6 chart types** | Bar, Line, Pie, Doughnut, Radar, Scatter |
| **Drag & resize** | Freely position and resize widgets on the canvas |
| **Data sources** | Paste CSV text, upload a CSV file, or fetch from a JSON API |
| **Properties panel** | Edit title, chart type, data source, columns, and colour palette per widget |
| **Undo / Redo** | 50-step history for every change |
| **Export / Import** | Save your full dashboard as a `.json` file and reload it later |
| **Preview mode** | Full-screen preview hides the editor chrome |
| **JSON code editor** | View and hand-edit the raw dashboard config with Monaco (VS Code's editor) |
| **Dark & light themes** | Toggle between dark (default) and light mode |
| **No backend required** | Runs entirely in the browser — nothing is sent to a server |

---

## 🖥️ Screenshots

### Dashboard canvas

Add widgets, drag them around, and resize them to build your layout.

### Properties panel

Click any widget to edit its title, chart type, data columns, and colour palette.

### Data Sources view

Connect charts to real data by pasting CSV, uploading a file, or providing an API URL.

### Code / JSON view

Inspect or directly edit your full dashboard configuration as JSON.

---

## 🚀 Getting Started (local development)

### Prerequisites

- [Node.js](https://nodejs.org/) 22+ (see `.nvmrc`)
- npm 9+

### Install & run

```bash
# Clone the repository
git clone https://github.com/Olliebrou/HTML-Dashboard-Creator.git
cd HTML-Dashboard-Creator/chartpilot

# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev
```

### Other commands

```bash
npm run build    # Production build → chartpilot/dist/
npm run preview  # Serve the production build locally
npm run lint     # ESLint type-checked linting
```

---

## 📖 Usage Guide

### Creating your first dashboard

1. Open the app — you land on the **Dashboard** view with an empty canvas.
2. Click **Add Widget** and choose a chart type (Bar, Line, Pie, etc.).
3. Give the widget a title (optional) and click **Add Widget** in the modal footer.
4. The widget appears on the canvas with sample data — **drag it by the grip icon** and **resize from the bottom-right corner**.

### Connecting real data

1. Switch to the **Data** view in the left rail.
2. Click **Add Source** and choose one of three input methods:
   - **Manual / CSV Text** — paste comma-separated data directly (first row = column headers).
   - **CSV File Upload** — drag-and-drop or browse to a `.csv` file.
   - **API / URL** — enter a URL that returns a JSON array of objects.
3. After saving, go back to the **Dashboard** view, click a widget to select it, then use the **Properties panel** (right side) to pick your data source and choose which columns drive the chart labels and values.

### Saving and sharing a dashboard

- **Export** (⬇ icon in the top bar) — downloads the full dashboard as a `.json` file.
- **Import** (⬆ icon) — loads a previously exported `.json` file.

### Keyboard & UI shortcuts

| Action | How |
|---|---|
| Undo | `Ctrl+Z` or the ↩ button in the top bar |
| Redo | `Ctrl+Y` or the ↪ button in the top bar |
| Close modal | `Escape` key or click outside the modal |
| Preview mode | ▶ button in the top bar |
| Exit preview | **Exit Preview** button |
| Delete widget | Select widget → **Delete Widget** in Properties panel, or X button on the widget card |

---

## 🏗️ Project Structure

```
chartpilot/
├── src/
│   ├── components/
│   │   ├── common/          # Modal, Panel
│   │   ├── layout/          # AppLayout, LeftRail, TopBar, PropertiesPanel
│   │   ├── modals/          # AddWidgetModal, AddDataSourceModal
│   │   ├── views/           # DashboardView, DataView, CodeView
│   │   └── widgets/         # ChartWidget, WidgetCard
│   ├── lib/
│   │   ├── chartSetup.ts    # Chart.js global registration
│   │   ├── colors.ts        # Built-in colour palettes
│   │   ├── csvParser.ts     # RFC-compliant CSV parser
│   │   └── dataUtils.ts     # WidgetConfig → Chart.js data mapper
│   ├── stores/
│   │   ├── dashboardStore.ts  # Widgets, data sources, undo/redo, import/export
│   │   └── uiStore.ts         # View selection, panel state, preview mode
│   ├── types/
│   │   └── index.ts         # All shared TypeScript types
│   ├── App.tsx
│   ├── index.css            # CSS custom-property design system
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

### Key technology choices

| Library | Role |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety across the entire codebase |
| **Vite 7** | Dev server and production bundler |
| **Zustand 5** | Lightweight global state (with `useShallow` for stable selectors) |
| **Chart.js 4 + react-chartjs-2** | Chart rendering |
| **react-grid-layout 2** | Draggable/resizable widget grid |
| **@monaco-editor/react** | VS Code–style JSON editor |
| **sonner** | Toast notifications |
| **lucide-react** | Icon set |

---

## 🌐 Deployment (GitHub Pages)

The app is automatically built and deployed to GitHub Pages via **GitHub Actions** whenever code is pushed to the `main` branch.

### How it works

1. The workflow (`.github/workflows/deploy.yml`) runs on push to `main`.
2. It installs dependencies, lints, and builds the app inside `chartpilot/`.
3. The contents of `chartpilot/dist/` are uploaded as a Pages artifact.
4. GitHub deploys the artifact to `https://olliebrou.github.io/HTML-Dashboard-Creator/`.

### Enable GitHub Pages (one-time setup)

1. Go to **Settings → Pages** in your GitHub repository.
2. Under **Source**, select **GitHub Actions**.
3. Push a commit to `main` — the workflow will build and deploy automatically.

### Manual deployment

You can also build and deploy manually:

```bash
cd chartpilot
npm run build
# Then copy chartpilot/dist/ to your web server
```

---

## 🤝 Contributing

1. Fork the repository and create a feature branch.
2. Make your changes inside `chartpilot/src/`.
3. Run `npm run lint` and `npm run build` to verify your changes.
4. Open a pull request — the CI workflow will lint and build automatically.

---

## 📄 Licence

MIT — free to use, modify, and distribute.

