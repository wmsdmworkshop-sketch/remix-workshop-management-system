/**
 * =============================================================================
 * WOS Core Architecture: TransactionManager Implementation
 * Bounded Context: Core System / Database Persistence
 * Description: Manages transaction lifecycles, nested savepoints, automatic
 *              compensation rollback registration, and audit hooks.
 * =============================================================================
 */

import { pool as db } from "../db/index";
import { IEventBus } from "./event-bus";

export interface TransactionContext {
  connection: any;
  correlationId: string;
  validationRunId?: string;
  savepointDepth: number;
  compensations: (() => void | Promise<void>)[];
  onCommitCallbacks: (() => void | Promise<void>)[];
}

export interface ITransactionManager {
  readonly eventBus: IEventBus;

  runInTransaction<T>(
    work: (tx: TransactionContext) => Promise<T>,
    correlationId: string,
    validationRunId?: string,
    parentContext?: TransactionContext
  ): Promise<T>;

  registerCompensation(
    tx: TransactionContext,
    compensation: () => void | Promise<void>
  ): void;
}

export class TransactionManager implements ITransactionManager {
  constructor(public readonly eventBus: IEventBus) {}

  /**
   * Registers a compensation function to be executed in reverse order
   * if the current transaction level rolls back.
   */
  public registerCompensation(
    tx: TransactionContext,
    compensation: () => void | Promise<void>
  ): void {
    tx.compensations.push(compensation);
  }

  /**
   * Registers a callback to be executed after a successful COMMIT.
   * Used for post-commit side effects (cache updates, event publishing).
   */
  public onCommit(
    tx: TransactionContext,
    callback: () => void | Promise<void>
  ): void {
    tx.onCommitCallbacks.push(callback);
  }

  /**
   * Executes a block of database operations within an ACID transaction.
   * Seamlessly handles nested transactions using SQL SAVEPOINTS.
   */
  public async runInTransaction<T>(
    work: (tx: TransactionContext) => Promise<T>,
    correlationId: string,
    validationRunId?: string,
    parentContext?: TransactionContext
  ): Promise<T> {
    // 1. Resolve or establish connection context
    let connection: any;
    let savepointDepth = 0;
    const compensations: (() => void | Promise<void>)[] = [];
    const onCommitCallbacks: (() => void | Promise<void>)[] = [];

    if (parentContext) {
      connection = parentContext.connection;
      savepointDepth = parentContext.savepointDepth + 1;
    } else {
      connection = await db.getConnection();
    }

    const txContext: TransactionContext = {
      connection,
      correlationId,
      validationRunId,
      savepointDepth,
      compensations,
      onCommitCallbacks,
    };

    const savepointName = `SP_${txContext.savepointDepth}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      // 2. BEGIN (or set Savepoint)
      if (txContext.savepointDepth === 0) {
        await connection.query("START TRANSACTION");
        await this.publishTransactionEvent("TX_BEGIN", txContext);
      } else {
        await connection.query(`SAVEPOINT ${savepointName}`);
        await this.publishTransactionEvent("TX_SAVEPOINT_CREATED", { ...txContext, savepointName });
      }

      // 3. Execute work block
      const result = await work(txContext);

      // 4. COMMIT (or release Savepoint)
      if (txContext.savepointDepth === 0) {
        await connection.query("COMMIT");
        await this.publishTransactionEvent("TX_COMMIT", txContext);

        // 4a. Execute onCommit callbacks (post-commit side effects)
        for (const cb of txContext.onCommitCallbacks) {
          try {
            await cb();
          } catch (commitHookError) {
            console.error("[TransactionManager] Post-commit callback failed (non-fatal):", commitHookError);
          }
        }
      } else {
        await connection.query(`RELEASE SAVEPOINT ${savepointName}`);
        await this.publishTransactionEvent("TX_SAVEPOINT_RELEASED", { ...txContext, savepointName });
      }

      return result;
    } catch (err) {
      // 5. ROLLBACK (or rollback to Savepoint)
      if (txContext.savepointDepth === 0) {
        await connection.query("ROLLBACK");
        await this.publishTransactionEvent("TX_ROLLBACK", txContext);
      } else {
        await connection.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        await this.publishTransactionEvent("TX_SAVEPOINT_ROLLBACK", { ...txContext, savepointName });
      }

      // 6. Execute registered compensation callbacks in LIFO (last-in, first-out) order
      for (let i = txContext.compensations.length - 1; i >= 0; i--) {
        try {
          await txContext.compensations[i]();
        } catch (compensationError) {
          console.error("[TransactionManager] Compensation callback execution failed:", compensationError);
        }
      }

      throw err;
    } finally {
      // 7. Release connection if this was the root transaction level
      if (txContext.savepointDepth === 0 && !parentContext) {
        connection.release();
      }
    }
  }

  /**
   * Publishes transaction lifecycle events to the central EventBus.
   */
  private async publishTransactionEvent(topic: string, tx: any): Promise<void> {
    try {
      await this.eventBus.publish(
        topic,
        {
          correlationId: tx.correlationId,
          validationRunId: tx.validationRunId,
          savepointDepth: tx.savepointDepth,
          savepointName: tx.savepointName,
          timestamp: new Date().toISOString(),
        },
        tx.correlationId,
        tx.validationRunId
      );
    } catch (err) {
      // Prevent event publishing failures from aborting active transactions
      console.warn("[TransactionManager] Failed to publish lifecycle event:", err);
    }
  }
}
