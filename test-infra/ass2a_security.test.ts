import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../src/core/AuthorizationService.ts';

const { mockQuery } = vi.hoisted(() => {
  return { mockQuery: vi.fn() };
});

vi.mock('../src/db/index.ts', () => ({
  pool: {
    query: mockQuery,
    getConnection: vi.fn().mockResolvedValue({
      query: mockQuery,
      execute: vi.fn(),
      release: vi.fn()
    })
  }
}));

describe('Phase 3.5: Enterprise Security Validation', () => {
  
  beforeEach(() => {
    authService.invalidateCache();
    mockQuery.mockReset();
    
    mockQuery.mockImplementation(async (sql: string, params: any[]) => {
      // Mock user_delegations
      if (sql.includes("user_delegations")) {
        if (params[0] === 105 && params[1] === "Inventory") {
          return [[{ delegator_id: 102 }]];
        }
        return [[]];
      }
      
      // Mock user role fetch for delegator
      if (sql.includes("SELECT r.role_name FROM users u JOIN roles r")) {
        if (params[0] === 102) return [[{ role_name: "Inventory Manager" }]];
        return [[]];
      }
      
      // Mock user_overrides
      if (sql.includes("user_overrides")) {
        if (params[0] === 201 && params[1] === "can_edit" && params[2] === "Workshop") {
          return [[{ is_allowed: 0 }]];
        }
        if (params[0] === 202 && params[1] === "can_approve" && params[2] === "Finance") {
          return [[{ is_allowed: 1 }]];
        }
        return [[]];
      }

      // Mock role_permissions
      if (sql.includes("role_permissions")) {
        if (params[0] === "Service Advisor" && params[1] === "Workshop") {
          return [[{ can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_approve: 0 }]];
        }
        if (params[0] === "Inventory Manager" && params[1] === "Inventory") {
          return [[{ can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_approve: 1 }]];
        }
        if (params[0] === "Technician" && params[1] === "Workshop") {
          return [[{ can_view: 1, can_create: 0, can_edit: 0, can_delete: 0 }]];
        }
        if (params[0] === "Custom Role" && params[1] === "TestModule") {
          return [[{ can_edit: 1, can_view: 0 }]];
        }
        return [[]];
      }
      return [[]];
    });
  });

  it('Deny-by-default: Unknown role and module correctly denied access', async () => {
    const perm = await authService.checkPermission(999, 99, "Unknown Role", "SecretModule", "view");
    expect(perm).toBe(false);
  });

  it('Super Admin Check: Developer role bypasses all checks', async () => {
    const perm = await authService.checkPermission(1, 1, "Developer", "SecretModule", "delete");
    expect(perm).toBe(true);
  });

  it('Role Resolution (Grant): Service Advisor granted create on Workshop', async () => {
    const perm = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    expect(perm).toBe(true);
  });

  it('Role Resolution (Deny): Service Advisor denied approve on Workshop', async () => {
    const perm = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "approve");
    expect(perm).toBe(false);
  });

  it('Hierarchical Expansion: Role with only can_edit implicitly granted view', async () => {
    const perm = await authService.checkPermission(900, 9, "Custom Role", "TestModule", "view");
    expect(perm).toBe(true);
  });

  it('Delegation: Technician granted edit on Inventory via delegation from Inventory Manager', async () => {
    const perm = await authService.checkPermission(105, 3, "Technician", "Inventory", "edit");
    expect(perm).toBe(true);
  });

  it('User Override (Revoke): Service Advisor explicitly revoked edit on Workshop', async () => {
    const perm = await authService.checkPermission(201, 2, "Service Advisor", "Workshop", "edit");
    expect(perm).toBe(false);
  });

  it('User Override (Grant): Technician explicitly granted approve on Finance', async () => {
    const perm = await authService.checkPermission(202, 3, "Technician", "Finance", "approve");
    expect(perm).toBe(true);
  });

  it('Cache Performance Validation: Second identical check resolves from cache without DB', async () => {
    const perm1 = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    expect(perm1).toBe(true);
    
    // Change mock to throw error to ensure it does not hit DB
    mockQuery.mockRejectedValue(new Error("Should not hit DB"));
    const perm2 = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    expect(perm2).toBe(true);
  });

  it('Cache Invalidation: Cache correctly invalidated forcing DB query', async () => {
    const perm1 = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    expect(perm1).toBe(true);
    
    authService.invalidateCache(101);
    
    // DB mock is still returning the standard valid response
    const perm2 = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    // Each uncached check hits the DB 3 times (role_permissions, delegations, overrides)
    expect(mockQuery).toHaveBeenCalledTimes(6); 
  });
});
