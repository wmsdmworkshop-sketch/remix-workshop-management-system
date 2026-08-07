# Code Statistics

This document displays key volume and size metrics for the Devanand Workforce 1.1 LTS codebase.

## 1. Codebase Volume
- **Total React Components**: **58** (under `src/components/`)
- **Total REST APIs**: **46** (mapped inside `server.ts` and `src/customer-portal/`)
- **Total Database Tables**: **15** (mapped inside schemas and `src/db/sync.ts`)
- **Total React Hooks**: **2** main custom hooks (`useEffect` polling, theme settings).

## 2. File Size Metrics

### Largest Components
1. `JobCardManager.tsx`: **187 kB** (~4000 lines)
2. `EmployeeDirectory.tsx`: **75 kB** (~1600 lines)
3. `GateEntryManager.tsx`: **70.1 kB** (~1500 lines)
4. `ActiveBayTatMonitor.tsx`: **69.8 kB** (~1500 lines)

### Largest General Files
1. `server.ts`: **349 kB** (~8400 lines)
2. `src/App.tsx`: **94 kB** (~2250 lines)

## 3. Refactoring Candidates
1. **server.ts**: Should be split into modular route files.
2. **JobCardManager.tsx**: Ideal candidate for functional splitting.
