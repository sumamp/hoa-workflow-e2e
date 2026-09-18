import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for /forgot-password.
 *
 * Selectors confirmed against the real DOM on stg.hoaworkflow.io on 2026-08-24:
 *   - <input id="fp-email" type="email">
 *   - <button type="submit">Send reset link</button>
 *   - <a href="/login">← Back to sign in</a>
 *   - Confirmation banner: <p role="status" class="...bg-green-100...">
 *       If an account exists for that email, we've sent a link to set a new
 *       password. Check your inbox.</p>
 *     This exact wording is shown for BOTH an existing and a non-existent
 *     email — confirmed by submitting a made-up address
 *     (qa-test-nonexistent-xyz@example.com) and getting the identical
 *     message. That's good practice (no account-enumeration via this form)
 *     and is asserted explicitly in the "no enumeration" test below.
 */
export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly sendResetLinkButton: Locator;
  readonly backToSignInLink: Locator;
  readonly confirmationStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#fp-email');
    this.sendResetLinkButton = page.getByRole('button', { name: 'Send reset link' });
    this.backToSignInLink = page.getByRole('link', { name: '← Back to sign in' });
    this.confirmationStatus = page.getByRole('status');
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  async requestReset(email: string) {
    await this.emailInput.fill(email);
    await this.sendResetLinkButton.click();
  }

  async getValidationMessage(): Promise<string> {
    return this.emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
  }

  async expectConfirmationMessage() {
    await expect(this.confirmationStatus).toBeVisible();
    await expect(this.confirmationStatus).toHaveText(
      "If an account exists for that email, we've sent a link to set a new password. Check your inbox."
    );
  }

  async clickBackToSignIn() {
    await this.backToSignInLink.click();
  }
}
