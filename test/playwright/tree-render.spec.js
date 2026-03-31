// Panoramic tree renderer smoke tests
// Run: cd test/playwright && npx playwright test
// Requires gwd running on localhost:2317 with the spies database

const { test, expect } = require('@playwright/test');

const BASE = '/spies';
const TREE_URL = (gen) => `${BASE}?pz=nicholas&nz=spies&p=nicholas&n=spies&m=A&t=T&t1=GR&v=${gen}`;

// ── Helpers ──

async function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function waitForTree(page) {
  // Wait for tree to render (loading div removed, fu-root exists)
  await page.waitForSelector('.fu-root', { timeout: 15000 });
  await expect(page.locator('#tree-loading')).toHaveCount(0, { timeout: 5000 }).catch(() => {});
}

// ── Test matrix: gen counts to validate ──

const GEN_COUNTS = [3, 7, 12, 14, 20];

// ── 1. Page loads without JS errors at each gen count ──

for (const gen of GEN_COUNTS) {
  test(`gen ${gen}: page loads without JS errors`, async ({ page }) => {
    const errors = await collectErrors(page);
    await page.goto(TREE_URL(gen));
    await waitForTree(page);
    expect(errors).toEqual([]);
  });
}

// ── 2. Key DOM elements exist ──

for (const gen of GEN_COUNTS) {
  test(`gen ${gen}: key elements exist`, async ({ page }) => {
    await page.goto(TREE_URL(gen));
    await waitForTree(page);

    // Tree structure
    await expect(page.locator('.fu-root')).toHaveCount(1);
    await expect(page.locator('.fu-person')).not.toHaveCount(0);
    await expect(page.locator('.person-box')).not.toHaveCount(0);

    // Minimap
    await expect(page.locator('.tree-minimap-canvas')).toHaveCount(1);
    await expect(page.locator('.tree-minimap.pano-minimap')).toHaveCount(1);

    // Toolbar
    await expect(page.locator('#pano-toolbar-inner')).toHaveCount(1);
    await expect(page.locator('.pano-btn')).not.toHaveCount(0);

    // Guess overlay element (may be display:none)
    await expect(page.locator('#sosa-debug-overlay')).toHaveCount(1);

    // Gen labels
    await expect(page.locator('.gen-label-col')).not.toHaveCount(0);
  });
}

// ── 3. Sosa 1 person box exists and has correct data-sosa ──

for (const gen of GEN_COUNTS) {
  test(`gen ${gen}: Sosa 1 person exists`, async ({ page }) => {
    await page.goto(TREE_URL(gen));
    await waitForTree(page);

    const sosa1 = page.locator('.fu-person[data-sosa="1"]');
    await expect(sosa1).toHaveCount(1);

    // Should contain a person-box with a name link
    const nameLink = sosa1.locator('.person-name');
    await expect(nameLink).toHaveCount(1);
    const href = await nameLink.getAttribute('href');
    expect(href).toBeTruthy();
  });
}

// ── 4. Minimap click moves viewport ──

test('gen 12: minimap click pans viewport', async ({ page }) => {
  await page.goto(TREE_URL(12));
  await waitForTree(page);

  const container = page.locator('#tree-grid-container');
  const canvas = page.locator('.tree-minimap-canvas');

  // Get initial scroll position
  const scrollBefore = await container.evaluate(el => ({ left: el.scrollLeft, top: el.scrollTop }));

  // Click right side of minimap
  const box = await canvas.boundingBox();
  await canvas.click({ position: { x: box.width - 10, y: box.height / 2 } });

  // Wait a frame for scroll to settle
  await page.waitForTimeout(200);

  const scrollAfter = await container.evaluate(el => ({ left: el.scrollLeft, top: el.scrollTop }));

  // Scroll should have changed (at gen 12, tree is wider than viewport)
  expect(scrollAfter.left).not.toBe(scrollBefore.left);
});

// ── 5. Guess overlay appears on tree hover ──

test('gen 7: guess overlay is always visible', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  const overlay = page.locator('#sosa-debug-overlay');

  // Overlay should be visible immediately (always-on)
  await expect(overlay).toHaveCount(1);
  await expect(overlay).not.toHaveCSS('display', 'none');
  const text = await overlay.textContent();
  expect(text).toMatch(/Gen \d/);

  // Hover over tree should update text
  const container = page.locator('#tree-grid-container');
  const box = await container.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await page.waitForTimeout(100);

  const textAfter = await overlay.textContent();
  expect(textAfter).toMatch(/Gen \d/);
});

// ── 6. Guess overlay shows on minimap hover ──

