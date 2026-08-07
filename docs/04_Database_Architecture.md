# DWIP Database Architecture
**Relational Storage Strategy & Data Sync Operations**

## 1. Relational Model
DWIP maps core automotive business entities to a relational database schema:
* **job_cards**: Tracks job card number, statuses, vehicles, advisor user IDs, and actual time taken.
* **job_technician_maps**: Many-to-many relationship mapping assigned technicians to jobs with split percentages.
* **bays**: Physical workshop bay definitions (Mechanical, Preventive, Electrical) and status indicators.
* **employees**: Database of workshop personnel (certified level, basic salary, mobile numbers).

## 2. In-Memory Data Synchronization
For high availability, local workshop nodes maintain a file-backed JSON database (`workshop_db.json`) synchronized in real time with database pools on transaction commits using the `syncSave()` mechanism.
