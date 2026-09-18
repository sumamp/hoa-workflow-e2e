import { expect, test as setup } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../utils/test-data';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
    expect(TEST_USER_EMAIL, 'TEST_USER_EMAIL must be set').toBeTruthy();
    expect(TEST_USER_PASSWORD, 'TEST_USER_PASSWORD must be set').toBeTruthy();

    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(TEST_USER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    const loginError = page.getByRole('alert').filter({ hasText: 'Email or password is incorrect.' });
    await Promise.race([
        page.waitForURL('**/app/dashboard'),
        loginError.waitFor({ state: 'visible' }).then(() => {
            throw new Error('Authentication failed: TEST_USER_EMAIL or TEST_USER_PASSWORD was rejected.');
        }),
    ]);
    await page.context().storageState({ path: authFile });
});