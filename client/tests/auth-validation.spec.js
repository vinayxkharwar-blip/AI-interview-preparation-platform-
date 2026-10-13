import { test, expect } from '@playwright/test';

test.describe('Authentication and Email Validation', () => {

  test.describe('Login Form Email Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    });

    const invalidEmails = ['a@', 'abc', 'a@@b.com', 'a@b', '@gmail.com'];

    for (const invalidEmail of invalidEmails) {
      test(`rejects invalid email format "${invalidEmail}" with clear error message`, async ({ page }) => {
        await page.fill('#email', invalidEmail);
        await page.fill('#password', 'ValidPassword123');
        await page.click('#login-submit');

        const errorBanner = page.locator('[data-testid="error-message"]');
        await expect(errorBanner).toBeVisible();
        await expect(errorBanner).toContainText('Please enter a valid email address.');
      });
    }

    test('rejects empty email and password submission', async ({ page }) => {
      await page.click('#login-submit');

      const errorBanner = page.locator('[data-testid="error-message"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Please fill in both email and password.');
    });

    test('rejects submission with valid password but empty email', async ({ page }) => {
      await page.fill('#password', 'ValidPassword123');
      await page.click('#login-submit');

      const errorBanner = page.locator('[data-testid="error-message"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Please fill in both email and password.');
    });

    test('displays generic error for unknown account credentials', async ({ page }) => {
      const unknownEmail = `unknown_candidate_${Date.now()}@testdomain.com`;
      await page.fill('#email', unknownEmail);
      await page.fill('#password', 'IncorrectPassword123');
      await page.click('#login-submit');

      const errorBanner = page.locator('[data-testid="error-message"]');
      await expect(errorBanner).toBeVisible();
      // Verifies generic error without leaking whether account exists
      await expect(errorBanner).toContainText('Invalid');
    });
  });

  test.describe('Register Form Email Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
    });

    const invalidEmails = ['a@', 'abc', 'a@@b.com', 'a@b', '@gmail.com'];

    for (const invalidEmail of invalidEmails) {
      test(`rejects invalid email format "${invalidEmail}" during registration`, async ({ page }) => {
        await page.fill('#name', 'Candidate Test');
        await page.fill('#email', invalidEmail);
        await page.fill('#password', 'ValidPassword123');
        await page.click('#register-submit');

        const errorBanner = page.locator('[data-testid="error-message"]');
        await expect(errorBanner).toBeVisible();
        await expect(errorBanner).toContainText('Please enter a valid email address.');
      });
    }

    test('rejects empty fields during registration', async ({ page }) => {
      await page.click('#register-submit');

      const errorBanner = page.locator('[data-testid="error-message"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Please fill in all required fields.');
    });

    test('rejects registration with short password (< 6 chars)', async ({ page }) => {
      await page.fill('#name', 'Candidate Short');
      await page.fill('#email', 'candidate@validemail.com');
      await page.fill('#password', '12345');
      await page.click('#register-submit');

      const errorBanner = page.locator('[data-testid="error-message"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Password must be at least 6 characters long.');
    });
  });

  test.describe('End-to-End Registration & Login Lifecycle', () => {
    const timestamp = Date.now();
    const uniqueEmail = `playwright_candidate_${timestamp}@example.com`;
    const password = 'StrongPassword123!';

    test('registers successfully with leading/trailing spaces in email and logs in', async ({ page }) => {
      // 1. Register with email having leading and trailing whitespace
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      await page.fill('#name', 'Playwright Tester');
      await page.fill('#email', `  ${uniqueEmail}  `);
      await page.fill('#password', password);
      await page.fill('#targetRole', 'Senior Frontend Engineer');
      await page.click('#register-submit');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

      // 2. Navigate to login and log in with the new user using mixed case & spaces
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await page.fill('#email', `  ${uniqueEmail.toUpperCase()}  `);
      await page.fill('#password', password);
      await page.click('#login-submit');

      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    });
  });

});
