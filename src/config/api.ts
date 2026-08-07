// ============================================================================
// AiVaahan DWIP — Centralized API Routing & Environment Strategy
// ============================================================================
// Supports:
// 1. Web Production: Relative SAME-ORIGIN /api/... paths (default)
// 2. Capacitor Mobile (Android): Route requests to production backend
//    "https://devanand.aivaahan.com" or VITE_API_BASE_URL
// ============================================================================

import { Capacitor } from '@capacitor/core';

export const DEFAULT_PRODUCTION_API_URL = 'https://devanand.aivaahan.com';

/**
 * Returns the resolved base API URL.
 * - If `VITE_API_BASE_URL` is set in env, uses that value.
 * - If running on native platform (Capacitor Android/iOS) or WebView on localhost,
 *   defaults to `DEFAULT_PRODUCTION_API_URL`.
 * - Otherwise returns empty string "" (relative path for web deployments).
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  const isNative = typeof window !== 'undefined' && (
    Capacitor.isNativePlatform() ||
    (window.location && window.location.hostname === 'localhost' && !!(window as any).Capacitor)
  );

  if (isNative) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return '';
}

/**
 * Formats a given endpoint path into a fully qualified API URL.
 * Preserves relative paths for web, resolves absolute backend URL for Capacitor.
 */
export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Intercepts window.fetch calls globally to apply centralized API routing
 * for relative `/api/` endpoints across all components transparently.
 */
export function setupGlobalApiInterceptor(): void {
  if (typeof window === 'undefined') return;

  const globalObj = window as any;
  if (globalObj.__DWIP_API_INTERCEPTOR_SETUP__) return;
  globalObj.__DWIP_API_INTERCEPTOR_SETUP__ = true;

  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let resolvedInput: RequestInfo | URL = input;

    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        resolvedInput = getApiUrl(input);
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api/')) {
        resolvedInput = getApiUrl(input.pathname + input.search);
      }
    } else if (input instanceof Request) {
      if (input.url.startsWith('/api/') || (typeof window !== 'undefined' && input.url.startsWith(window.location.origin + '/api/'))) {
        const urlObj = new URL(input.url);
        if (urlObj.pathname.startsWith('/api/')) {
          const targetUrl = getApiUrl(urlObj.pathname + urlObj.search);
          resolvedInput = new Request(targetUrl, input);
        }
      }
    }

    return originalFetch.call(this, resolvedInput, init);
  };
}

// Automatically setup fetch interceptor upon module import
setupGlobalApiInterceptor();
