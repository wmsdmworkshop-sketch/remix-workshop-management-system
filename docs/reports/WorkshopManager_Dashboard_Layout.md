# Workshop Manager Dashboard Layout

This document maps the layout grid of the **Workshop Manager Operational Cockpit**.

## Grid Organization Map

```
+---------------------------------------------------------------------------------------------------+
|  [TOP KPI BAR]  Vehicles Received | Delivered | Open JCs | Labour | Parts | Revenue | Utilization |
+---------------------------------------------------------------------------------------------------+
|  [LEFT PANEL]          |  [CENTER PANEL]                          |  [RIGHT PANEL]               |
|  Live Queue Columns    |  Interactive Bay Layout                  |  Technician Roster Heat Map  |
|  - Gate                |  - Grid of 12 Bays                       |  - Roster Status             |
|  - Reception           |  - Current Vehicle                       |  - Current Load              |
|  - Advisor             |  - Allocated Tech                        |  - Productivity Gauge        |
|  - Workshop            |  - Elapsed State Duration                |  - Skill Classification      |
|  - QC                  |  - SLA Warning Color-code                |                              |
|  - Parts               |                                          |                              |
|  - Billing             |                                          |                              |
+---------------------------------------------------------------------------------------------------+
|  [BOTTOM CONTROL BAR]  Escalations | Carry Forward Alerts | Manager Overrides | Recent Timeline  |
+---------------------------------------------------------------------------------------------------+
```

## Grid Dimensions & Responsive Breakpoints
- **Layout System**: CSS Grid with flex-direction column fallback for mobile layouts.
- **Color Identity**: Deep workspace dark theme (`bg-[#0B1220]`) matching the premium look of the WMS application.
- **SLA Threshold Flags**:
  - `Normal` (Within SLA): Emerald-500 badge.
  - `Warning` (Within 30 mins of breach): Amber-500 badge with subtle slow pulse.
  - `Breached`: Red-500 badge with fast pulse animation.
