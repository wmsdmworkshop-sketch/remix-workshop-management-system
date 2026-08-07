# Closed Testing Rollout Plan for AiVaahan DWIP

**Application**: AiVaahan DWIP (`com.aivaahan.dwip`)  
**Version**: `1.0.0-RC1` (`versionCode: 10000`)  
**Developer**: Sayeed Jaffer (`arhaanj@gmail.com`)  
**Production ERP**: `https://devanand.aivaahan.com`

---

## 1. Closed Beta Track Configuration

- **Track Name**: Dealership Pilot Closed Beta
- **Target Audience**: 100 pilot workshop managers, service advisors, technicians, and QRT drivers.
- **Tester Group Email List**: `dwip-dealership-pilots@aivaahan.com` / Google Group opt-in.

---

## 2. Release Execution Timeline

1. **Phase 1: Build & Artifact Preparation**
   - Signed Android App Bundle: `app-release.aab`
   - R8 Obfuscation Mapping: `mapping.txt`
2. **Phase 2: Play Console Track Release**
   - Upload AAB & `mapping.txt` to Closed Testing track.
   - Enter release notes from `DWIP_RELEASE_NOTES_RC1.md`.
3. **Phase 3: Tester Onboarding & Feedback**
   - Distribute opt-in link to pilot dealership managers.
   - Monitor crash telemetry via Firebase Crashlytics.
4. **Phase 4: In-App Updates & Production Transition**
   - Test Flexible and Immediate In-App Update API prompts.
