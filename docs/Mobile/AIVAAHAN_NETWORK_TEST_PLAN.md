# Mobile Network Interruption & Handover Test Plan

**Application**: AiVaahan DWIP (`com.aivaahan.dwip`)

---

## Network Resiliency Test Scenarios

| Test Scenario | Trigger Condition | Expected Mobile Behavior | Status |
| :--- | :--- | :--- | :---: |
| **1. Wi-Fi to 4G Handover** | Move out of workshop Wi-Fi coverage | Active VOS session seamlessly switches connection; 0 data loss | **PASSED** |
| **2. Temporary Signal Loss** | Enter underground bay / blind spot | UI displays "Offline Mode - Queuing Operations"; queues locally | **PASSED** |
| **3. Network Reconnection** | Exit blind spot; signal restored | `SyncOrchestrator` automatically flushes pending offline actions | **PASSED** |
| **4. High Packet Loss (3G)** | Weak cellular connection | Retries API payload with exponential backoff (`maxRetries: 3`) | **PASSED** |
| **5. Large Media Upload** | Upload 5 MB inspection photo | Multipart chunked upload via Integration Gateway (`/media/upload`)| **PASSED** |
