import { test, expect } from '../fixtures/page-fixtures';
import { LoginPage } from '../pages/LoginPage';
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  UNKNOWN_USER_EMAIL,
} from '../utils/test-data';

// Skip the tests that need a real, working QA account when credentials
// haven't been provided via env vars, instead of failing noisily in CI.
const hasRealCredentials = Boolean(TEST_USER_EMAIL && TEST_USER_PASSWORD);

test.describe('Login page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ loginPage: pageObject }) => {
    loginPage = pageObject;
    await loginPage.goto();
  });

  test.describe('1. Happy path', () => {
    test('valid credentials log the user in and leave /login', async ({ page }) => {
      test.skip(!hasRealCredentials, 'Requires TEST_USER_EMAIL / TEST_USER_PASSWORD in .env');

      await loginPage.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await loginPage.expectLoggedIn();

      // TODO: once the intended default landing page per role is confirmed,
      // replace the generic "left /login" check above with something
      // stronger, e.g.:
      // await expect(page).toHaveURL(/\/app\/dashboard/);
    });

    test('session survives a page reload after login', async ({ page }) => {
      test.skip(!hasRealCredentials, 'Requires TEST_USER_EMAIL / TEST_USER_PASSWORD in .env');

      await loginPage.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await loginPage.expectLoggedIn();

      await page.reload();
      await loginPage.expectStillOnLoginPage().catch(() => {
        // expected NOT to be on the login page; invert the assertion below
      });
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('2. Field validation', () => {
    test('submitting with both fields empty shows native required validation on Email', async () => {
      await loginPage.submit();
      const message = await loginPage.getValidationMessage(loginPage.emailInput);
      expect(message).not.toBe('');
    });

    test('submitting with Email filled and Password empty validates Password', async () => {
      await loginPage.fillEmail('someone@example.com');
      await loginPage.submit();
      const message = await loginPage.getValidationMessage(loginPage.passwordInput);
      expect(message).not.toBe('');
    });

    test('malformed email (missing @) is rejected by native validation before submit', async () => {
      await loginPage.fillEmail('notanemail');
      await loginPage.fillPassword('whatever123');
      await loginPage.submit();

      const message = await loginPage.getValidationMessage(loginPage.emailInput);
      expect(message.toLowerCase()).toContain('@');
      // Should not have attempted a network round-trip / shown the server error.
      await expect(loginPage.errorAlert).not.toBeVisible();
    });

    test('email is treated case-insensitively at login', async () => {
      test.skip(!hasRealCredentials, 'Requires TEST_USER_EMAIL / TEST_USER_PASSWORD in .env');

      const shouted = TEST_USER_EMAIL.toUpperCase();
      await loginPage.login(shouted, TEST_USER_PASSWORD);
      await loginPage.expectLoggedIn();
    });

    test('long input in both fields does not crash the form', async () => {
      const longString = 'a'.repeat(500);
      await loginPage.fillEmail(`${longString}@example.com`);
      await loginPage.fillPassword(longString);
      await loginPage.submit();

      // We don't know the exact server response for this shape of input;
      // the assertion here is just "the app is still alive and on a sane
      // page", not a specific error message.
      await expect(loginPage.page.locator('body')).toBeVisible();
    });

    test('basic injection-style strings are treated as plain incorrect credentials, not executed', async ({ page }) => {
      const payload = "' OR '1'='1";
      await loginPage.fillEmail(`${payload}@example.com`);
      await loginPage.fillPassword('<script>window.__xss = true;</script>');
      await loginPage.submit();

      const wasExecuted = await page.evaluate(() => (window as any).__xss === true);
      expect(wasExecuted).toBe(false);
    });
  });

  test.describe('3. Invalid credentials', () => {
    test('wrong password for a real email shows the generic incorrect-credentials error', async () => {
      test.skip(!hasRealCredentials, 'Requires TEST_USER_EMAIL in .env to exercise a real account');

      await loginPage.login(TEST_USER_EMAIL, 'definitely-the-wrong-password-123');
      await loginPage.expectIncorrectCredentialsError();
      await loginPage.expectStillOnLoginPage();
    });

    test('an email with no account shows the SAME generic error (no user enumeration)', async () => {
      await loginPage.login(UNKNOWN_USER_EMAIL, 'whatever-password-123');
      await loginPage.expectIncorrectCredentialsError();
    });
  });

  test.describe('4. Password field behavior', () => {
    test('the eye icon toggles the password field between masked and plaintext', async () => {
      await loginPage.fillPassword('SuperSecret123');
      expect(await loginPage.isPasswordVisible()).toBe(false);

      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(true);
      await expect(loginPage.passwordInput).toHaveValue('SuperSecret123');

      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(false);
    });

    test('KNOWN ISSUE: toggle button accessible name does not reflect visibility state', async () => {
      // This documents observed (buggy) behavior rather than desired
      // behavior. The aria-label stays "Show password" even once the
      // password is visible, so a screen-reader user gets no indication
      // the state changed. Flip this assertion once it's fixed upstream,
      // and rename the test.
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(true);
      await expect(loginPage.togglePasswordButton).toHaveAttribute('aria-label', 'Show password');
    });
  });

  test.describe('5. Google SSO', () => {
    // Full OAuth round-trips need a real Google test account and are not
    // suitable for a headless CI run against a third party. We only assert
    // the button exists and is wired to *something* (a real redirect),
    // without following it to completion.
    test('Continue with Google is present and initiates a navigation', async ({ page }) => {
      await expect(loginPage.continueWithGoogleButton).toBeVisible();

      const [popupOrNav] = await Promise.all([
        page
          .waitForEvent('popup', { timeout: 5000 })
          .catch(() => page.waitForURL(/accounts\.google\.com/, { timeout: 5000 }).catch(() => null)),
        loginPage.clickContinueWithGoogle(),
      ]);

      expect(popupOrNav).not.toBeNull();
    });
  });

  test.describe('6. Forgot password entry point', () => {
    test('link navigates to /forgot-password', async ({ page }) => {
      await loginPage.clickForgotPassword();
      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  test.describe('10. Accessibility', () => {
    test('tab order moves Email -> Password -> toggle -> Sign in', async ({ page }) => {
      await loginPage.emailInput.focus();
      await expect(loginPage.emailInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.togglePasswordButton).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.signInButton).toBeFocused();
    });

    test('pressing Enter in the password field submits the form', async () => {
      await loginPage.fillEmail(UNKNOWN_USER_EMAIL);
      await loginPage.passwordInput.fill('wrongpassword123');
      await loginPage.passwordInput.press('Enter');
      await loginPage.expectIncorrectCredentialsError();
    });

    test('both fields have accessible labels', async ({ page }) => {
      await expect(page.getByLabel('Email')).toBeVisible();
      //await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    });

    test('the error message uses role="alert" so it is announced automatically', async () => {
      await loginPage.login(UNKNOWN_USER_EMAIL, 'wrongpassword123');
      await expect(loginPage.errorAlert).toBeVisible();
      // getByRole('alert') already asserts the role; this is just making
      // the intent explicit for anyone reading the test.
    });
  });
});

// Run a subset of the most important checks at a 375px mobile viewport.
// Tagged @mobile-375 so it only runs under the "mobile-chrome-375" project
// (see playwright.config.ts) and is excluded from the desktop "chromium"
// project, instead of silently running at desktop width under both.
test.describe('9. Mobile layout (375px) @mobile-375', () => {
  test('form controls are visible without horizontal scroll', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeInViewport();
    await expect(loginPage.passwordInput).toBeInViewport();
    await expect(loginPage.signInButton).toBeInViewport();
    await expect(loginPage.continueWithGoogleButton).toBeInViewport();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
