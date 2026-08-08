/**
 * DWIP Enterprise - QrtApiClient
 * HTTP Client for External Tata Motors QRT API Integration
 */

export class QrtApiClient {
  private baseUrl: string;
  private authToken: string;

  constructor() {
    // These should ideally come from a ConfigurationEngine or env vars.
    // Defaulting to gateway.internal for architectural consistency until prod URLs are provided.
    this.baseUrl = process.env.QRT_API_BASE_URL || 'https://gateway.internal/qrt';
    this.authToken = process.env.QRT_API_KEY || 'STUB_QRT_KEY';
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
      ...options.headers
    };

    try {
      // In a real environment, this uses node-fetch or global fetch
      // For this architecture stub, we simulate the network call.
      if (process.env.NODE_ENV === 'test' || this.baseUrl.includes('gateway.internal')) {
        return this.simulateSuccess(endpoint, options);
      }

      const response = await global.fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`QRT API Error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error(`[QRT_API] Request failed for ${endpoint}`, error);
      throw error;
    }
  }

  private simulateSuccess(endpoint: string, options: RequestInit): any {
    console.log(`[QRT_API_MOCK] ${options.method || 'GET'} ${endpoint}`, options.body ? options.body : '');
    return { success: true, timestamp: new Date().toISOString() };
  }

  async getServiceRequests() {
    return this.fetch('/api/service_request/', { method: 'GET' });
  }

  async getServiceRequestDetails(id: string) {
    return this.fetch(`/api/service_request/${id}`, { method: 'GET' });
  }

  async getUpcomingServiceRequests() {
    return this.fetch('/api/service_request/', { method: 'GET' });
  }

  async startServiceRequest(payload: { service_request_id: string; technician_id: string }) {
    return this.fetch('/api/service_request/start/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async startJob(payload: { service_request_id: string }) {
    return this.fetch('/api/service_request/job_start/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async markReached(payload: { service_request_id: string; lat?: number; lng?: number }) {
    return this.fetch('/api/service_request/reached/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async submitReachedOtp(payload: { service_request_id: string; otp: string }) {
    return this.fetch('/api/service_request/reached/otp/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async requestJobCompleteOtp(payload: { service_request_id: string }) {
    return this.fetch('/api/service_request/job_complete/otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async confirmJobComplete(payload: { service_request_id: string; otp: string; notes?: string }) {
    return this.fetch('/api/service_request/job_complete/confirm/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async markTowed(payload: { service_request_id: string; destination: string }) {
    return this.fetch('/api/service_request/towed/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateLocation(payload: { lat: number; lng: number; technician_id: string }) {
    return this.fetch('/api/location/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async registerDeviceNotification(payload: { device_token: string; technician_id: string }) {
    return this.fetch('/api/device_notification_update', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async startBreak(payload: { technician_id: string }) {
    return this.fetch('/api/break/start/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async endBreak(payload: { technician_id: string }) {
    return this.fetch('/api/break/end/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async logout(payload: { technician_id: string }) {
    return this.fetch('/api/logoutuser/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
