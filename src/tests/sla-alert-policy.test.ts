import { describe, it, expect } from "vitest";
import { parseSlaAlertSetting, SLA_ALERT_SETTING_KEY } from "../core/workshop/sla-alert-policy";

/**
 * The SLA-breach alert toggle exists for the production-testing period: alerts
 * are SUPPRESSED by default and an admin/developer flips them on only once the
 * handoff SLA is trusted against real arrivals. The parser encodes that policy:
 * enabled ONLY when the stored value is exactly 'true'; everything else — a
 * missing row, 'false', or garbage — keeps the alerts quiet.
 */
describe("parseSlaAlertSetting", () => {
  it("is suppressed (false) when the settings row is absent — the testing-period default", () => {
    expect(parseSlaAlertSetting([])).toBe(false);
    expect(parseSlaAlertSetting(undefined)).toBe(false);
    expect(parseSlaAlertSetting(null)).toBe(false);
  });

  it("is enabled (true) only when the stored value is exactly 'true'", () => {
    expect(parseSlaAlertSetting([{ setting_value: "true" }])).toBe(true);
    expect(parseSlaAlertSetting([{ setting_value: "TRUE" }])).toBe(true);
    expect(parseSlaAlertSetting([{ setting_value: "  true  " }])).toBe(true);
  });

  it("stays suppressed for any non-'true' value", () => {
    expect(parseSlaAlertSetting([{ setting_value: "false" }])).toBe(false);
    expect(parseSlaAlertSetting([{ setting_value: "off" }])).toBe(false);
    expect(parseSlaAlertSetting([{ setting_value: "1" }])).toBe(false);
    expect(parseSlaAlertSetting([{ setting_value: "" }])).toBe(false);
    expect(parseSlaAlertSetting([{ setting_value: null }])).toBe(false);
  });

  it("exposes the canonical settings key", () => {
    expect(SLA_ALERT_SETTING_KEY).toBe("sla_breach_alerts_enabled");
  });
});
