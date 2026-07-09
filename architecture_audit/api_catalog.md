# DWIP V1 Express API Catalog

This document details the backend API routes exposed by the Express application in `server.ts`. All protected routes require a JWT token passed in the `Authorization: Bearer <token>` header unless explicitly whitelisted as public.

---

## 1. Authentication & Security Endpoints

### `POST /api/auth/login`
- **Authentication**: Public (Rate-limited)
- **Description**: Validates user credentials. If multi-factor authorization is configured, generates an OTP SMS code and registers an OTP hash in `user_access_master`.
- **Payload**:
  ```json
  {
    "username": "johndoe",
    "password": "Password123"
  }
  ```
- **Response**: Returns either a JSON token object directly or triggers the OTP challenge sequence.

### `POST /api/auth/verify-otp`
- **Authentication**: Public
- **Description**: Validates the 6-digit OTP code against the database `otp_hash` and generates the JWT access token.
- **Payload**:
  ```json
  {
    "username": "johndoe",
    "otp": "123456"
  }
  ```

### `POST /api/auth/reset-password-request`
- **Authentication**: Public
- **Description**: Initiates the password recovery flow and sends an OTP/recovery link to the registered mobile number.

### `POST /api/auth/reset-password-verify`
- **Authentication**: Public
- **Description**: Verifies the recovery challenge and updates the database with the new password hash.

### `GET /api/auth/me`
- **Authentication**: JWT Token Required
- **Description**: Decodes the active session token and returns the current user profile metadata.

---

## 2. Operator & Profile Management

### `GET /api/users`
- **Authentication**: JWT Token Required (Developer, Admin, Dealer Principal only)
- **Description**: Lists all operator profiles registered in `user_access_master`.

### `POST /api/users`
- **Authentication**: JWT Token Required (Developer, Admin, Dealer Principal only)
- **Description**: Registers a new workshop operator profile.

### `PUT /api/users/:user_id`
- **Authentication**: JWT Token Required (Developer, Admin, Dealer Principal only)
- **Description**: Updates an operator's role, permissions, or system status.

### `GET /api/my-profile`
- **Authentication**: JWT Token Required
- **Description**: Fetches detailed employee metadata and any pending profile update request for the logged-in user.

### `POST /api/my-profile`
- **Authentication**: JWT Token Required
- **Description**: Submits contact changes (email, mobile) to the pending profile updates table for HR approval.

### `GET /api/my-profile/settings`
- **Authentication**: JWT Token Required
- **Description**: Retrieves user-specific interface settings.

### `PUT /api/my-profile/settings`
- **Authentication**: JWT Token Required
- **Description**: Updates user custom configurations.

---

## 3. Operations & HR Management

### `GET /api/employees`
- **Authentication**: JWT Token Required
- **Description**: Returns all records in the `employees` table.

### `POST /api/employees`
- **Authentication**: JWT Token Required (Admin, Developer only)
- **Description**: Registers a new technician/employee.

### `PUT /api/employees/:id`
- **Authentication**: JWT Token Required (Admin, Developer only)
- **Description**: Updates employee metadata.

### `DELETE /api/employees/:id`
- **Authentication**: JWT Token Required (Admin, Developer only)
- **Description**: Deletes an employee record.

### `POST /api/employees/bulk`
- **Authentication**: JWT Token Required (Admin, Developer only)
- **Description**: Imports employee data from a CSV dataset.

---

## 4. Workforce Attendance & Shifts

### `GET /api/workforce/attendance`
- **Authentication**: JWT Token Required
- **Description**: Returns all shift attendance logs for the specified date query parameter.

### `POST /api/workforce/attendance`
- **Authentication**: JWT Token Required
- **Description**: Submits check-in or check-out events (biometrics face verification result, GPS coordinates, camera snapshots).

### `GET /api/workforce/attendance/today`
- **Authentication**: JWT Token Required
- **Description**: Returns a dashboard summary showing total technicians, present, absent, on leave, and marking percentages.

---

## 5. Job Cards & Workshop Operations

### `GET /api/job-cards`
- **Authentication**: JWT Token Required
- **Description**: Returns all active and historic job cards from the database.

### `GET /api/vehicle/history`
- **Authentication**: JWT Token Required
- **Description**: Searches service histories and invoice tables matching a VRN (Vehicle Registration Number) or chassis code query.

### `POST /api/job-cards/:jobId/invoice-ocr`
- **Authentication**: JWT Token Required
- **Description**: Runs AI OCR text extraction on uploaded invoice snapshots to automatically populate labor and parts pricing fields.

---

## 6. System Configurations & Maintenance

### `POST /api/db/reload`
- **Authentication**: Public / Developer only
- **Description**: Wipes and reloads mock database configurations.

### `POST /api/db/clear-job-cards`
- **Authentication**: Developer / Admin only
- **Description**: Purges all job cards, rework entries, and carry forwards to restore the workshop database to a clean state.