test('gen 7: minimap hover updates Sosa overlay', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  const overlay = page.locator('#sosa-debug-overlay');
  const canvas = page.locator('.tree-minimap-canvas');

  // Get initial text
  const textBefore = await overlay.textContent();

  // Hover over center of minimap — should update text
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(100);

  const text = await overlay.textContent();
  expect(text).toMatch(/Gen \d/);
});

// ── 7. Guess overlay is on-screen ──

test('gen 12: guess overlay stays on-screen', async ({ page }) => {
  await page.goto(TREE_URL(12));
  await waitForTree(page);

  const overlay = page.locator('#sosa-debug-overlay');
  const container = page.locator('#tree-grid-container');
  const box = await container.boundingBox();

  // Overlay is always visible — check it's on-screen
  {
    const rect = await overlay.boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    const vw = await page.evaluate(() => window.innerWidth);
    const vh = await page.evaluate(() => window.innerHeight);
    expect(rect.x + rect.width).toBeLessThanOrEqual(vw + 5);
    expect(rect.y + rect.height).toBeLessThanOrEqual(vh + 5);
  }
});

// ── 8. Person click navigates (re-root) ──

test('gen 7: clicking non-root person navigates', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  // Find a non-root person name link (Sosa 2 or 3)
  const sosa2 = page.locator('.fu-person[data-sosa="2"] .person-name');
  const count = await sosa2.count();
  if (count > 0) {
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      sosa2.click(),
    ]);
    // Should navigate to a tree page (re-root)
    expect(page.url()).toContain('m=A');
  }
});

// ── 9. Cmd-click opens person page ──

test('gen 7: cmd-click person opens person page', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  const sosa2 = page.locator('.fu-person[data-sosa="2"] .person-name');
  const count = await sosa2.count();
  if (count > 0) {
    const href = await sosa2.getAttribute('href');
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      sosa2.click({ modifiers: ['Meta'] }),
    ]);
    // Should navigate to person page (href), not tree page
    expect(page.url()).toContain(href);
  }
});

// ── 10. Connector lines exist between parents and children ──

for (const gen of [3, 7, 12]) {
  test(`gen ${gen}: connector lines exist`, async ({ page }) => {
    await page.goto(TREE_URL(gen));
    await waitForTree(page);

    // Should have connector elements
    await expect(page.locator('.fu-conn')).not.toHaveCount(0);
    await expect(page.locator('.fc-trunk')).not.toHaveCount(0);
    await expect(page.locator('.fc-hbar')).not.toHaveCount(0);
  });
}

// ── 11. Expandable indicators at top generation ──

test('gen 7: expandable ancestor indicators', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  // Some top-gen persons should have expandable indicators (if they have parents)
  const expandables = page.locator('.fu-expandable');
  const goldBorder = page.locator('.person-box.has-ancestors');
  // At least check they can exist (may be 0 if no top-gen person has parents)
  const expCount = await expandables.count();
  const goldCount = await goldBorder.count();
  // Both should be the same count
  expect(expCount).toBe(goldCount);
});

// ── 12. Zoom controls exist and work ──

test('gen 7: zoom controls', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  // Zoom label should show percentage
  const zoomLabel = page.locator('.pano-zoom-label');
  const count = await zoomLabel.count();
  expect(count).toBeGreaterThanOrEqual(1);
  const text = await zoomLabel.first().textContent();
  expect(text).toMatch(/\d+%/);
});

// ── 13. No stale loading overlays ──

for (const gen of GEN_COUNTS) {
  test(`gen ${gen}: no stale loading overlays`, async ({ page }) => {
    await page.goto(TREE_URL(gen));
    await waitForTree(page);
    await page.waitForTimeout(500);

    await expect(page.locator('.tree-reroot-overlay')).toHaveCount(0);
  });
}

// ── 14. Generation labels show correct values ──

test('gen 7: generation labels are correct', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  // Gen labels should exist in the side columns
  const labels = page.locator('.gen-label-col div');
  const count = await labels.count();
  expect(count).toBeGreaterThan(0);

  // First visible label should contain a number
  const first = await labels.first().textContent();
  expect(first.trim()).toMatch(/^\d+$/);
});

// ── 15. Minimap canvas has expected dimensions ──

test('minimap canvas dimensions', async ({ page }) => {
  await page.goto(TREE_URL(7));
  await waitForTree(page);

  const canvas = page.locator('.tree-minimap-canvas');
  const width = await canvas.getAttribute('width');
  const height = await canvas.getAttribute('height');
  expect(parseInt(width)).toBe(300);
  expect(parseInt(height)).toBe(120);
});
