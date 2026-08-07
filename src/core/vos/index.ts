/**
 * DWIP Enterprise - Vehicle Operational Session (VOS) Core Facade
 * Sprint 1 Architecture - Platform Foundation
 * 
 * Unifies all 7 VOS Core Foundation Engines:
 * 1. VOS Engine
 * 2. State Engine
 * 3. Event Engine
 * 4. Timeline Engine
 * 5. Ownership Engine
 * 6. Audit Engine
 * 7. Configuration Engine
 */

export * from './types';
export { VosEngine, vosEngine } from './VosEngine';
export { VosStateEngine, vosStateEngine } from './VosStateEngine';
export { VosEventEngine, vosEventEngine } from './VosEventEngine';
export { VosTimelineEngine, vosTimelineEngine } from './VosTimelineEngine';
export { VosOwnershipEngine, vosOwnershipEngine } from './VosOwnershipEngine';
export { VosAuditEngine, vosAuditEngine } from './VosAuditEngine';
export { VosConfigurationEngine, vosConfigurationEngine } from './VosConfigurationEngine';

import { vosEngine } from './VosEngine';
import { vosStateEngine } from './VosStateEngine';
import { vosEventEngine } from './VosEventEngine';
import { vosTimelineEngine } from './VosTimelineEngine';
import { vosOwnershipEngine } from './VosOwnershipEngine';
import { vosAuditEngine } from './VosAuditEngine';
import { vosConfigurationEngine } from './VosConfigurationEngine';

export class VosCorePlatform {
  public static get vos() { return vosEngine; }
  public static get state() { return vosStateEngine; }
  public static get events() { return vosEventEngine; }
  public static get timeline() { return vosTimelineEngine; }
  public static get ownership() { return vosOwnershipEngine; }
  public static get audit() { return vosAuditEngine; }
  public static get config() { return vosConfigurationEngine; }
}
