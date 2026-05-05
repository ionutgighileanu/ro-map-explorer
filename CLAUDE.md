# RO-MAP Explorer

## Despre proiect
GIS dashboard interactiv pentru România. Stack: Next.js 14+, TypeScript, Tailwind CSS, Mapbox GL JS v3.x, shadcn/ui.

## Regulă critică
UI-ul este FINALIZAT (vezi components/modules/*.tsx, components/app-sidebar.tsx, components/sidebar-*.tsx, components/color-picker.tsx).
NU modifica clase CSS, structura JSX, ordine elemente, layout sau stilul vizual.
Modifică DOAR logica: hooks, state management, fetch-uri, interacțiune cu Mapbox.
Excepție: se pot adăuga elemente UI NOI cerute explicit (dropdown autocomplete pentru waypoints, login screen, dropdown pentru export PNG/JPEG) menținând coerența vizuală cu restul.

## Arhitectura țintă
- `app/page.tsx` — entry point, wrappează MapProvider + AuthProvider
- `app/login/page.tsx` — login screen cu parolă fixă
- `context/map-context.tsx` — instanța Mapbox (useMap)
- `context/map-layers.tsx` — registru source/layer cu re-hydrate la map.setStyle()
- `context/auth-context.tsx` — auth simplu (sessionStorage)
- `lib/gemini.ts` — fallback AI pentru rute când Mapbox Directions nu poate
- `components/modules/*.tsx` — modulele sidebar (UI gata, logica de adăugat)
- `public/data/*.geojson` — date locale

## Convenții
- Token Mapbox: `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`
- Gemini key: `process.env.NEXT_PUBLIC_GEMINI_KEY`
- Parolă app: `process.env.NEXT_PUBLIC_APP_PASSWORD`
- `preserveDrawingBuffer: true` OBLIGATORIU în constructorul Map
- Verifică `map.getSource('id')` înainte de addSource pentru a evita duplicate
- Token pentru Geocoding/Directions trebuie să aibă scope-urile corespunzătoare

---

## STRUCTURA SIDEBAR — 5 module ordonate

### 1. Markers
Input pentru nume marker + lista de markers cu accordion-uri.
**Per marker:** name, lat (43-48), lng (22-30), altitude (0-2000), style (PointCtrl), label (LabelCtrl).
**PointCtrl:** color, size (1-100), shadow on/off (blur 0-30, color), outline on/off (color, thickness 1-10).
**LabelCtrl:** enabled, position (top/bottom/left/right), bgColor, textColor, primary text, secondary text.
Implementare hartă: marker custom DOM (div) cu shadow box-shadow, outline border, label absolute pozitionată pe baza setării.

### 2. STB Routes
Input search "Line number (e.g. 41, 205)" — **suportă comma separation** ("41, 104, 205" → 3 items).
**Per rută:** line (string), style (LineCtrl).
Filtru Mapbox pe `stb-all-routes.geojson`: `['==', ['get', 'line'], '41']`.

### 3. Route Planner
- Accordion "Route Line Settings" cu LineCtrl pentru linia globală a traseului
- Input "Add waypoint..." (max 25 waypoints) — **suportă geocoding cu autosuggest**
- Lista waypoints cu PointCtrl per waypoint (color, size, shadow, outline, label)
- Buton "Calculate Route" (activ când waypoints >= 2)

**Flux principal:**
1. User scrie text în input → debounce 300ms → Mapbox Geocoding API (country=ro, limit=5)
2. Dropdown sub input cu sugestii (NEW UI element)
3. Click sugestie → waypoint cu { name, lng, lat }
4. Comma separation: "București, Pitești, Sibiu" → geocodează secvențial fiecare
5. La click "Calculate Route" → Mapbox Directions API → linie pe hartă

**Fallback Gemini** (când Mapbox Directions nu poate):
- Cazul 1: utilizatorul vrea traseul unui drum (ex: input "A1") → Gemini generează waypoints intermediare → Directions API conectează
- Cazul 2: Directions API returnează eroare → Gemini propune locații alternative
- Indicator subtil "Route generated via AI" sub lista de waypoints

### 4. Infrastructure
Input "Road ID (A, DN, E, DJ...)" — **suportă comma separation**.
**Per drum:** name (uppercased), style (LineCtrl).
Highlight pe hartă folosind Mapbox vector tiles built-in:
- source: 'composite' (built-in, NU adaugi source)
- 'source-layer': 'road'
- filter: ['==', ['get', 'ref'], road.name]
Limitare: nu toate DJ-urile sunt în vector tiles. Pentru trasee complete pe drumuri (A1, DN1) → folosește Gemini fallback (vezi Route Planner).

### 5. Borders
3 sub-accordion-uri:

#### a) Countries
Input "Search country..." cu **autosuggest pe `name` din all-countries.geojson**.
Per country adăugat: ColorPicker + ModeToggle (filled / shape).
Filtru Mapbox: `['==', ['get', 'iso3'], 'ROU']`.

#### b) Jud.RO (42 județe)
Dropdown cu cele 42 județe din JUDETE constant + ColorPicker pentru selecție + buton Add.
Buton "Select All" / "Deselect All" în extra (header).
Per județ: ColorPicker, ModeToggle (filled / shape), delete.
Filtru Mapbox pe `romania-counties.geojson`: `['==', ['get', 'name'], 'Cluj']` cu county ascii (vezi mapping mai jos).

**ATENȚIE — ascii vs diacritice:**
UI-ul folosește forme ASCII: `Bistrita-Nasaud`, `Caras-Severin`, `Dambovita`, `Valcea`, `Bacau` etc.
GeoJSON-ul folosește diacritice: `Bistrița-Năsăud`, `Caraș-Severin`, `Dâmbovița`, `Vâlcea`, `Bacău`.
Codul TREBUIE să normalizeze sau să folosească un mapping.

#### c) București
- "Full" — toggle on/off, ModeToggle (filled / shape), ColorPicker — pentru `bucuresti-full.geojson`
- "Sectoare (N/6)" sub-accordion — 6 sectoare cu toggle on/off PER sector + ModeToggle + ColorPicker INDIVIDUAL
- Buton "Select All" / "Deselect All" sectoare în extra
Filtru pe `bucuresti-sectors.geojson`: `['==', ['get', 'name'], 'Sectorul 1']`.

---

## CONTROLE GLOBALE FOOTER (sub modulele sidebar)

### Place Labels Toggle (slide switch)
- State: `placeLabels: boolean` (default `true`)
- Componenta: `Toggle` cu label "Place Labels"
- Controlează vizibilitatea TUTUROR etichetelor native Mapbox: orașe, sate, POI-uri, drumuri, ape, regiuni administrative

**Implementare Mapbox:**
- Iterează prin toate layer-urile cu `map.getStyle().layers`
- Pentru fiecare layer cu `type === 'symbol'`: `map.setLayoutProperty(layer.id, 'visibility', placeLabels ? 'visible' : 'none')`
- IMPORTANT: La schimbarea stilului hărții (`map.setStyle()`), layer-urile noi sunt cu visibility default — TREBUIE re-aplicat starea curentă a `placeLabels` în handler-ul `style.load`
- Hook recomandat: `usePlaceLabels(map, placeLabels)` care ascultă atât schimbarea state-ului cât și `style.load`

**Atenție:** NU afectează etichetele markerilor custom adăugați de utilizator (cele create cu `LabelCtrl` din modulul Markers) — acelea sunt elemente DOM separate, nu layer-uri Mapbox.

### Buton Export
- Deasupra zoom + style buttons
- Click → dropdown cu "Export as PNG" / "Export as JPEG"
- Output fix la 1920x1080 pixeli
- Implementare cu hartă ascunsă (vezi secțiunea Export mai jos)

### Buton Zoom (+/-)
- Zoom in / Zoom out pe map.zoomIn() / map.zoomOut()

### Buton Standard / Satellite
- Switch între `mapbox://styles/mapbox/dark-v11` și `mapbox://styles/mapbox/satellite-streets-v12`
- Folosește `map.setStyle()` pe instanța existentă (NU recrea harta)
- IMPORTANT: la `style.load` re-aplică Place Labels visibility + re-hydrate sources/layers din useMapLayers

---

## TERMINOLOGIE UI vs MAPBOX
UI folosește terminologia: **filled** și **shape**.
- `filled` → Mapbox layer `type: 'fill'` cu fill-color + fill-opacity
- `shape` → Mapbox layer `type: 'line'` cu line-color + line-width

Toate fișierele cu Polygon/MultiPolygon suportă AMBELE moduri din același source.
Pentru fiecare entitate, adaugă layers în funcție de modul activ:
- Mod "filled": un singur layer fill
- Mod "shape": un singur layer line
- Switch între moduri: removeLayer-ul vechi + addLayer-ul nou

Nu sunt necesare geometrii LineString separate — Mapbox derivă conturul din poligon nativ.

---

## EXPORT (1920×1080, doar harta)

Butonul Export captează DOAR harta (fără sidebar) la rezoluție fixă 1920×1080.

**Abordare tehnică:**
1. Creează un div ascuns (position: absolute, left: -9999px, width: 1920px, height: 1080px)
2. Creează O A DOUA instanță Mapbox în acel div, cu același style/center/zoom/bearing/pitch ca harta principală
3. `preserveDrawingBuffer: true` și `interactive: false`
4. Copiază TOATE source-urile și layer-urile active de pe harta principală (iterează prin registrul useMapLayers)
5. Aplică Place Labels visibility la fel ca pe harta principală (dacă placeLabels=false, ascunde și pe harta ascunsă)
6. Așteaptă `load` + `idle`
7. `hiddenMap.getCanvas().toDataURL('image/png' sau 'image/jpeg', 0.95)` → trigger download
8. Cleanup: `hiddenMap.remove()` + șterge div-ul

**Feedback vizual:**
- Flash alb 0.4s DOAR pe zona hărții
- Toast "Map exported successfully" (sonner)
- Spinner pe buton cât se procesează

---

## GEOJSON-URI LOCALE — PROPRIETĂȚI REALE

### `romania-border.geojson`
- 1 feature MultiPolygon (granița țării)
- Suportă: filled, shape

### `romania-counties.geojson`
- 3186 features (TOATE UAT-urile)
- Proprietăți: `name` (cu diacritice), `county` (cu diacritice), `natLevName`, `natcode`
- Pentru filtrarea județelor (din UI) trebuie: normalizare diacritice + filtru pe proprietatea `county`
- Recomandare: la mount, generează un Map<asciiName, geometry> pentru filtrare rapidă
- Suportă: filled, shape

### `bucuresti-full.geojson`
- 1 feature Polygon, `name="București"`
- Suportă: filled, shape

### `bucuresti-sectors.geojson`
- 6 features Polygon
- Proprietăți: `name="Sectorul N"`, `sector=1...6`, `natcode`, `full_name`
- UI afișează "Sector 1", dar GeoJSON conține "Sectorul 1" — atenție la filtru
- Mapping: UI `Sector N` → GeoJSON filter `Sectorul N` (înlocuire string)
- Suportă: filled, shape (PER SECTOR, individual)

### `stb-all-routes.geojson`
- 147 features LineString/MultiLineString
- Proprietăți: `route_id`, `line`, `name`, `ref` (toate trei = numărul "41"), `long_name`, `type` (bus/tram/trolleybus), `color` (#hex official)
- Suportă doar line layer (rute de transport)
- 15 tramvaie + 16 troleibuze + 116 autobuze

### `all-countries.geojson`
- 248 features Polygon/MultiPolygon
- Proprietăți: `name` (EN, ex "Romania"), `iso2` ("RO"), `iso3` ("ROU"), `A3` (= iso3)
- UI Countries: autosuggest pe `name` (English), filtru pe `iso3`
- Suportă: filled, shape

---

## MAPPING JUDEȚE UI ASCII → GEOJSON

UI folosește (din JUDETE const):
Alba, Arad, Arges, Bacau, Bihor, Bistrita-Nasaud, Botosani, Braila, Brasov,
Bucuresti, Buzau, Calarasi, Caras-Severin, Cluj, Constanta, Covasna,
Dambovita, Dolj, Galati, Giurgiu, Gorj, Harghita, Hunedoara, Ialomita, Iasi,
Ilfov, Maramures, Mehedinti, Mures, Neamt, Olt, Prahova, Salaj, Satu Mare,
Sibiu, Suceava, Teleorman, Timis, Tulcea, Valcea, Vaslui, Vrancea

Strategia recomandată în cod:
- normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
- La filtrare: filter: ['==', ['downcase', ['get', 'county']], normalize(uiName).toLowerCase()]
SAU pre-procesare la load: build Map<asciiName, FeatureCollection> și folosește-l ca source dedicat per județ.

---

## COMENZI
- `npm run dev` — development server (http://localhost:3000)
- `npm run build` — verificare erori TypeScript
- `Ctrl+C` în terminal — oprește serverul

---

## ORDINE IMPLEMENTARE RECOMANDATĂ
1. Login screen + AuthContext (DONE)
2. MapContext + useMapLayers (fundația)
3. Place Labels toggle (usePlaceLabels hook)
4. Borders / Romania border + Countries (cel mai simplu — testează pattern-ul)
5. Borders / Județe (cu mapping ascii)
6. Borders / București (Full + Sectoare individuale)
7. Markers (custom DOM markers cu label/shadow/outline)
8. STB Routes (comma split + filter)
9. Infrastructure (vector tiles + comma split)
10. Route Planner (Geocoding + Directions + Gemini fallback)
11. Export PNG/JPEG la 1920×1080 (hartă ascunsă)
12. Polish + verificare finală