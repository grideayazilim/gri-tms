import { test as base } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);

    // Test bittikten sonra tarayıcıdaki coverage verisini çekiyoruz
    if (!page.isClosed()) {
      try {
        const coveragePromise = page.evaluate(() => (window as any).__coverage__);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
        const coverage = await Promise.race([coveragePromise, timeoutPromise]);
        
        if (coverage) {
          const outputDir = path.join(process.cwd(), '.nyc_output');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const fileName = `playwright_coverage_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
          fs.writeFileSync(
            path.join(outputDir, fileName),
            JSON.stringify(coverage)
          );
        }
      } catch (error) {
        // Sayfa kapandıysa veya hata oluştuysa hata vermemesi için yutuyoruz
      }
    }
  },
});

export { expect } from '@playwright/test';
