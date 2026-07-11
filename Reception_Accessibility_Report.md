# Reception Accessibility Report

## WCAG Compliance & Audit Review

1. **Semantic HTML5 Layouts**:
   - Descriptive heading hierarchies (`h1` to `h5`).
   - Accessible interactive controls using specific native elements (`button`, `select`, `input`, `textarea`).

2. **Aria Labels & Roles**:
   - `aria-label="Job Card Preview Dialog"` & `aria-label="Job Card Invoice Preview Card"` implemented on dialog elements.
   - Screen reader announcements for active states and loading warnings (e.g. `role="alert"` for OCR fail banners).

3. **Color Contrast & Readability**:
   - WCAG AAA/AA compliant text colors (`text-slate-200`, `text-slate-400`, and vivid HSL tailwind green `text-emerald-400`).
   - Clean Outfit / Inter layout fonts matching the mobile layout scales.
