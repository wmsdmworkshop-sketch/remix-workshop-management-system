# AiVaahan Product Edition & Packaging Strategy

**Platform**: AiVaahan Commercial SaaS Suite  
**Target Market**: Commercial Vehicle (CV) Dealerships, Fleet Repair Centers & Roadside Assistance Providers

---

## 1. Commercial Product Editions Matrix

| Feature / Capability | **Starter Edition** | **Professional Edition** | **Enterprise SaaS Edition** |
| :--- | :---: | :---: | :---: |
| **Target Audience** | Single-Branch Workshops | Multi-Branch Dealerships | Large Fleet / Multi-OEM Groups |
| **Active Branch Limit** | 1 Branch | Up to 5 Branches | Unlimited Branches |
| **Monthly Job Card Limit** | 250 Job Cards | 2,500 Job Cards | Unlimited |
| **Core VOS Lifecycle Engine** | Included | Included | Included |
| **Gate Entry & Mobile App** | Included | Included | Included |
| **QRT Roadside Assistance** | Optional Add-on | Included | Included |
| **OEM Integration Gateway** | Single OEM Adapter | Dual OEM Adapters | Full Provider Suite (TMSA/QRT/EPC/eGuru) |
| **Executive Intelligence** | Basic Scorecards | Advanced Analytics | 5 Scorecards + AI Recommendations |
| **Data Retention** | 1 Year | 3 Years | 7 Years (Full Audit Ledger) |
| **White-Label Branding** | Standard AiVaahan | Custom Logo | Fully Custom Theme & Domain |

---

## 2. Feature Gating Architecture

Features are dynamically enabled/disabled per tenant using the existing 4-tier `FeatureFlagService` and `WorkflowProfileRegistry`:

```typescript
// Example Tenant Tier Feature Flag Resolution
const isQrtEnabled = featureFlagService.evaluateFlag('EnableTrailerAxle', {
  companyId,
  dealerId,
  branchId
});
```
