import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/login');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Task Manager/);
});

test('login form is visible', async ({ page }) => {
    await page.goto('/login');

    // Check for email and password fields
    await expect(page.getByPlaceholder('johnsmith007')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••••••')).toBeVisible();

    // Check for sign in button
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
