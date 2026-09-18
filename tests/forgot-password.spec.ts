import { test, expect } from '../fixtures/page-fixtures';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USER_EMAIL, UNKNOWN_USER_EMAIL } from '../utils/test-data';

test.describe('Forgot password page', () => {
  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ forgotPasswordPage: pageObject }) => {
    forgotPasswordPage = pageObject;
    await forgotPasswordPage.goto();
  });

  test('submitting with an empty email is rejected by native validation', async () => {
    await forgotPasswordPage.sendResetLinkButton.click();
    const message = await forgotPasswordPage.getValidationMessage();
    expect(message).not.toBe('');
    await expect(forgotPasswordPage.confirmationStatus).not.toBeVisible();
  });

  test('a non-existent email shows the same generic confirmation (no account enumeration)', async () => {
    await forgotPasswordPage.requestReset(UNKNOWN_USER_EMAIL);
    await forgotPasswordPage.expectConfirmationMessage();
  });

  test('a real, existing email shows the identical confirmation message', async () => {
    test.skip(!TEST_USER_EMAIL, 'Requires TEST_USER_EMAIL in .env to compare against a real account');

    await forgotPasswordPage.requestReset(TEST_USER_EMAIL);
    await forgotPasswordPage.expectConfirmationMessage();

    // The real assertion for "no enumeration" is that this text is
    // byte-for-byte identical to the non-existent-email case above —
    // both tests assert the exact same string via expectConfirmationMessage().
  });

  test('"Back to sign in" returns to the login form', async ({ page }) => {
    await forgotPasswordPage.clickBackToSignIn();
    await expect(page).toHaveURL(/\/login/);

    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
  });
});
