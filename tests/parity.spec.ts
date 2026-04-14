import { test, expect, chromium, Browser, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PHP_URL = 'http://localhost/dvi_b2b/latestitinerary.php?id=41015';
const NEST_URL = 'http://localhost:8080/itinerary-details/DVI202604230';

interface DayHotspots {
  day: number;
  php: { id: number; name: string; order: number }[];
  nest: { id: number; name: string; order: number }[];
  match: boolean;
  differences: string;
}

const comparisonReport: DayHotspots[] = [];

test.describe('PHP vs Nest Itinerary Parity', () => {
  let phpPage: Page;
  let nestPage: Page;
  let browser: Browser;

  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('Load both PHP and Nest URLs', async () => {
    const context = await browser.newContext();
    phpPage = await context.newPage();
    nestPage = await context.newPage();

    console.log('\n🔄 Loading PHP itinerary...');
    await phpPage.goto(PHP_URL);
    await phpPage.waitForTimeout(3000);

    console.log('🔄 Loading Nest itinerary...');
    await nestPage.goto(NEST_URL);
    await nestPage.waitForTimeout(3000);

    // Take initial screenshots
    await phpPage.screenshot({ path: 'tmp/comparison-php-full.png' });
    await nestPage.screenshot({ path: 'tmp/comparison-nest-full.png' });
    console.log('✅ Screenshots captured');
  });

  test('Extract hotspots from PHP itinerary', async () => {
    console.log('\n📋 Extracting PHP hotspots...');

    // PHP uses day-wise structure - look for day containers and hotspot rows
    const days = await phpPage.locator('[data-day-id], .day-container, .itinerary-day').all();
    console.log(`Found ${days.length} day sections in PHP`);

    for (let dayIdx = 1; dayIdx <= 8; dayIdx++) {
      try {
        // Try multiple selectors for hotspots
        const hotspotSelectors = [
          `[data-day="${dayIdx}"] [data-hotspot-id]`,
          `.day-${dayIdx} .hotspot-row`,
          `[class*="day"][class*="${dayIdx}"] [class*="hotspot"]`,
          `.itinerary-day:nth-child(${dayIdx}) [data-hotspot]`,
        ];

        let hotspots = [];
        for (const selector of hotspotSelectors) {
          try {
            hotspots = await phpPage.locator(selector).all();
            if (hotspots.length > 0) {
              console.log(`Day ${dayIdx}: Found ${hotspots.length} hotspots using selector: ${selector}`);
              break;
            }
          } catch {
            // Try next selector
          }
        }

        // Extract hotspot IDs and names
        const dayHotspots = [];
        for (let i = 0; i < hotspots.length; i++) {
          const hotspotId = await hotspots[i].getAttribute('data-hotspot-id');
          const hotspotName = (await hotspots[i].textContent()) || '';
          
          if (hotspotId) {
            dayHotspots.push({
              id: parseInt(hotspotId),
              name: hotspotName.trim(),
              order: i + 1,
            });
          }
        }

        if (dayHotspots.length > 0) {
          console.log(`📍 PHP Day ${dayIdx}: ${dayHotspots.map(h => `${h.id}`).join(', ')}`);
        }

        comparisonReport.push({
          day: dayIdx,
          php: dayHotspots,
          nest: [],
          match: false,
          differences: '',
        });
      } catch (error) {
        console.error(`Error extracting PHP Day ${dayIdx}:`, error);
      }
    }
  });

  test('Extract hotspots from Nest itinerary', async () => {
    console.log('\n📋 Extracting Nest hotspots...');

    // Nest uses different structure - look for hotspot rows in itinerary display
    const dayElements = await nestPage.locator('[class*="day"], [class*="Day"], .itinerary-section').all();
    console.log(`Found ${dayElements.length} day sections in Nest`);

    for (let dayIdx = 1; dayIdx <= 8; dayIdx++) {
      try {
        // Try multiple selectors for Nest hotspots
        const hotspotSelectors = [
          `[data-day-index="${dayIdx - 1}"] [class*="hotspot"]`,
          `.day-${dayIdx} [class*="activity"]`,
          `[class*="Day"] [class*="hotspot"]`,
          `.itinerary-day:nth-child(${dayIdx}) [class*="point"]`,
        ];

        let hotspots = [];
        for (const selector of hotspotSelectors) {
          try {
            hotspots = await nestPage.locator(selector).all();
            if (hotspots.length > 0) {
              console.log(
                `Day ${dayIdx}: Found ${hotspots.length} hotspots using selector: ${selector}`
              );
              break;
            }
          } catch {
            // Try next selector
          }
        }

        const dayHotspots = [];
        for (let i = 0; i < hotspots.length; i++) {
          const text = (await hotspots[i].textContent()) || '';
          // Extract ID from text if it matches "Hotspot ID: 123" or similar
          const idMatch = text.match(/\b(\d{2,4})\b/);
          if (idMatch) {
            dayHotspots.push({
              id: parseInt(idMatch[1]),
              name: text.trim(),
              order: i + 1,
            });
          }
        }

        if (dayHotspots.length > 0) {
          console.log(`📍 Nest Day ${dayIdx}: ${dayHotspots.map(h => `${h.id}`).join(', ')}`);
        }

        // Find and update the corresponding report entry
        const reportEntry = comparisonReport.find(r => r.day === dayIdx);
        if (reportEntry) {
          reportEntry.nest = dayHotspots;
        } else {
          comparisonReport.push({
            day: dayIdx,
            php: [],
            nest: dayHotspots,
            match: false,
            differences: '',
          });
        }
      } catch (error) {
        console.error(`Error extracting Nest Day ${dayIdx}:`, error);
      }
    }
  });

  test('Compare hotspots and generate report', async () => {
    console.log('\n🔍 Comparing hotspots...\n');

    comparisonReport.forEach(day => {
      const phpIds = day.php.map(h => h.id).sort().join(', ');
      const nestIds = day.nest.map(h => h.id).sort().join(', ');
      
      day.match = phpIds === nestIds;

      if (day.match) {
        console.log(`✅ Day ${day.day}: ${phpIds || 'EMPTY'}`);
      } else {
        console.log(`❌ Day ${day.day}:`);
        console.log(`   PHP:  ${phpIds || 'EMPTY'}`);
        console.log(`   Nest: ${nestIds || 'EMPTY'}`);

        // Identify differences
        const phpSet = new Set(day.php.map(h => h.id));
        const nestSet = new Set(day.nest.map(h => h.id));
        
        const missing = Array.from(phpSet).filter(id => !nestSet.has(id));
        const extra = Array.from(nestSet).filter(id => !phpSet.has(id));

        if (missing.length > 0) {
          console.log(`   ⚠️  Missing in Nest: ${missing.join(', ')}`);
        }
        if (extra.length > 0) {
          console.log(`   ⚠️  Extra in Nest: ${extra.join(', ')}`);
        }

        day.differences = `Missing: ${missing.join(', ')} | Extra: ${extra.join(', ')}`;
      }
    });

    // Summary
    const matchCount = comparisonReport.filter(r => r.match).length;
    console.log(`\n📊 Summary: ${matchCount}/${comparisonReport.length} days match\n`);

    // Export report
    const reportPath = 'tmp/parity-comparison-report.json';
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        phpUrl: PHP_URL,
        nestUrl: NEST_URL,
        summary: {
          totalDays: comparisonReport.length,
          matchingDays: matchCount,
          parityAchieved: matchCount === comparisonReport.length,
        },
        dayComparison: comparisonReport,
      }, null, 2),
      'utf-8'
    );

    console.log(`📄 Detailed report saved to ${reportPath}`);

    // Specifically flag Day 5
    const day5 = comparisonReport.find(r => r.day === 5);
    if (day5 && day5.nest.length === 0) {
      console.log('\n⚠️⚠️⚠️ CRITICAL: Day 5 has NO hotspots in Nest but PHP has: ' + 
                  (day5.php.map(h => h.id).join(', ') || 'also none'));
    }

    expect(matchCount).toBeGreaterThan(0);
  });
});
