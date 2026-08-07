# DWIP v1.0 API Documentation

This document describes the API endpoints exposed by **DWIP v1.0**.

## 1. REST Endpoints

### `/api/jobs`
- **GET**: Returns the active job cards list.
- **POST**: Creates a new job card record (Gate In).
- **PUT**: Modifies target fields on a job card.

### `/api/allocations`
- **POST**: Reassigns technician and bay mappings to job cards.

### `/api/dms/import`
- **POST**: Syncs external DMS records to MySQL local tables.
