import { test as base } from '@playwright/test';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { LoginPage } from '../pages/LoginPage';

type PageFixtures = {
    loginPage: LoginPage;
    forgotPasswordPage: ForgotPasswordPage;
};

export const test = base.extend<PageFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    forgotPasswordPage: async ({ page }, use) => {
        await use(new ForgotPasswordPage(page));
    },
});

export { expect } from '@playwright/test';
