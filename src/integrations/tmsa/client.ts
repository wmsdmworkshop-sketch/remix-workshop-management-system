/**
 * DWIP Enterprise - Tata Motors Service Advisor (TMSA-CV) API Client
 * 
 * Typed client for interacting with the official Tata TMSA microservices:
 * - Billing Type Master
 * - Complaint Code Master
 * - Fault Code Master
 * - Vehicle Inventory
 * - Fence In Upload
 * - CRM Image Upload
 * - Media Upload (SA)
 * - Trailer Media Upload (TA)
 */

import { TMSA_MICROSERVICE_ENDPOINTS, TMSA_PRODUCTION_BASE_URL } from "./endpoints";

export interface TmsaClientOptions {
  baseUrl?: string;
  apiKey?: string;
  keyHeader?: string;
  bearerToken?: string;
  timeoutMs?: number;
  callProviderFn?: (opts: { method?: string; path: string; query?: Record<string, any>; body?: any; headers?: Record<string, string>; timeoutMs?: number }) => Promise<any>;
}

export class TmsaClient {
  private baseUrl: string;
  private apiKey?: string;
  private keyHeader: string;
  private bearerToken?: string;
  private timeoutMs: number;
  private callProviderFn?: (opts: any) => Promise<any>;

  constructor(options: TmsaClientOptions = {}) {
    this.baseUrl = (options.baseUrl || TMSA_PRODUCTION_BASE_URL).replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.keyHeader = options.keyHeader || "X-API-Key";
    this.bearerToken = options.bearerToken;
    this.timeoutMs = options.timeoutMs || 15000;
    this.callProviderFn = options.callProviderFn;
  }

  private async request(opts: { method?: string; path: string; query?: Record<string, any>; body?: any; headers?: Record<string, string> }): Promise<any> {
    if (this.callProviderFn) {
      return this.callProviderFn({
        method: opts.method || "GET",
        path: opts.path,
        query: opts.query,
        body: opts.body,
        headers: opts.headers,
        timeoutMs: this.timeoutMs,
      });
    }

    const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query || {})) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(opts.headers || {}),
    };

    if (this.bearerToken) {
      headers["Authorization"] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers[this.keyHeader] = this.apiKey;
    }

    if (opts.body && typeof opts.body === "object" && !(opts.body instanceof Uint8Array)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const resp = await fetch(url.toString(), {
        method: opts.method || "GET",
        headers,
        body: opts.body ? (typeof opts.body === "string" || opts.body instanceof Uint8Array ? opts.body : JSON.stringify(opts.body)) : undefined,
        signal: ctrl.signal,
      });

      const text = await resp.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch { /* leave as string */ }

      if (!resp.ok) {
        const err: any = new Error(`TMSA API error (${resp.status}): ${typeof data === "object" ? JSON.stringify(data) : data}`);
        err.status = resp.status;
        err.body = data;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // ===========================================================================
  // 1. BILLING MASTER
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/billing-type-master/
  // ===========================================================================
  async getBillingTypes(params?: { division?: string; workshop_code?: string; status?: string }): Promise<any> {
    return this.request({
      method: "GET",
      path: TMSA_MICROSERVICE_ENDPOINTS.BILLING_TYPE_MASTER,
      query: params,
    });
  }

  // ===========================================================================
  // 2. COMPLAINT CODE MASTER
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/complaint-code-master/
  // ===========================================================================
  async getComplaintCodes(params?: { category?: string; search?: string; model_family?: string }): Promise<any> {
    return this.request({
      method: "GET",
      path: TMSA_MICROSERVICE_ENDPOINTS.COMPLAINT_CODE_MASTER,
      query: params,
    });
  }

  // ===========================================================================
  // 3. FAULT CODE MASTER
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/fault-code-master/
  // ===========================================================================
  async getFaultCodes(params?: { dtc?: string; ecu?: string; system?: string; search?: string }): Promise<any> {
    return this.request({
      method: "GET",
      path: TMSA_MICROSERVICE_ENDPOINTS.FAULT_CODE_MASTER,
      query: params,
    });
  }

  // ===========================================================================
  // 4. VEHICLE INVENTORY
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/vehicle-inventory/
  // ===========================================================================
  async getVehicleInventory(params?: { vrn?: string; vin?: string; workshop_code?: string; yard_status?: string }): Promise<any> {
    return this.request({
      method: "GET",
      path: TMSA_MICROSERVICE_ENDPOINTS.VEHICLE_INVENTORY,
      query: params,
    });
  }

  // ===========================================================================
  // 5. FENCE IN UPLOAD
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/upload-image/
  // ===========================================================================
  async uploadFenceInImage(payload: {
    vrn: string;
    vin?: string;
    gate_entry_number?: string;
    image_base64?: string;
    image_type?: "FRONT" | "ODOMETER" | "REAR" | "CHASSIS_PLATE" | "DAMAGE";
    timestamp?: string;
    latitude?: number;
    longitude?: number;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.request({
      method: "POST",
      path: TMSA_MICROSERVICE_ENDPOINTS.FENCE_IN_UPLOAD,
      body: payload,
    });
  }

  // ===========================================================================
  // 6. CRM UPLOAD
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/image-upload-in-crm/
  // ===========================================================================
  async uploadCrmImage(payload: {
    crm_job_card_id?: string;
    job_card_number?: string;
    vrn?: string;
    vin?: string;
    document_type?: "INSPECTION_DOC" | "ESTIMATE_APPROVAL" | "WARRANTY_PART" | "CUSTOMER_SIGNATURE";
    image_base64?: string;
    file_name?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.request({
      method: "POST",
      path: TMSA_MICROSERVICE_ENDPOINTS.CRM_IMAGE_UPLOAD,
      body: payload,
    });
  }

  // ===========================================================================
  // 7. MEDIA UPLOAD (SA)
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/media-upload/
  // ===========================================================================
  async uploadSaMedia(payload: {
    entity_id: string;
    entity_type: "JOB_CARD" | "GATE_ENTRY" | "WARRANTY" | "INSPECTION";
    media_type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
    file_name: string;
    file_base64?: string;
    file_url?: string;
    content_type?: string;
    uploaded_by?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.request({
      method: "POST",
      path: TMSA_MICROSERVICE_ENDPOINTS.MEDIA_UPLOAD_SA,
      body: payload,
    });
  }

  // ===========================================================================
  // 8. TRAILER MEDIA (TA)
  // Full URL: https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/ta/media-upload/
  // ===========================================================================
  async uploadTrailerMedia(payload: {
    trailer_id?: string;
    trailer_registration_number?: string;
    job_card_id?: string;
    inspection_point?: "FIFTH_WHEEL" | "BRAKE_SYSTEM" | "AXLE" | "CHASSIS" | "KINGPIN" | "ELECTRICAL";
    media_type: "IMAGE" | "VIDEO" | "DOCUMENT";
    file_name: string;
    file_base64?: string;
    file_url?: string;
    uploaded_by?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.request({
      method: "POST",
      path: TMSA_MICROSERVICE_ENDPOINTS.MEDIA_UPLOAD_TA,
      body: payload,
    });
  }
}
