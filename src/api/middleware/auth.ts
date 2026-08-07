import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { envConfig } from "../../config/env.ts";
import { authService, PermissionAction } from "../../core/AuthorizationService.ts";
import { AuditService } from "../../core/identity.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Centralized Auth & RBAC Middleware (WP-02)
 * Bounded Context: Security / Middleware Layer
 * Description: Strengthened JWT authentication, claim verification, single-entry
 *              authorize(module, action) middleware, branch isolation checks, and
 *              audit logging for all authorization decisions.
 * =============================================================================
 */

export interface AuthUser {
  id: number;
  user_id?: number;
  username: string;
  full_name?: string;
  role: string;
  roleId?: number;
  employee_id?: number | null;
  branchId?: number;
  companyId?: number;
  dealerId?: number;
  department?: string;
  [key: string]: any;
}

// Express Request Extension
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId?: string;
    }
  }
}

/**
 * Express Middleware: Authenticates JWT Tokens with Claim & Signature Validation.
 */
export function authenticateJwt(req: Request, res: Response, next: NextFunction): any {
  const authHeader = req.headers.authorization || (req.headers["x-access-token"] as string);
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "AUTHENTICATION_REQUIRED",
      message: "Authorization token header is missing."
    });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

  try {
    // Strengthened JWT Verification: Verify signature and claims with backward compatible options
    const decoded = jwt.verify(token, envConfig.JWT_SECRET, {
      // Allow verification of token signature; fallback claims match gracefully
    }) as any;

    const userId = Number(decoded.id || decoded.userId || decoded.user_id || 0);
    const userRole = decoded.role || decoded.user_role || "";

    if (!decoded || !userId || !userRole) {
      return res.status(401).json({
        success: false,
        error: "INVALID_JWT_PAYLOAD",
        message: "JWT token payload is missing required user identity claims."
      });
    }

    req.user = {
      id: userId,
      user_id: userId,
      username: decoded.username || decoded.email || `user_${userId}`,
      full_name: decoded.full_name || decoded.fullName || decoded.name || "",
      role: userRole,
      roleId: decoded.roleId ? Number(decoded.roleId) : 0,
      employee_id: decoded.employee_id ? Number(decoded.employee_id) : (decoded.employeeId ? Number(decoded.employeeId) : null),
      branchId: decoded.branchId ? Number(decoded.branchId) : (decoded.branch_id ? Number(decoded.branch_id) : undefined),
      companyId: decoded.companyId ? Number(decoded.companyId) : (decoded.company_id ? Number(decoded.company_id) : undefined),
      dealerId: decoded.dealerId ? Number(decoded.dealerId) : (decoded.dealer_id ? Number(decoded.dealer_id) : undefined),
      department: decoded.department,
    };

    req.correlationId = (req.headers["x-correlation-id"] as string) || `REQ-${Date.now()}`;
    return next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "TOKEN_EXPIRED",
        message: "JWT session token has expired. Please re-authenticate."
      });
    }
    return res.status(401).json({
      success: false,
      error: "INVALID_TOKEN",
      message: "JWT token verification failed: " + err.message
    });
  }
}

/**
 * Express Middleware Factory: Centralized Single-Entry Point for RBAC Authorization.
 * Usage: router.get('/api/v1/job-cards', authenticateJwt, authorize('job_card', 'view'), controller);
 */
export function authorize(moduleName: string, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHENTICATED",
        message: "User context not found. Authentication middleware must run prior to authorization."
      });
    }

    const { id: userId, roleId = 0, role: userRole, username, branchId: userBranchId } = req.user;

    // 1. Branch Isolation Check
    const targetBranchIdHeader = req.headers["x-branch-id"] || req.query.branch_id || req.params.branchId;
    const targetBranchId = targetBranchIdHeader ? Number(targetBranchIdHeader) : undefined;

    const hasBranchAccess = authService.checkBranchAccess(userBranchId, targetBranchId, userRole);
    if (!hasBranchAccess) {
      await AuditService.logAction(
        userId,
        username,
        "AUTHORIZATION_DENIED",
        `Branch access denied for user ${username} (Branch: ${userBranchId}) targeting Branch ${targetBranchId}`,
        req.correlationId
      );
      return res.status(403).json({
        success: false,
        error: "BRANCH_ACCESS_DENIED",
        message: `Cross-branch access denied. User branch (${userBranchId}) cannot access Branch ${targetBranchId}.`
      });
    }

    // 2. 10-Step Authorization Engine Check
    const isAllowed = await authService.checkPermission(userId, roleId, userRole, moduleName, action);

    if (!isAllowed) {
      await AuditService.logAction(
        userId,
        username,
        "AUTHORIZATION_DENIED",
        `Access DENIED for action '${action}' on module '${moduleName}' for role '${userRole}'`,
        req.correlationId
      );
      return res.status(403).json({
        success: false,
        error: "AUTHORIZATION_DENIED",
        message: `Access denied. Role '${userRole}' does not possess permission '${action}' on module '${moduleName}'.`
      });
    }

    // Audit log sensitive / write / administrative actions on ALLOW
    if (["create", "edit", "delete", "approve", "reject", "admin", "configure"].includes(action)) {
      await AuditService.logAction(
        userId,
        username,
        `PERMISSION_GRANTED_${action.toUpperCase()}`,
        `Granted action '${action}' on module '${moduleName}'`,
        req.correlationId
      );
    }

    return next();
  };
}
