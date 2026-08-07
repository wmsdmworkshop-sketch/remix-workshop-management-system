---
Document ID: [Document ID]
Title: [Title]
Version: [Version]
Status: [Status]
Owner: [Owner]
Reviewer: [Reviewer]
Created Date: [YYYY-MM-DD]
Updated Date: [YYYY-MM-DD]
Dependencies: [Dependencies]
Description: [Description]
---

# API Endpoint Specification Template

**Endpoint**: `[METHOD] /api/path`  
**Auth Required**: Yes / No  

---

## Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Request Body
```json
{
  "key": "value"
}
```

## Response Body (200 OK)
```json
{
  "success": true,
  "data": {}
}
```
