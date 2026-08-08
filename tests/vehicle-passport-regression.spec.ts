import { test, expect } from '@playwright/test';

test.describe('CORE-DATA-001 Vehicle Passport Regression Suite', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'https://wms-workshop-app-473233046183.asia-south1.run.app';

  test('Verify API Certification Endpoint Returns PASS with 100% Accuracy', async ({ request }) => {
    // 1. Authenticate
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: 'mustafaladaf50@gmail.com', password: process.env.TEST_USER_PASSWORD }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    // 2. Fetch Certification Report
    const certRes = await request.get(`${BASE_URL}/api/certification/vehicle-passport`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(certRes.ok()).toBeTruthy();
    const { report } = await certRes.json();

    expect(report.scorecard.certificationStatus).toBe('PASS');
    expect(report.scorecard.overallScorePct).toBe(100);
    expect(report.scorecard.dataAccuracyPct).toBe(100);
  });

  test('Verify Vehicle Passport Aggregate for High-History Vehicle KA32AA5833', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: 'mustafaladaf50@gmail.com', password: process.env.TEST_USER_PASSWORD }
    });
    const { token } = await loginRes.json();

    const passportRes = await request.get(`${BASE_URL}/api/vehicle/history?query=KA32AA5833`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(passportRes.ok()).toBeTruthy();
    const data = await passportRes.json();

    expect(data.success).toBe(true);
    expect(data.passportAggregate).toBeDefined();

    const aggregate = data.passportAggregate;
    expect(aggregate.passport.registrationNo).toBe('KA32AA5833');
    expect(aggregate.passport.chassisNo).toBe('MAT808036P1C09968');
    expect(aggregate.customer.name).toBe('GULBARGA ELECTRICITY SUPPLY COMPANY LTD.');
    expect(aggregate.visitLedger.length).toBe(30);

    // Verify 100% enriched visit ledger
    const visitWithJC = aggregate.visitLedger.find((v: any) => v.jobCardNumber.startsWith('JC-'));
    expect(visitWithJC).toBeDefined();
    expect(visitWithJC.jobCardNumber).not.toBe('Not Available');
    expect(visitWithJC.financialJourney.finalInvoiceAmount).toBeGreaterThan(0);
  });

  test('Verify Vehicle Passport Aggregate for KA32AA9194', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: 'mustafaladaf50@gmail.com', password: process.env.TEST_USER_PASSWORD }
    });
    const { token } = await loginRes.json();

    const passportRes = await request.get(`${BASE_URL}/api/vehicle/history?query=KA32AA9194`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(passportRes.ok()).toBeTruthy();
    const data = await passportRes.json();

    expect(data.success).toBe(true);
    expect(data.passportAggregate.visitLedger.length).toBe(64);
  });
});
