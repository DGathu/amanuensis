import { prisma } from '../src/lib/prisma';
import * as cheerio from 'cheerio';

const TARGET_URL = 'https://www.brightermonday.co.ke/jobs/software-data';

async function dispatchCourier() {
  console.log(`\n🛡️ Courier dispatched to BrighterMonday...`);
  
  try {
    const response = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const newDiscoveries: any[] = [];
    
    // We target the broad parent elements that typically hold a full job card
    $('div.relative, article, div.flex, div[class*="transform"]').each((_, card) => {
      // Find the specific job link inside this card
      const linkElem = $(card).find('a[href*="/listings/"]').first();
      
      if (linkElem.length > 0) {
        let link = linkElem.attr('href') || "";
        // Ensure the link is a full URL
        link = link.startsWith('http') ? link : `https://www.brightermonday.co.ke${link}`;
        
        // The title is usually the main text of the link, or the first prominent text block
        let title = linkElem.text().trim();
        if (!title || title.length < 5) {
          title = $(card).find('h3, p.text-lg, p[class*="text-xl"]').first().text().trim();
        }

        // The company is usually in an anchor tag pointing to /employer/ or a muted text paragraph
        let company = $(card).find('a[href*="/employer/"]').first().text().trim();
        if (!company) {
            // Fallback: Grab the first gray/muted text block below the title
            company = $(card).find('p.text-sm.text-gray-500, span.text-gray-600, div[class*="text-sm text-gray"]').first().text().trim() || "Unknown Company";
        }
        
        // Clean up excess whitespace
        title = title.replace(/\s+/g, ' ');
        company = company.replace(/\s+/g, ' ');
        
        // Avoid duplicate links in the same scraping run
        if (title && !newDiscoveries.find(d => d.link === link)) {
            newDiscoveries.push({ title, company, link });
        }
      }
    });

    console.log(`📜 Found ${newDiscoveries.length} valid listings on the board.`);
    let addedCount = 0;

    for (const job of newDiscoveries) {
      // Ask the Vault: Do we already have this role?
      const existingJob = await prisma.jobApplication.findFirst({
        where: { role: job.title, company: job.company }
      });

      if (!existingJob) {
        // Record the new quest!
        await prisma.jobApplication.create({
          data: {
            role: job.title,
            company: job.company,
            source: `BrighterMonday`,
            status: 'DRAFT',
            jdSummary: `Link: ${job.link}`, // Temporarily store the link here until Phase 3 AI Tailoring
          }
        });
        addedCount++;
        console.log(`   + New Quest Written: ${job.title} at ${job.company}`);
      }
    }

    console.log(`\n✅ Courier returned. ${addedCount} new roles safely locked in the Vault.`);

  } catch (error) {
    console.error("❌ The courier was ambushed! Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

dispatchCourier();