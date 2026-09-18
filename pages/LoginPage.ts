import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for /login.
 *
 * Selectors below were confirmed against the real DOM on stg.hoaworkflow.io
 * on 2026-08-24:
 *   - <input id="email" type="email">
 *   - <input id="password" type="password"> (type flips to "text" when shown)
 *   - <button aria-label="Show password">  <-- NOTE: aria-label does NOT flip
 *       to "Hide password" once the password is revealed. This looks like an
 *       accessibility bug (a screen reader user gets no signal the state
 *       changed) rather than a test-authoring mistake — see the a11y test
 *       below, which documents the current (buggy) behavior rather than
 *       asserting the "correct" one. Update BOTH the locator and that test
 *       once it's fixed.
 *   - <button type="submit">Sign in</button>
 *   - <button>Continue with Google</button>
 *   - <a href="/forgot-password">Forgot password?</a>
 *   - <a href="mailto:hello@hoaworkflow.io">hello@hoaworkflow.io</a>
 *   - Error banner: <p role="alert" class="...bg-red-100...">Email or
 *       password is incorrect.</p> — role="alert" means this line IS
 *       announced to assistive tech automatically; no separate aria-live
 *       wiring needed.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly togglePasswordButton: Locator;
  readonly signInButton: Locator;
  readonly continueWithGoogleButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly noAccountMailtoLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.togglePasswordButton = page.getByRole('button', { name: /show password|hide password/i });
    this.signInButton = page.getByRole('button', { name: 'Sign in', exact: true });
    this.continueWithGoogleButton = page.getByRole('button', { name: 'Continue with Google' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.noAccountMailtoLink = page.getByRole('link', { name: 'hello@hoaworkflow.io' });
    // this.errorAlert = page.getByRole('alert');
    // LoginPage.ts
    this.errorAlert = page.getByRole('alert').filter({ hasText: /./ });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.signInButton.click();
  }

  /** Fills both fields and submits in one call — the common case for most tests. */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async togglePasswordVisibility() {
    await this.togglePasswordButton.click();
  }

  async isPasswordVisible(): Promise<boolean> {
    return (await this.passwordInput.getAttribute('type')) === 'text';
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickContinueWithGoogle() {
    await this.continueWithGoogleButton.click();
  }

  /** Native browser validation message Chrome/Firefox attach to a required/invalid field. */
  async getValidationMessage(input: Locator): Promise<string> {
    return input.evaluate((el: HTMLInputElement) => el.validationMessage);
  }

  async expectIncorrectCredentialsError() {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toHaveText('Email or password is incorrect.');
  }

  async expectLoggedIn() {
    // Successful login navigates away from /login. Adjust the expected
    // path/heading below once the intended default landing page per role
    // is confirmed (see login.spec.ts TODO).
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'));
  }

  async expectStillOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/);
  }
}
