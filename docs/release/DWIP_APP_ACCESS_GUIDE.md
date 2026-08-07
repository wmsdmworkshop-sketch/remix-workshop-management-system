# App Access Reviewer Guidance for AiVaahan DWIP

**Application**: AiVaahan DWIP (`com.aivaahan.dwip`)  
**Developer**: Sayeed Jaffer (`arhaanj@gmail.com`)  
**Production ERP**: `https://devanand.aivaahan.com`

---

## 1. App Access Instructions for Google App Reviewers

AiVaahan DWIP requires user authentication to access its core enterprise workshop management, vehicle intake (VOS), and roadside breakdown features.

### Play Console Configuration Steps:
1. Log into **Google Play Console**.
2. Go to **Policy and programmes -> App content -> App access**.
3. Select **All or some functionality is restricted**.
4. Click **Add new instructions**.

---

## 2. Reviewer Account Credential Configuration Guidance

> **IMPORTANT**: In accordance with enterprise security policies, temporary testing credentials must be generated directly from the admin dashboard before Play Console release submission.

### Template Instructions for Play Console Submission:
- **Title**: `Standard Workshop Reviewer Account`
- **Username / Email**: `<INSERT_DEMO_REVIEWER_EMAIL_FROM_ADMIN_PANEL>`
- **Password**: `<INSERT_DEMO_REVIEWER_PASSWORD_FROM_ADMIN_PANEL>`
- **Any other instructions**:
  - Log in using the credentials above.
  - The default home screen displays the Workshop Dashboard.
  - To test Vehicle Operational System (VOS), tap **Gate Entry** → **New Intake**.
  - To test QRT Breakdown, tap **Breakdowns** → **Active Cases**.
  - No 2FA / OTP is required for this demo reviewer account.
