/**
 * DWIP Enterprise - Integration Layer Plugin Registry & Factory
 * Sprint IL-001 Architecture
 * 
 * Provides unified access to all registered OEM & external connectors.
 */

import { IIntegrationConnector } from './common/types';
import { TmsaConnector } from './tmsa';
import { DmsConnector } from './dms';
import { FleetEdgeConnector } from './fleetedge';

export * from './common/types';
export * from './tmsa';
export * from './dms';
export * from './fleetedge';

export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private connectors: Map<string, IIntegrationConnector> = new Map();

  private constructor() {
    // Register built-in architectural connectors
    this.registerConnector(new TmsaConnector());
    this.registerConnector(new DmsConnector());
    this.registerConnector(new FleetEdgeConnector());
  }

  public static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  public registerConnector(connector: IIntegrationConnector): void {
    this.connectors.set(connector.systemCode.toUpperCase(), connector);
  }

  public getConnector(systemCode: string): IIntegrationConnector {
    const connector = this.connectors.get(systemCode.toUpperCase());
    if (!connector) {
      throw new Error(`[INTEGRATION_LAYER_ERROR] Connector for system '${systemCode}' is not registered.`);
    }
    return connector;
  }

  public hasConnector(systemCode: string): boolean {
    return this.connectors.has(systemCode.toUpperCase());
  }

  public getAllConnectors(): IIntegrationConnector[] {
    return Array.from(this.connectors.values());
  }

  public listRegisteredSystemCodes(): string[] {
    return Array.from(this.connectors.keys());
  }
}

export const integrationRegistry = IntegrationRegistry.getInstance();
