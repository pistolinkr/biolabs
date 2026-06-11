# Biolabs Internationalization — Region Policy

This document defines how Biolabs chooses, stores, and applies UI languages across regions. Implementation lives in `shared/i18n/locales.ts`, `client/src/i18n/`, and `client/src/locales/`.

---

## 1. Goals

1. **UI locale** controls all workstation chrome: labels, menus, settings, toasts, errors, and landing copy.
2. **AI response language** remains a separate setting (`responseLanguage` in AI settings). It controls LLM output only.
3. **Scientific identifiers** (PDB IDs, UniProt accessions, chain IDs, residue numbers, element symbols) are never translated.
4. **Fallback** is always English (`en`) when a key or locale bundle is missing.

---

## 2. Supported UI locales

| Code | Language | Region group | BCP-47 alias |
|------|----------|--------------|--------------|
| `auto` | Browser default | — | resolves to best match |
| `en` | English | Global default | `en`, `en-US`, `en-GB` |
| `ko` | Korean | East Asia | `ko`, `ko-KR` |
| `ja` | Japanese | East Asia | `ja`, `ja-JP` |
| `zh` | Chinese (Simplified) | East Asia | `zh`, `zh-CN`, `zh-Hans` |
| `de` | German | Europe | `de`, `de-DE` |
| `fr` | French | Europe | `fr`, `fr-FR` |
| `es` | Spanish | Americas / Europe | `es`, `es-ES`, `es-MX` |

### Region groups (policy)

| Group | Primary locales | Notes |
|-------|-----------------|-------|
| **East Asia** | `ko`, `ja`, `zh` | Prefer native script in UI; dates use locale `Intl` |
| **Europe** | `de`, `fr`, `es`, `en` | Left-to-right; metric units unchanged |
| **Global fallback** | `en` | Source-of-truth translation file |

---

## 3. Locale resolution (`auto`)

When the user selects **Auto (browser)**:

1. Read `navigator.languages` (fallback `navigator.language`) and `Intl.DateTimeFormat().resolvedOptions().locale`.
2. Match the first **non-English** supported locale by prefix (e.g. `ko-KR` → `ko`, `ja-JP` → `ja`).
3. If only English tags match, use `en`.

**Regional language suggestion (consent required):**

When the system timezone maps to a supported region (e.g. `Asia/Seoul` → Korean) and the **current UI locale differs**, a bottom banner asks whether to switch. The user must click **Switch to …** to apply; **Not now** dismisses and is remembered in `biolabs.locale.suggestion.v1`.

VPN / IP geolocation does **not** change UI language. Regional detection uses **OS timezone** only.

---

## 4. Storage & persistence

| Key | Storage | Value |
|-----|---------|-------|
| `biolabs.locale.v1` | `localStorage` | `{ "uiLocale": "auto" \| "en" \| … }` |
| `biolabs.locale.suggestion.v1` | `localStorage` | `{ "dismissedLocales": ["ko", …] }` — regional prompts the user declined |

- Changing UI language calls `i18n.changeLanguage(resolvedCode)` and updates `<html lang="…">`.
- Workspace snapshot export/import includes `uiLocale` alongside theme and AI settings.
- AI **response language** does not change UI locale (and UI locale changes may optionally sync AI response language from General settings only).

---

## 5. Translation namespaces

| Namespace | Scope |
|-----------|--------|
| `common` | Shared buttons, actions, theme options, tab labels |
| `settings` | Settings modal, AI settings section |
| `header` | App header, export menu, save toasts |
| `landing` | Marketing / entry page |
| `viewport` | Toolbar, HUD, structure viewport messages |
| `assistant` | Chat, residue analysis, explain popovers |
| `workbench` | Left/right panels, input, hierarchy, display |
| `commands` | Command palette entries and categories |
| `errors` | AI and client error messages (by code) |
| `workflow` | Pipeline rail stages and banners |

### Key naming rules

- Use dot-separated paths: `settings.general.appearance`
- Command keys mirror `cmdId`: `commands.items.repr.cartoon.title`
- Error keys mirror server codes: `errors.AI_QUOTA_EXCEEDED`
- Interpolation: `{{count}}`, `{{name}}`, `{{source}}` — never concatenate sentences in code

---

## 6. Formatting

- **Numbers**: `Intl.NumberFormat(resolvedLocale)` for atom counts, FPS, etc.
- **Dates / relative time**: `Intl.RelativeTimeFormat` or locale-aware helpers in `client/src/i18n/format.ts`
- **Units**: Å, kDa, FPS — keep universal symbols; translate labels only (`Atoms`, not `原子` for unit `Å`)

---

## 7. AI vs UI language

| Setting | Controls | Options |
|---------|----------|---------|
| UI locale | All React UI | `auto`, `en`, `ko`, `ja`, `zh`, `de`, `fr`, `es` |
| AI response language | LLM system prompt hint | `auto`, `en`, `ko`, `ja` |

Server prompts use `LANGUAGE_HINTS` in `server/core/ai/promptBuilder.ts`. Client sends `responseLanguage` on each AI request.

---

## 8. Adding a new locale

1. Add code to `SUPPORTED_UI_LOCALES` in `shared/i18n/locales.ts`.
2. Copy `client/src/locales/en/` → `client/src/locales/{code}/`.
3. Translate all namespace JSON files.
4. Register lazy import in `client/src/i18n/index.ts`.
5. Add option to Settings → General → UI language.
6. Update this document.

---

## 9. Quality checklist

- [ ] No hardcoded user-facing strings in components (use `t()`)
- [ ] All namespaces have identical key sets across locales
- [ ] `<html lang>` matches resolved locale
- [ ] Toasts and errors use `errors` or contextual namespace
- [ ] Command palette categories translated
- [ ] Snapshot round-trip preserves `uiLocale`
- [ ] `pnpm check` passes

---

## 10. Out of scope (v1)

- Right-to-left (Arabic, Hebrew)
- Traditional Chinese (`zh-TW`) — map `zh-TW` to `zh` until dedicated bundle
- Server-side UI translation (API returns codes; client translates)
- shadcn/ui primitive aria labels (optional follow-up)
