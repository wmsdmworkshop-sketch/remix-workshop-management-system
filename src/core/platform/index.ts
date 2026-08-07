/**
 * DWIP Enterprise - Core Platform Section Unified Facade
 * Sprint IL-001 Architecture
 * 
 * Exposes all 10 Core Platform Engines:
 * 1. Authentication Engine
 * 2. Integration Engine
 * 3. Sync Engine
 * 4. Cache Engine
 * 5. Notification Engine
 * 6. Audit Engine
 * 7. API Gateway
 * 8. Monitoring Engine
 * 9. Permission Engine
 * 10. Configuration Engine
 */

import { authenticationEngine, AuthenticationEngine } from './AuthenticationEngine';
import { integrationEngine, IntegrationEngine } from './IntegrationEngine';
import { syncEngine, SyncEngine } from './SyncEngine';
import { cacheEngine, CacheEngine } from './CacheEngine';
import { notificationEngine, NotificationEngine } from './NotificationEngine';
import { auditEngine, AuditEngine } from './AuditEngine';
import { apiGateway, ApiGateway } from './ApiGateway';
import { monitoringEngine, MonitoringEngine } from './MonitoringEngine';
import { permissionEngine, PermissionEngine } from './PermissionEngine';
import { configurationEngine, ConfigurationEngine } from './ConfigurationEngine';

export * from './AuthenticationEngine';
export * from './IntegrationEngine';
export * from './SyncEngine';
export * from './CacheEngine';
export * from './NotificationEngine';
export * from './AuditEngine';
export * from './ApiGateway';
export * from './MonitoringEngine';
export * from './PermissionEngine';
export * from './ConfigurationEngine';

export class CorePlatform {
  public static readonly authentication = authenticationEngine;
  public static readonly integration = integrationEngine;
  public static readonly sync = syncEngine;
  public static readonly cache = cacheEngine;
  public static readonly notification = notificationEngine;
  public static readonly audit = auditEngine;
  public static readonly gateway = apiGateway;
  public static readonly monitoring = monitoringEngine;
  public static readonly permission = permissionEngine;
  public static readonly configuration = configurationEngine;
}

export default CorePlatform;
