/**
 * DWIP Enterprise Integration Gateway - ConflictResolver
 * Policies: SERVER_WINS, CLIENT_WINS, LATEST_TIMESTAMP, MANUAL_APPROVAL
 */

import { ConflictPolicy, SyncState } from '../types';

export interface ConflictResolutionResult<T> {
  resolvedRecord: T | null;
  status: SyncState;
  appliedPolicy: ConflictPolicy;
  reason: string;
}

export class ConflictResolver {
  public static resolve<T extends Record<string, any>>(
    clientRecord: T,
    serverRecord: T,
    policy: ConflictPolicy = ConflictPolicy.SERVER_WINS
  ): ConflictResolutionResult<T> {
    switch (policy) {
      case ConflictPolicy.CLIENT_WINS:
        return {
          resolvedRecord: { ...clientRecord },
          status: SyncState.SUCCESS,
          appliedPolicy: policy,
          reason: 'Client record prevailed under CLIENT_WINS policy.'
        };

      case ConflictPolicy.LATEST_TIMESTAMP: {
        const clientTime = new Date(clientRecord.updatedAt || clientRecord.lastSyncTime || 0).getTime();
        const serverTime = new Date(serverRecord.updatedAt || serverRecord.lastSyncTime || 0).getTime();

        if (clientTime > serverTime) {
          return {
            resolvedRecord: { ...clientRecord },
            status: SyncState.SUCCESS,
            appliedPolicy: policy,
            reason: 'Client record selected due to newer timestamp.'
          };
        }
        return {
          resolvedRecord: { ...serverRecord },
          status: SyncState.SUCCESS,
          appliedPolicy: policy,
          reason: 'Server record selected due to newer timestamp.'
        };
      }

      case ConflictPolicy.MANUAL_APPROVAL:
        return {
          resolvedRecord: null,
          status: SyncState.CONFLICT,
          appliedPolicy: policy,
          reason: 'Data collision requires manual approval by General Manager.'
        };

      case ConflictPolicy.SERVER_WINS:
      default:
        return {
          resolvedRecord: { ...serverRecord },
          status: SyncState.SUCCESS,
          appliedPolicy: ConflictPolicy.SERVER_WINS,
          reason: 'Server record prevailed under SERVER_WINS policy.'
        };
    }
  }
}
