# DWIP Known Limitations
**System Constraints & Boundaries**

* **Database Driver Lock**: Relies on single-node synchronisation. Simultaneous writes to `workshop_db.json` across distinct local server instances may lock.
* **Vitest Suite Dependency**: The unit tests for older workflow strategies expect a mocked database instance in testing mode, resulting in failures if executed without active DB connections.
