# Workshop Manager Gap Analysis

This document identifies the functional gaps between the current implementation of the WMS application and the requirements for the **Workshop Manager Module**.

## 1. Dashboard and Views
- **Gap**: There is no dedicated operational cockpit for the Workshop Manager. The current `Dashboard` is shared and generic.
- **Requirement**: Implement a unified `WorkshopDashboard` containing interactive boards (Live Queue, Bays, and Technicians) with real-time analytics.

## 2. Allocation Control Panel
- **Gap**: Changing bay or technician assignments requires opening individual Job Card edit modals in `JobCardManager`. There is no visual drag-drop or single-click panel to re-allocate resources.
- **Requirement**: Build a unified `AllocationPanel` to edit, drag/swap, and override bay and technician mappings.

## 3. Real-time Monitoring & Capacity Analytics
- **Gap**: No visual heatmap showing queue load, no SLA metrics at a glance, and no technician utilization charts.
- **Requirement**: Implement `QueueHeatMap`, `SLAWidget`, and `CapacityWidget` displaying real-time metrics (e.g. number of idle bays, total active workload, and SLA breach countdowns).

## 4. Carry Forward & Rework Monitoring
- **Gap**: Carry-forward logs and rework logs exist in the database, but they are not consolidated in a single manager review panel.
- **Requirement**: Implement `CarryForwardPanel` to display details of pending rework/carry-forward jobs and log manager approval/rejection.

## 5. Gemma AI Recommendation Overlay
- **Gap**: Gemma AI's suggestions are only visible during the job card registration preview. There is no manager-facing panel to review AI-recommended layout optimizations for the whole shop floor.
- **Requirement**: Build an `AIRecommendationPanel` inside the manager dashboard to suggest layout/assignment adjustments with a simple "Apply All" action.
