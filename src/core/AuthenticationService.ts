/**
 * =============================================================================
 * DWIP Enterprise Platform — Single Source of Truth AuthenticationService
 * Central Service Layer: Manages authentication, JWT generation/validation, 
 * password policies, and RBAC permission resolution using UserRepository.
 * =============================================================================
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository, UserRecord, UserRepository } from './UserRepository';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const JWT_EXPIRES_IN = '24h';

export interface AuthenticationResult {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    full_name: string;
    role: string;
    employee_id?: number | null;
    is_active: boolean;
    mobile_no?: string | null;
  };
  error?: string;
  errorCode?: string;
}

export class AuthenticationService {
  private repo: UserRepository;

  constructor(repo: UserRepository = userRepository) {
    this.repo = repo;
  }

  /**
   * Single Source of Truth Authentication Logic
   */
  async authenticate(identifier: string, password: string): Promise<AuthenticationResult> {
    if (!identifier || !String(identifier).trim()) {
      return { success: false, error: 'Identifier is required', errorCode: 'MISSING_IDENTIFIER' };
    }
    if (!password || !String(password).trim()) {
      return { success: false, error: 'Password is required', errorCode: 'MISSING_PASSWORD' };
    }

    const cleanInput = String(identifier).trim();
    const user = await this.repo.findByUsername(cleanInput);

    if (!user) {
      return { success: false, error: 'User account not found', errorCode: 'USER_NOT_FOUND' };
    }

    if (!user.is_active) {
      return { success: false, error: 'User account is inactive', errorCode: 'ACCOUNT_DISABLED' };
    }

    const isValidPassword = await this.repo.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password provided', errorCode: 'INVALID_CREDENTIALS' };
    }

    // Update last login timestamp
    await this.repo.updateLastLogin(user.user_id);

    // Generate JWT token
    const token = this.generateJWT(user);

    return {
      success: true,
      token,
      user: {
        id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        employee_id: user.employee_id,
        is_active: Boolean(user.is_active),
        mobile_no: user.mobile_no
      }
    };
  }

  /**
   * Generate JWT Token for user
   */
  generateJWT(user: UserRecord): string {
    const payload = {
      userId: user.user_id,
      id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      employee_id: user.employee_id,
      iss: 'DWIP_ENTERPRISE_PLATFORM',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify and decode JWT token
   */
  verifyJWT(token: string): any {
    if (!token) return null;
    try {
      const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      return jwt.verify(cleanToken, JWT_SECRET);
    } catch (err: any) {
      console.error('[AuthenticationService.verifyJWT] Token verification error:', err.message);
      return null;
    }
  }

  /**
   * Reset Password for a given identifier
   */
  async resetPassword(identifier: string, newPassword: string): Promise<boolean> {
    const user = await this.repo.findByUsername(identifier);
    if (!user) return false;

    const newHash = await bcrypt.hash(newPassword, 10);
    return await this.repo.updatePassword(user.user_id, newHash);
  }

  /**
   * Change Password for authenticated user
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.repo.findById(userId);
    if (!user) return false;

    const isValidOld = await this.repo.verifyPassword(oldPassword, user.password_hash);
    if (!isValidOld) return false;

    const newHash = await bcrypt.hash(newPassword, 10);
    return await this.repo.updatePassword(userId, newHash);
  }

  /**
   * Refresh token
   */
  async refreshToken(currentToken: string): Promise<string | null> {
    const decoded = this.verifyJWT(currentToken);
    if (!decoded || !decoded.userId) return null;

    const user = await this.repo.findById(decoded.userId);
    if (!user || !user.is_active) return null;

    return this.generateJWT(user);
  }

  /**
   * Load permissions for role
   */
  async loadPermissions(role: string): Promise<Record<string, boolean>> {
    return await this.repo.loadPermissions(role);
  }

  /**
   * Load profile for user ID
   */
  async loadProfile(userId: number): Promise<UserRecord | null> {
    return await this.repo.findById(userId);
  }
}

export const authenticationService = new AuthenticationService();
