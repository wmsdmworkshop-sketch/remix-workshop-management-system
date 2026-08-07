/**
 * =============================================================================
 * DWIP Enterprise V1.1.0 — Field-Level RBAC UI Wrapper Component
 * Dynamically wraps form inputs to present EDIT, READ_ONLY, LOCKED, REQUIRES_APPROVAL,
 * OVERRIDE, and HIDDEN states with enterprise visual badges.
 * =============================================================================
 */

import React from 'react';
import { Lock, ShieldAlert, KeyRound, AlertTriangle } from 'lucide-react';
import { evaluateFieldPermission, FieldPermissionEvaluation } from '../services/fieldRbacEngine';

interface FieldRbacWrapperProps {
  role?: string;
  workflowStage?: string;
  fieldName: string;
  label?: string;
  children: React.ReactNode;
  onRequestOverride?: (fieldName: string) => void;
}

export const FieldRbacWrapper: React.FC<FieldRbacWrapperProps> = ({
  role = 'service_advisor',
  workflowStage = 'Draft',
  fieldName,
  label,
  children,
  onRequestOverride
}) => {
  const evalResult: FieldPermissionEvaluation = evaluateFieldPermission(role, workflowStage, fieldName);

  if (evalResult.isHidden) {
    return null;
  }

  return (
    <div className="space-y-1 relative group">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>

          {/* PERMISSION BADGES */}
          {evalResult.isLocked && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/80 px-1.5 py-0.5 rounded uppercase tracking-wider" title={evalResult.reason}>
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}

          {evalResult.requiresApproval && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded uppercase tracking-wider" title={evalResult.reason}>
              <ShieldAlert className="h-3 w-3" />
              Requires Approval
            </span>
          )}

          {evalResult.canOverride && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.5 rounded uppercase tracking-wider" title={evalResult.reason}>
              <KeyRound className="h-3 w-3" />
              Override Active
            </span>
          )}
        </div>
      )}

      <div className={`relative ${evalResult.isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
        {children}
      </div>

      {evalResult.reason && (evalResult.isLocked || evalResult.requiresApproval) && (
        <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
          <span>{evalResult.reason}</span>
          {evalResult.requiresApproval && onRequestOverride && (
            <button
              type="button"
              onClick={() => onRequestOverride(fieldName)}
              className="text-amber-400 underline font-bold hover:text-amber-300 ml-1 cursor-pointer"
            >
              Request Approval
            </button>
          )}
        </p>
      )}
    </div>
  );
};
