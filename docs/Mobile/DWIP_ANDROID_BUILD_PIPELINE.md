# DWIP Enterprise Android Build Pipeline & Release Guide

**Application Identity**:
- **Application Name**: AiVaahan DWIP
- **Package Name**: `com.aivaahan.dwip`
- **Current Version**: `v1.0.0-RC1` (`versionCode: 10000`)
- **Production ERP**: `https://devanand.aivaahan.com`

---

## 1. Prerequisites

- Node.js 20+ & `npm`
- Java Development Kit (JDK 17+)
- Android SDK (API Level 34 / Android 14)
- Capacitor CLI (`@capacitor/cli`)

---

## 2. Step-by-Step Android Release Build Pipeline

### Step 1: Execute Production Web Build
```bash
npm run build
```
Generates production web bundle in `dist/`.

### Step 2: Sync Web Assets to Android Platform
```bash
npx cap sync android
```
Copies `dist/` web output into `android/app/src/main/assets/public/` and updates plugin bindings.

### Step 3: Open Project in Android Studio (Optional)
```bash
npx cap open android
```

### Step 4: Generate Signed Release Android App Bundle (.aab)
Using Gradle command line:
```bash
cd android
./gradlew bundleRelease
```
Output location:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 3. Production Keystore Configuration

Ensure the following environment variables are set during CI/CD build execution:

```bash
export KEYSTORE_FILE="/path/to/aivaahan-release.keystore"
export KEYSTORE_PASSWORD="<SECRET_PASSWORD>"
export KEY_ALIAS="aivaahan-release"
export KEY_PASSWORD="<SECRET_PASSWORD>"
```

---

## 4. Play Console Closed Beta Submission

1. Log into **Google Play Console**.
2. Select **AiVaahan DWIP (`com.aivaahan.dwip`)**.
3. Navigate to **Testing -> Closed testing**.
4. Create a new release and upload `app-release.aab`.
5. Upload `mapping.txt` for R8 obfuscation de-tracing located at:
   `android/app/build/outputs/mapping/release/mapping.txt`.
6. Submit for review and publish to Dealership Pilot tester group.
