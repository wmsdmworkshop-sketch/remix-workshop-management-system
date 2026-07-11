# Workshop Manager Runtime Performance

This document outlines the performance profiles and runtime optimizations implemented during the integration phase.

## 1. Dynamic Rendering Efficiency
- **React.memo**: Applied across all widgets to prevent re-rendering when other unrelated components or input controls change state.
- **Throttling Selector Checks**: State calculation rules (e.g. FTR, bay utilization ratios) utilize standard React `useMemo` hooks, limiting computations to occurrences where the active datasets mutate.

## 2. Minimal Initial Footprint
- The dashboard leverages **React.lazy** chunks for heavy widgets. 
- Reduces primary initial script loading times.
- Limits database query load under 15-second polling thresholds, preventing server overload.
