# Production Readiness Checklist

This document tracks readiness validations for Devanand Workforce 1.1 LTS.

## 1. Production Validation Check

- `[x]` **Environment Variables**: `JWT_SECRET` and `CUSTOMER_JWT_SECRET` are separated. `DB_HOST` points to target MySQL instance.
- `[x]` **Cloud Run Compatibility**: Monolithic Express build `server.cjs` containerizes correctly.
- `[x]` **Railway Compatibility**: Built successfully and connected via active database proxy port.
- `[x]` **Customer Portal Separation**: Build process creates independent folder `dist/customer-portal/`.
- `[x]` **Build Profiles**: `build:rc1` and `build:dev` profiles created and validated.
- `[x]` **Security Hardening**: Excluded routes are protected by compilation flags and runtime routing guards.
- `[x]` **Authentication Integrity**: JWT session sync loops operational.
- `[x]` **Rollback Plan**: Previous stable image tagged on container registry ready to be swapped if production bugs are discovered.
- `[x]` **Backup Strategy**: Database backup dump cron automated on MySQL cluster.
