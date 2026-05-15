import { test, expect } from '@playwright/test';

test('@visual smoke: synthetic fixture renders deterministically', async ({ page }) => {
  await page.setContent(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>body{margin:40px;font-family:sans-serif;background:#fff;color:#111}</style></head>
<body>
  <h1>Visual Regression Smoke</h1>
  <p>Deterministic fixture — no external resources.</p>
</body>
</html>`);
  await expect(page).toHaveScreenshot('root.png', { fullPage: true, threshold: 0, timeout: 30000 });
});
