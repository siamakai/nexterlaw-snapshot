import { test, expect, type Page } from '@playwright/test';

test.skip(!process.env.E2E_DATABASE_URL, 'Set E2E_DATABASE_URL to a local database to run end-to-end tests.');

const ANSWERS = ['Yes', 'Yes', 'Yes', 'Not sure', 'Not sure', 'No', 'No', 'No', 'No', 'No'];

async function answerTenQuestions(page: Page) {
  const groups = page.getByRole('radiogroup');
  await expect(groups).toHaveCount(10);
  for (let i = 0; i < 10; i++) await groups.nth(i).getByRole('radio', { name: ANSWERS[i], exact: true }).click();
  await page.getByRole('button', { name: 'Continue →' }).click();
}

async function answerIntake(page: Page) {
  await expect(page.getByRole('heading', { name: 'How new clients reach you' })).toBeVisible();
  for (const label of ['Voicemail or email only', 'Same day', '50–150', 'Clio']) {
    await page.getByRole('radio', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Continue →' }).click();
}

test.describe('UK path', () => {
  test('happy path → results page that survives a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get Your Free Snapshot/ }).click();
    await page.getByRole('button', { name: /Get your instant UK Snapshot/ }).click();
    await answerTenQuestions(page);
    await answerIntake(page);

    await page.getByLabel('Firm name').fill('ZZ TEST E2E Solicitors');
    await page.getByLabel('Firm website').fill('www.e2e-solicitors.co.uk');
    await page.getByRole('checkbox', { name: /Personal Injury/ }).click();
    await page.getByRole('radio', { name: '5–20 fee-earners' }).click();
    await page.getByRole('radiogroup', { name: /EU-based clients/ }).getByRole('radio', { name: 'No', exact: true }).click();
    await page.getByLabel('Work email').fill('e2e-uk@example.com');
    await page.getByLabel(/general information, not legal or regulatory advice/).check();
    await page.getByRole('button', { name: /Generate my Snapshot/ }).click();

    await page.waitForURL(/\/r\/[A-Za-z0-9_-]{32}$/);
    await expect(page.getByRole('heading', { name: 'ZZ TEST E2E Solicitors' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('img', { name: /CLEAR TRUST score 40 out of 100, Developing/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Book a free 20-minute intake review' })).toBeVisible();
    await expect(page.getByText('Three quick wins')).toBeVisible();
    await expect(page.getByText('Unknown').first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'ZZ TEST E2E Solicitors' })).toBeVisible();
    const pdf = await page.request.get(await page.getByRole('link', { name: '↓ Download PDF' }).first().getAttribute('href') as string);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
  });

  test('consent rules: advice box required, marketing optional', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Get Your Free Snapshot/ }).click();
    await page.getByRole('button', { name: /Get your instant UK Snapshot/ }).click();
    await answerTenQuestions(page);
    await answerIntake(page);
    await page.getByLabel('Firm name').fill('ZZ TEST Consent');
    await page.getByRole('checkbox', { name: /Family/ }).click();
    await page.getByRole('radio', { name: 'Just me' }).click();
    await page.getByRole('radiogroup', { name: /EU-based clients/ }).getByRole('radio', { name: 'No', exact: true }).click();
    await page.getByLabel('Work email').fill('e2e-consent@example.com');

    // Marketing ticked, advice not: blocked.
    await page.getByLabel(/Contact me about my results/).check();
    await page.getByRole('button', { name: /Generate my Snapshot/ }).click();
    await expect(page.getByText('Please confirm you understand this is general information, not advice.')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // The error clears as soon as it's fixed, and marketing can be left unticked.
    await page.getByLabel(/Contact me about my results/).uncheck();
    await page.getByLabel(/general information, not legal or regulatory advice/).check();
    await expect(page.getByText('Please confirm you understand this is general information, not advice.')).toHaveCount(0);
    await page.getByRole('button', { name: /Generate my Snapshot/ }).click();
    await page.waitForURL(/\/r\//);
    // "Just me" routes to Skool.
    await expect(page.getByRole('heading', { name: 'Join the Nexter AI Business Club' })).toBeVisible({ timeout: 120_000 });
  });
});

test('Global path → confirmation with instant score and due date', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Get Your Free Snapshot/ }).click();
  await page.getByRole('button', { name: /Get your Global Snapshot/ }).click();
  await page.getByLabel('Country').selectOption('Singapore');
  await page.getByLabel(/primary regulatory body/).fill('Law Society of Singapore');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await answerTenQuestions(page);
  await answerIntake(page);
  const groups = page.getByRole('radiogroup');
  for (let i = 0; i < 3; i++) await groups.nth(i).getByRole('radio', { name: 'Not sure' }).click();
  await page.getByRole('button', { name: 'Continue →' }).click();

  await page.getByLabel('Your name').fill('QA Tester');
  await page.getByLabel('Firm name').fill('ZZ TEST Global E2E');
  await page.getByLabel(/Email address/).fill('e2e-global@example.com');
  await page.getByRole('radio', { name: '2–10 lawyers' }).click();
  await page.getByLabel('Main practice area').selectOption('litigation');
  await page.getByLabel(/general information, not legal or regulatory advice/).check();
  await page.getByRole('button', { name: /Submit my assessment/ }).click();

  await page.waitForURL(/\/r\//);
  await expect(page.getByText('Thank you. Your assessment is with our team.')).toBeVisible();
  await expect(page.getByText(/will arrive by/)).toBeVisible();
  await expect(page.getByRole('img', { name: /CLEAR TRUST score 40 out of 100/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /We.ll be in touch within 48 hours/ })).toBeVisible();
});

test('phone: one question per screen with a progress bar @phone', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Get Your Free Snapshot/ }).click();
  await page.getByRole('button', { name: /Get your instant UK Snapshot/ }).click();
  await expect(page.getByRole('radiogroup')).toHaveCount(1);
  await expect(page.getByRole('progressbar')).toBeVisible();
  await page.getByRole('radio', { name: 'Yes', exact: true }).click();
  await expect(page.getByText('Question 2 of 10')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
