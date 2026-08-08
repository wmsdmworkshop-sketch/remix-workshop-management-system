# DWIP V1 – DEPENDENCY BASELINE & LOCKFILE SPECIFICATION

**Application:** Devanand Workshop Intelligence Platform (DWIP V1)  
**Release Tag:** `v1.0.0-rc2.1`  
**Git Commit:** `3a1dcd941b8fda890ffae46700f46d4ea597d2c8`  
**Lockfile Checksum:** `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`  

---

## 1. Core Runtimes & Build Tools

| Runtime / Engine | Fixed Baseline Version | Verification |
| :--- | :--- | :--- |
| **Node.js** | `v20.20.2` (LTS Iron) | Container Dockerfile Builder |
| **npm** | `10.8.2` | Clean `npm ci` lockfile installation |
| **TypeScript** | `~5.7.2` | Compiler Strict Mode Enabled |
| **Vite** | `^6.0.5` | Bundler & Metadata Injection Plugin |
| **@tailwindcss/vite** | `^4.0.0` | UI Styling Pipeline |

---

## 2. Framework & Library Baseline

| Library | Baseline Version | Purpose / Role |
| :--- | :--- | :--- |
| **React** | `^18.3.1` | UI Component Framework |
| **React DOM** | `^18.3.1` | DOM Rendering Engine |
| **Express** | `^4.21.2` | Backend REST API Server |
| **Drizzle ORM** | `^0.38.3` | Schema & Type-Safe Query Builder |
| **mysql2** | `^3.12.0` | Production MySQL Database Driver |
| **jsonwebtoken** | `^9.0.2` | JWT Token Generation & Verification |
| **bcryptjs** | `^2.4.3` | Password Hashing & Security Verification |
| **lucide-react** | `^0.469.0` | System Iconography |

---

## 3. Dependency Freeze Policy

1. **Zero Unpinned Minor/Patch Upgrades:** `npm install` without explicit security vulnerability patch is strictly prohibited on production `main` branch.
2. **Lockfile Integrity:** `package-lock.json` must be checked into version control and validated via `npm ci` during container build.
