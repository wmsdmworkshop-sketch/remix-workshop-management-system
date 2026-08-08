# Security Runbook — Scrub Leaked Secrets from Git History

Hardcoded database passwords and JWT secrets were committed to this repository
while the Cloud SQL instance accepted public connections. The current tree has
been cleaned (see the `security:` commits), **but the secrets remain in git
history** until this procedure is run.

> **This does not un-leak the secrets.** They must be treated as compromised and
> **rotated** regardless (see [Rotation & reset](#rotation--reset)). History
> scrubbing only removes the artifacts so they can't be re-leaked to new clones.

---

## 0. Prerequisites & warnings

- Rewriting history **changes every commit SHA** from the first affected commit
  onward. Everyone with a clone must **re-clone**; open PRs/branches on old SHAs
  break; CI/deploys pinned to old SHAs need updating. **Coordinate with your team.**
- Run on a **fresh mirror clone**, never your working repo.
- Requires [`git-filter-repo`](https://github.com/newren/git-filter-repo):
  `pip install git-filter-repo` (or `brew install git-filter-repo`).

---

## 1. Build the replacements file (LOCAL ONLY — never commit)

`replacements.txt` is gitignored. Create it next to the mirror clone with one
`secret==>replacement` per line. Fill in the **real** values — they are already
in your `.env` / old history; this file just tells the tool what to strip:

```text
<PROD_DB_PASSWORD>==>***REMOVED***
<PILOT_DB_PASSWORD>==>***REMOVED***
<PILOT_JWT_SECRET>==>***REMOVED***
<PILOT_CUSTOMER_JWT_SECRET>==>***REMOVED***
<ADMIN_APP_PASSWORD>==>***REMOVED***
<DEV_APP_PASSWORD>==>***REMOVED***
```

Optionally also add the seed passwords (the defaults handed out by the seeders in
`server.ts` / `StartupSchemaValidator.ts`) and the bcrypt hashes documented in
`releases/*.md` if you want those gone too.

> A ready-to-use `replacements.txt` with the real values was generated into your
> local scratchpad by the assistant — copy it next to the mirror clone.

## 2. Fresh mirror clone

```bash
cd <somewhere outside your working repo>
git clone --mirror <your-remote-url> wms-scrub.git
cd wms-scrub.git
```

## 3. Rewrite all history

```bash
git filter-repo --replace-text /path/to/replacements.txt
```

Replaces the secrets across every branch and tag.

## 4. Push rewritten history

```bash
git remote add origin <your-remote-url>   # filter-repo drops the remote by design
git push --force --all
git push --force --tags
```

## 5. Everyone re-clones

Old clones are poisoned with stale SHAs. Every collaborator deletes and re-clones.
Update any CI/deploy references to old commit SHAs.

## 6. Verify

```bash
# Grep history for each secret you scrubbed (use your real values); expect 0.
git log --all -p | grep -c "<one of your leaked secrets>"
```

---

## Rotation & reset

History scrubbing is step 3 of 3. The exposure is only closed once you also:

1. **Lock the network** — remove `0.0.0.0/0` from the Cloud SQL instance's
   authorized networks; prefer the Cloud SQL Auth Proxy / Private IP.
2. **Rotate secrets** — new DB root/pilot passwords and new `JWT_SECRET` /
   `CUSTOMER_JWT_SECRET`; store them in Secret Manager, never in a tracked file.
3. **Reset user passwords** — the seeded accounts still carry the old default
   passwords. Run `scripts/reset_user_passwords.cjs` (see below) to reset every
   account still on a known-leaked default to a fresh random password.

### Password reset script

The candidate leaked passwords are passed at runtime via `LEAKED_DEFAULTS` (so
they are never committed). Use your real values:

```bash
# Dry run — reports which accounts still use a leaked default (no changes):
LEAKED_DEFAULTS="<pw1>,<pw2>,<pw3>" node scripts/reset_user_passwords.cjs

# Apply — resets those accounts to fresh random passwords and prints them once:
LEAKED_DEFAULTS="<pw1>,<pw2>,<pw3>" node scripts/reset_user_passwords.cjs --apply
```

It reads DB connection info from the environment (`.env`), only touches accounts
whose current password still matches one of the `LEAKED_DEFAULTS`, and prints each
new temporary password once so you can distribute them and require a reset on
first login.
