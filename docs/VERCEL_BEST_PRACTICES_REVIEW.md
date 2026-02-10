# Vercel React Best Practices - Audit & Umsetzung

Audit des Projekts **Schach PGN-Datenbank** gegen die [Vercel React Best Practices](https://github.com/vercel/next.js/blob/canary/contributing/docs/react-best-practices.md) (57 Regeln in 8 Kategorien).

**Audit-Datum:** 2026-02-10
**Technologie:** React 19 + Vite (kein Next.js) — Server-Side-Regeln (`server-*`) sind nicht anwendbar.

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Umgesetzt / Kein Handlungsbedarf |
| ✅🔧 | Behoben in diesem Audit |
| ⚠️ | Nice-to-have / Geringer Impact |
| ❌ | Noch offen |
| — | Nicht anwendbar für dieses Projekt |

---

## 1. Eliminating Waterfalls (CRITICAL)

| Regel | Status | Datei | Details |
|-------|--------|-------|---------|
| `async-parallel` | ✅ | `hooks/useOpeningLookup.ts:40` | `Promise.all([loadTree(), loadEcoDatabase()])` — paralleler Init |
| `async-parallel` | ✅ | `services/lichessImportService.ts:130` | Chess.com-Archive parallel mit `Promise.all` heruntergeladen |
| `async-defer-await` | ✅ | — | Keine unnötigen sequentiellen Awaits gefunden |
| `async-suspense-boundaries` | ✅ | `App.tsx` | 8 separate `<Suspense>`-Boundaries mit Skeleton-Fallbacks |
| `async-dependencies` | — | — | Keine partiellen Promise-Abhängigkeiten vorhanden |
| `async-api-routes` | — | — | Kein Next.js / keine API Routes im Frontend |

---

## 2. Bundle Size Optimization (CRITICAL)

| Regel | Status | Datei | Details |
|-------|--------|-------|---------|
| `bundle-dynamic-imports` | ✅ | `App.tsx:20-27` | 8 Komponenten per `React.lazy()` geladen (DatabaseList, FilterBar, DatabaseControls, MoveHistory, GameControls, CommentEditor, OpeningDisplay, TagEditor) |
| `bundle-barrel-imports` | ✅ | — | Keine Barrel-Dateien (`index.ts` Re-Exports) vorhanden, alle Imports sind direkt |
| Manual Chunks | ✅ | `vite.config.ts:28-31` | `react-vendor` und `chess-vendor` in separaten Chunks |
| **`bundle-defer-third-party`** | ✅🔧 | `index.html`, `index.css`, `vite.config.ts` | **Behoben 2026-02-10:** Tailwind CDN (~300 KB unkomprimiertes JS) durch Build-Pipeline ersetzt. Tailwind v4 mit `@tailwindcss/vite`-Plugin. Ergebnis: 22 kB CSS (gzip: 5 kB) statt ~300 kB Runtime-JS. Inline-Config und Scrollbar-Styles nach `index.css` migriert. |
| `bundle-conditional` | ⚠️ | `components/DatabaseControls.tsx:3` | `lichessImportService` wird eager importiert, obwohl erst bei User-Interaktion gebraucht. Da `DatabaseControls` selbst lazy-loaded ist, ist der Impact gering. |
| `bundle-preload` | ⚠️ | — | Kein Preloading auf Hover/Focus für lazy-geladene Komponenten. Könnte z.B. die Schachbrett-Chunks bei Hover über eine Partie vorladen. |

---

## 3. Server-Side Performance (HIGH)

| Regel | Status | Details |
|-------|--------|---------|
| `server-*` (alle 7 Regeln) | — | Nicht anwendbar — reine Client-SPA mit Vite, kein SSR/RSC |

---

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

| Regel | Status | Datei | Details |
|-------|--------|-------|---------|
| `client-event-listeners` | ✅ | `App.tsx:246-247` | Keyboard-Listener wird korrekt aufgeräumt (addEventListener/removeEventListener) |
| `client-swr-dedup` | ⚠️ | — | Kein SWR/React Query. Direkte `fetch`-Aufrufe in Services. Für die App-Größe (wenige API-Calls) akzeptabel. Bei Wachstum zu SWR migrieren. |
| `client-passive-event-listeners` | ✅ | — | Keine Scroll-Event-Listener registriert |
| `client-localstorage-schema` | — | — | Kein localStorage, nutzt IndexedDB/PostgreSQL |

---

## 5. Re-render Optimization (MEDIUM)

| Regel | Status | Datei | Details |
|-------|--------|-------|---------|
| **`rerender-derived-state`** | ✅🔧 | `hooks/usePgnDatabase.ts` | **Behoben 2026-02-10:** `getFilteredGames()`, `getSelectedGame()`, `getUniqueOpenings()`, `getUniqueTags()` von `useCallback` + Aufruf im Return zu `useMemo` geändert. Vorher wurden diese bei **jedem Render** neu berechnet, jetzt nur bei Änderung der Abhängigkeiten (`games`, `filters`, `selectedGameId`). |
| **`rerender-memo-with-default-value`** | ✅🔧 | `App.tsx:199-204` | **Behoben 2026-02-10:** Inline-Lambda `onResetPassword={async (token, password) => {...}}` durch `useCallback`-memoisierte `handleResetPassword`-Funktion ersetzt. Verhindert unnötige Re-Renders der `AuthBar`-Komponente. |
| `rerender-functional-setstate` | ✅ | `hooks/useChessGame.ts:241` | `setCurrentIndex(prevIndex => ...)` nutzt korrekt funktionalen Setter |
| `rerender-dependencies` | ✅ | `App.tsx:248` | Keyboard-Effect nutzt `moves.length` (primitiv) statt `moves` (Array-Referenz) |
| `rerender-lazy-state-init` | ✅ | — | Keine teuren initialen State-Berechnungen vorhanden |
| `rerender-derived-state-no-effect` | ⚠️ | `components/CommentEditor.tsx:16-19` | Comment-State wird per `useEffect` aus Props synchronisiert. Könnte durch einen kontrollierten Key-Reset oder Ableitung beim Render ersetzt werden. Geringer Impact da die Komponente selten neu rendert. |
| `rerender-move-effect-to-event` | ⚠️ | `App.tsx:116-122` | Opening-Lookup wird per Effect bei `currentIndex`-Änderung getriggert. Da der Index von mehreren Quellen geändert wird (Keyboard, Click, Buttons), ist ein Effect hier akzeptabel. |
| `rerender-transitions` | ⚠️ | — | Kein `startTransition` für Filter-Eingaben oder Partieauswahl. Bei großen Datenmengen (>500 Partien) könnte dies die Input-Responsivität verbessern. |
| `rerender-use-ref-transient-values` | ✅ | `hooks/useOpeningLookup.ts:34` | `lastLookupRef` korrekt als `useRef` für Deduplizierung genutzt |

---

## 6. Rendering Performance (MEDIUM)

| Regel | Status | Datei | Details |
|-------|--------|-------|---------|
| **`rendering-hoist-jsx`** | ✅🔧 | `App.tsx:13-19` | **Behoben 2026-02-10:** `formatTimeControl()` von innerhalb der Komponente nach außen (Modul-Scope) verschoben. Wird nicht bei jedem Render neu erstellt. |
| `rendering-hoist-jsx` | ✅ | `components/Icons.tsx:4` | `iconProps` korrekt außerhalb der Komponenten im Modul-Scope definiert |
| `rendering-conditional-render` | ✅ | `App.tsx:334` | Ternary `{!selectedGame ? (...) : (...)}` statt `&&` für Hauptbereich |
| `rendering-conditional-render` | ✅ | `App.tsx:274,280` | `{error && (...)}` ist sicher — `error` ist `string\|null`, kein Risiko für `0`/`false`-Rendering |
| `rendering-content-visibility` | ⚠️ | `components/DatabaseList.tsx` | Bei vielen Partien (>100) würde `content-visibility: auto` auf den Tabellenzeilen die Scroll-Performance verbessern. Geringer Impact bei typischen Datenmengen (<2000 Partien). |
| `rendering-svg-precision` | ⚠️ | `components/Icons.tsx` | SVG-Koordinaten haben volle Dezimalpräzision. Reduktion auf 1-2 Nachkommastellen würde wenige Bytes sparen. Vernachlässigbar. |
| `rendering-hydration-*` | — | — | Kein SSR/Hydration, reine Client-SPA |
| `rendering-activity` | — | — | React `<Activity>` ist noch experimentell |

---

## 7. JavaScript Performance (LOW-MEDIUM)

| Regel | Status | Datei | Details |
|-------|--------|-------|---------|
| `js-index-maps` | ✅ | `hooks/useChessGame.ts:206` | Kommentare korrekt als `Map<string, string>` aufgebaut statt wiederholter Array-Suche |
| `js-early-exit` | ✅ | Diverse | Early Returns in `formatTimeControl`, `lookupForPosition`, `handleImport` etc. |
| `js-combine-iterations` | ⚠️ | `hooks/usePgnDatabase.ts:172-209` | 6 sequentielle `.filter()`-Aufrufe in `filteredGames`. Könnte zu einem einzigen Loop kombiniert werden. Bei typischen Datenmengen (<2000 Partien) vernachlässigbar. |
| `js-hoist-regexp` | ⚠️ | `hooks/useChessGame.ts:165` | RegExp `/\[%[^\]]*\]/g` wird innerhalb einer Schleife (Zeile 160-180) bei jedem Kommentar neu erstellt. V8 cached dies intern, aber explizites Hoisting wäre sauberer. |
| `js-set-map-lookups` | ⚠️ | `hooks/usePgnDatabase.ts:204-205` | `filters.tags.some(tag => g.tags.includes(tag))` — bei vielen Tags wäre ein `Set` für O(1)-Lookups besser. Bei typisch wenigen Tags vernachlässigbar. |
| `js-cache-storage` | — | — | Kein localStorage-Zugriff vorhanden |

---

## 8. Advanced Patterns (LOW)

| Regel | Status | Details |
|-------|--------|---------|
| `advanced-init-once` | ✅ | `hooks/useOpeningLookup.ts:37-47` — Tree/ECO einmalig beim App-Start geladen |
| `advanced-event-handler-refs` | — | Nicht benötigt bei aktueller Architektur |
| `advanced-use-latest` | — | Nicht benötigt bei aktueller Architektur |

---

## Zusammenfassung der Änderungen

### Behoben am 2026-02-10

| # | Priorität | Regel | Änderung | Dateien |
|---|-----------|-------|----------|---------|
| 1 | CRITICAL | `bundle-defer-third-party` | Tailwind CDN durch Build-Pipeline ersetzt (v4 + `@tailwindcss/vite`). ~300 KB JS → 22 kB CSS. | `index.html`, `index.css` (neu), `index.tsx`, `vite.config.ts`, `package.json` |
| 2 | HIGH | `rerender-derived-state` | `getFilteredGames()`, `getSelectedGame()` von `useCallback`+Aufruf → `useMemo`. Verhindert Neuberechnung bei jedem Render. | `hooks/usePgnDatabase.ts` |
| 3 | HIGH | `rerender-derived-state` | `getUniqueOpenings()`, `getUniqueTags()` von `useCallback`+Aufruf → `useMemo`. | `hooks/usePgnDatabase.ts`, `App.tsx` |
| 4 | MEDIUM | `rerender-memo-with-default-value` | Inline-Lambda `onResetPassword` → `useCallback` (`handleResetPassword`). | `App.tsx` |
| 5 | MEDIUM | `rendering-hoist-jsx` | `formatTimeControl()` aus Komponente in Modul-Scope verschoben. | `App.tsx` |

### Nice-to-have (offen)

| # | Priorität | Regel | Beschreibung | Aufwand |
|---|-----------|-------|--------------|---------|
| 6 | LOW | `rendering-content-visibility` | `content-visibility: auto` für `DatabaseList`-Tabellenzeilen bei >100 Partien. | Gering |
| 7 | LOW | `js-combine-iterations` | 6 sequentielle `.filter()` in `filteredGames` zu einem Loop kombinieren. | Gering |
| 8 | LOW | `js-hoist-regexp` | RegExp in Comment-Cleaning-Schleife (`useChessGame.ts:165`) hoisten. | Minimal |
| 9 | LOW | `js-set-map-lookups` | Tags-Filter auf `Set`-Lookup umstellen. | Minimal |
| 10 | LOW | `bundle-conditional` | `lichessImportService` per dynamischem `import()` erst bei Interaktion laden. | Gering |
| 11 | LOW | `bundle-preload` | Preloading von lazy Chunks bei Hover über Partieliste. | Mittel |
| 12 | LOW | `rerender-derived-state-no-effect` | Comment-State in `CommentEditor` ohne Effect ableiten. | Gering |
| 13 | LOW | `rerender-transitions` | `startTransition` für Filter-Eingaben bei großen Datenmengen. | Gering |

### Build-Vergleich (vorher/nachher)

**Vorher:** Tailwind CDN wird zur Laufzeit geladen (~300 kB JS, Render-blocking).

**Nachher:**
```
dist/assets/index.css              22.29 kB │ gzip:  5.07 kB  (Tailwind Build)
dist/assets/react-vendor.js        11.32 kB │ gzip:  4.07 kB
dist/assets/chess-vendor.js       108.11 kB │ gzip: 33.92 kB
dist/assets/index.js              220.60 kB │ gzip: 69.02 kB
dist/assets/eco-openings.js       506.50 kB │ gzip: 70.50 kB
+ 8 lazy-geladene Chunks (1-8 kB je)
```
