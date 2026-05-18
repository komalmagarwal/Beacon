import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Referer': 'https://www.google.com/'
};

// --- Lu.ma ---
async function scrapeLuma() {
  console.log('Scraping Lu.ma...');
  try {
    const res = await axios.get('https://lu.ma/api/discover/get-events', {
      params: { latitude: 51.5074, longitude: -0.1278, radius: 25 },
      headers: { ...HEADERS, 'Accept': 'application/json' },
      timeout: 10000
    });
    const items = res.data?.entries || res.data?.events || [];
    const events = items.slice(0, 15).map(e => ({
      title: e.event?.name || e.name || 'Lu.ma Event',
      url: `https://lu.ma/${e.event?.url || e.url || ''}`,
      source: 'Lu.ma',
      type: detectType(e.event?.name || e.name || ''),
      date: e.event?.start_at ? new Date(e.event.start_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'See link',
      org: e.event?.hosts?.[0]?.name || e.calendar?.name || 'Lu.ma',
      desc: e.event?.description?.substring(0, 200) || 'London startup event on Lu.ma.'
    }));
    console.log(`  Lu.ma: ${events.length} events`);
    return events;
  } catch (err) {
    console.log(`  Lu.ma: fallback to curated list (${err.message})`);
    return [{
      title: 'London Startup Events — Lu.ma',
      url: 'https://lu.ma/london',
      source: 'Lu.ma',
      type: 'Networking',
      date: 'This week — check lu.ma/london',
      org: 'Lu.ma London',
      desc: 'Lu.ma hosts dozens of London startup events weekly — founder dinners, investor meetups, demo nights. Browse lu.ma/london for this week.'
    }];
  }
}

// --- Eventbrite ---
async function scrapeEventbrite() {
  console.log('Scraping Eventbrite...');
  try {
    const searches = [
      'https://www.eventbrite.co.uk/d/united-kingdom--london/startup/',
      'https://www.eventbrite.co.uk/d/united-kingdom--london/pitch-competition/',
      'https://www.eventbrite.co.uk/d/united-kingdom--london/venture-capital/',
    ];
    const allEvents = [];
    for (const url of searches) {
      try {
        const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
        const $ = cheerio.load(res.data);
        const selectors = ['[data-testid="event-card"]', '.eds-event-card', 'article', '.search-event-card-wrapper'];
        for (const sel of selectors) {
          $(sel).each((_, el) => {
            const title = $(el).find('h2, h3, [class*="title"]').first().text().trim();
            const href = $(el).find('a').first().attr('href');
            const date = $(el).find('time, [class*="date"]').first().text().trim();
            const org = $(el).find('[class*="organizer"], [class*="org-name"]').first().text().trim();
            if (title && title.length > 5 && !allEvents.find(e => e.title === title)) {
              allEvents.push({
                title: title.substring(0, 100),
                url: href?.startsWith('http') ? href : `https://www.eventbrite.co.uk${href || ''}`,
                source: 'Eventbrite',
                type: detectType(title),
                date: date.substring(0, 50) || 'See link',
                org: org.substring(0, 60) || 'See Eventbrite',
                desc: `${title} — London startup event on Eventbrite.`
              });
            }
          });
          if (allEvents.length > 5) break;
        }
      } catch (e) { /* continue */ }
    }
    const unique = dedup(allEvents).slice(0, 12);
    console.log(`  Eventbrite: ${unique.length} events`);
    return unique;
  } catch (err) {
    console.log(`  Eventbrite failed: ${err.message}`);
    return [];
  }
}

// --- Meetup ---
async function scrapeMeetup() {
  console.log('Scraping Meetup.com...');
  try {
    const query = `{ results: keywordSearch(filter: { query: "startup founder London", lat: 51.5074, lon: -0.1278, radius: 25 }, input: { first: 12 }) { edges { node { result { ... on Event { title eventUrl dateTime group { name } description } } } } } }`;
    const res = await axios.post('https://www.meetup.com/gql', { query }, {
      headers: { ...HEADERS, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 10000
    });
    const edges = res.data?.data?.results?.edges || [];
    const events = edges.map(e => {
      const node = e.node?.result;
      return {
        title: node?.title || '',
        url: node?.eventUrl || 'https://www.meetup.com',
        source: 'Meetup',
        type: detectType(node?.title || ''),
        date: node?.dateTime ? new Date(node.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'See link',
        org: node?.group?.name || 'Meetup Community',
        desc: node?.description?.substring(0, 200) || 'London startup community event.'
      };
    }).filter(e => e.title.length > 3);
    console.log(`  Meetup: ${events.length} events`);
    return events;
  } catch (err) {
    console.log(`  Meetup failed: ${err.message}`);
    return [];
  }
}

// --- Innovate UK ---
async function scrapeInnovateUK() {
  console.log('Scraping Innovate UK...');
  try {
    const res = await axios.get('https://www.ukri.org/opportunity/', {
      params: { 'filter_council': 'innovate-uk', 'filter_status': 'open' },
      headers: HEADERS,
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    const grants = [];
    $('.opportunity-listing__item, article, [class*="opportunity"]').each((_, el) => {
      const title = $(el).find('h2, h3, h4, a').first().text().trim();
      const href = $(el).find('a').first().attr('href');
      const deadline = $(el).find('[class*="deadline"], [class*="date"], [class*="close"]').first().text().trim();
      const desc = $(el).find('p').first().text().trim();
      if (title && title.length > 5) {
        grants.push({
          title: title.substring(0, 100),
          url: href?.startsWith('http') ? href : `https://www.ukri.org${href || '/opportunity/'}`,
          source: 'Innovate UK',
          type: 'Grant',
          date: deadline?.substring(0, 50) || 'Check deadline',
          org: 'Innovate UK / UKRI',
          desc: desc?.substring(0, 200) || 'UK government innovation grant. Check UKRI for current deadlines.'
        });
      }
    });
    if (grants.length === 0) grants.push({
      title: 'Innovate UK — Open Funding Competitions',
      url: 'https://www.ukri.org/opportunity/?filter_council=innovate-uk',
      source: 'Innovate UK',
      type: 'Grant',
      date: 'Multiple open now',
      org: 'Innovate UK / UKRI',
      desc: 'Innovate UK has multiple open funding competitions for UK startups. Grants from £25k to £10m+ for R&D and innovation. Healthtech and deeptech are priority areas right now.'
    });
    console.log(`  Innovate UK: ${grants.length} opportunities`);
    return grants.slice(0, 6);
  } catch (err) {
    console.log(`  Innovate UK: fallback (${err.message})`);
    return [{
      title: 'Innovate UK — Open Funding Competitions',
      url: 'https://www.ukri.org/opportunity/?filter_council=innovate-uk',
      source: 'Innovate UK',
      type: 'Grant',
      date: 'Multiple open now',
      org: 'Innovate UK / UKRI',
      desc: 'UK government grants for innovative startups. Multiple competitions open. Healthtech, deeptech, and climate-tech are current priority areas.'
    }];
  }
}

// --- Accelerators ---
async function scrapeAccelerators() {
  console.log('Scraping accelerators...');
  const accelerators = [
    { name: 'Entrepreneur First (EF)', url: 'https://www.joinef.com/apply/', org: 'EF' },
    { name: 'Antler London', url: 'https://www.antler.co/location/london', org: 'Antler' },
    { name: 'Seedcamp', url: 'https://seedcamp.com/apply/', org: 'Seedcamp' },
    { name: 'Techstars London', url: 'https://www.techstars.com/accelerators/london', org: 'Techstars' },
    { name: 'Zinc VC', url: 'https://zinc.vc/apply', org: 'Zinc' },
    { name: 'Founder Factory', url: 'https://founderfactory.com/apply/', org: 'Founder Factory' }
  ];
  const results = await Promise.all(accelerators.map(async (acc) => {
    try {
      const res = await axios.get(acc.url, { headers: HEADERS, timeout: 8000 });
      const $ = cheerio.load(res.data);
      const desc = $('meta[name="description"]').attr('content') || $('h1').first().text().trim() || '';
      return { title: acc.name, url: acc.url, source: acc.org, type: 'Accelerator', date: 'Rolling / check website', org: acc.org, desc: desc.substring(0, 200) || `${acc.name} — London accelerator.` };
    } catch (e) {
      return { title: acc.name, url: acc.url, source: acc.org, type: 'Accelerator', date: 'Check website', org: acc.org, desc: `${acc.name} — London accelerator. Check website for current cohort deadlines.` };
    }
  }));
  console.log(`  Accelerators: ${results.length} programs`);
  return results;
}

// --- VC Office Hours ---
async function scrapeVCOfficeHours() {
  console.log('Loading VC opportunities...');
  const vcOpps = [
    { title: 'Balderton Capital — Founder Office Hours', url: 'https://www.balderton.com/founders/', source: 'Balderton', type: 'Office Hours', date: 'Monthly — check website', org: 'Balderton Capital', desc: 'Balderton runs regular office hours for UK founders. Seed and Series A focus. Apply through their website.' },
    { title: 'Index Ventures — Open Pitch Days', url: 'https://www.indexventures.com/founders/', source: 'Index Ventures', type: 'Investor Event', date: 'Quarterly — check website', org: 'Index Ventures', desc: 'Index runs open pitch days for European founders. Consumer, enterprise, and deeptech focus.' },
    { title: 'Atomico Angel Programme', url: 'https://www.atomico.com/angel', source: 'Atomico', type: 'Startup Program', date: 'Annual — check website', org: 'Atomico', desc: 'Atomico\'s angel programme supports early-stage founders in Europe with funding and mentorship from experienced operators.' }
  ];
  console.log(`  VC opportunities: ${vcOpps.length}`);
  return vcOpps;
}

// --- Helpers ---
function detectType(title) {
  const t = title.toLowerCase();
  if (t.includes('grant') || t.includes('funding') || t.includes('innovate')) return 'Grant';
  if (t.includes('demo day') || t.includes('showcase')) return 'Demo Day';
  if (t.includes('pitch') || t.includes('competition') || t.includes('battle')) return 'Pitch Competition';
  if (t.includes('dinner') || t.includes('supper') || t.includes('lunch')) return 'Founder Dinner';
  if (t.includes('office hours')) return 'Office Hours';
  if (t.includes('accelerator') || t.includes('cohort') || t.includes('programme') || t.includes('program')) return 'Accelerator';
  if (t.includes('investor') || t.includes('vc') || t.includes('venture') || t.includes('angel')) return 'Investor Event';
  if (t.includes('workshop') || t.includes('masterclass') || t.includes('bootcamp')) return 'Workshop';
  if (t.includes('networking') || t.includes('meetup') || t.includes('mixer') || t.includes('drinks')) return 'Networking';
  return 'Event';
}

function dedup(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
    if (seen.has(key) || key.length < 3) return false;
    seen.add(key);
    return true;
  });
}

// --- Main ---
export async function scrapeAll() {
  console.log('\nBeacon scraper starting...\n');
  const [luma, eventbrite, meetup, innovateUK, accelerators, vcOpps] = await Promise.all([
    scrapeLuma(), scrapeEventbrite(), scrapeMeetup(), scrapeInnovateUK(), scrapeAccelerators(), scrapeVCOfficeHours()
  ]);
  const all = [...luma, ...eventbrite, ...meetup, ...innovateUK, ...accelerators, ...vcOpps];
  const unique = dedup(all);
  console.log(`\nTotal opportunities found: ${unique.length}`);
  console.log(`Lu.ma: ${luma.length} | Eventbrite: ${eventbrite.length} | Meetup: ${meetup.length} | Grants: ${innovateUK.length} | Accelerators: ${accelerators.length} | VC: ${vcOpps.length}\n`);
  return unique;
}
