import { describe, expect, it } from "vitest";
import { firebaseAuthMessage, isE164PhoneNumber, normalizePhoneNumber } from "./phone-auth";

describe("phone authentication helpers", () => {
  it("normalizes common display separators before calling Firebase", () => {
    expect(normalizePhoneNumber(" +1 650-555-0100 ")).toBe("+16505550100");
    expect(normalizePhoneNumber("+964 (750) 000.0000")).toBe("+9647500000000");
  });

  it("accepts only normalized E.164 phone numbers", () => {
    expect(isE164PhoneNumber("+16505550100")).toBe(true);
    expect(isE164PhoneNumber("+9647500000000")).toBe(true);
    expect(isE164PhoneNumber("+1 650-555-0100")).toBe(false);
    expect(isE164PhoneNumber("07500000000")).toBe(false);
  });

  it("explains Firebase configuration failures instead of hiding them", () => {
    expect(firebaseAuthMessage({ code: "auth/captcha-check-failed" })).toContain("reCAPTCHA");
    expect(firebaseAuthMessage({ code: "auth/app-not-authorized" })).toContain("authorized");
    expect(firebaseAuthMessage({ code: "auth/quota-exceeded" })).toContain("quota");
    expect(firebaseAuthMessage({ code: "auth/sms-region-not-allowed" })).toContain(
      "auth/sms-region-not-allowed",
    );
  });
});
