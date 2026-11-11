const E164_PHONE_NUMBER = /^\+[1-9]\d{6,14}$/;

export function normalizePhoneNumber(value: string): string {
  return value.trim().replace(/[\s().-]/g, "");
}

export function isE164PhoneNumber(value: string): boolean {
  return E164_PHONE_NUMBER.test(value);
}

export function firebaseAuthMessage(error: unknown): string {
  const code = firebaseErrorCode(error);

  switch (code) {
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before verification finished.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Enter the phone in international format, such as +9647500000000.";
    case "auth/invalid-verification-code":
      return "That verification code is not correct. Try again.";
    case "auth/code-expired":
      return "That verification code has expired. Request a new code.";
    case "auth/captcha-check-failed":
      return "The reCAPTCHA check failed. Reload the page, complete the check again, and verify that this site domain is authorized in Firebase.";
    case "auth/app-not-authorized":
      return "This site is not authorized for Firebase phone sign-in. Add its hostname to Firebase Authentication authorized domains.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is not enabled for this Firebase project.";
    case "auth/quota-exceeded":
      return "The Firebase SMS quota has been reached. Use a configured test number or try again after the quota resets.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Please wait before trying again.";
    case "auth/network-request-failed":
      return "Firebase could not be reached. Check the network connection and try again.";
    case "auth/invalid-app-credential":
      return "Firebase rejected the reCAPTCHA proof. Reload the page and complete a fresh verification.";
    default:
      return code
        ? `Sign-in could not be completed (${code}). Check the Firebase phone-auth configuration and try again.`
        : "Sign-in could not be completed safely. Please try again.";
  }
}

function firebaseErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
}
