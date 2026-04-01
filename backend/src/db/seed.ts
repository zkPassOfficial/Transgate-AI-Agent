import { getDb } from './init.js';

const testSchemas = [
  {
    id: 'a7d5567181bc4ffeb87956f6e6bc74c0',
    zkpass_schema_id: '7e068f51c9bc472fac28e07a901d446d',
    platform: 'twitter',
    category: 'followers',
    title: 'Verify Twitter/X follower count greater than 1',
    description: 'Proves the user has at least 1 follower on Twitter/X. Commonly used for KOL verification, influencer status checks, proving social media presence, or confirming an active account with real engagement.',
    condition: 'Followers > 1',
    keywords: 'twitter,x,followers,follower,kol,influencer,social,creator,account,profile,engagement,audience',
    aliases: 'x followers,twitter followers,x follower,kol verification,influencer check,twitter account,x account,social proof,i am a kol',
    site_url: 'https://x.com/zkPass',
    login_config: JSON.stringify({ checkUrl: 'https://x.com/home', loginUrl: 'https://x.com/i/flow/login', selector: "[data-testid='AppTabBar_Home_Link']" }),
    navigation: JSON.stringify({ steps: [{ action: 'navigate', url: 'https://x.com/home' }, { action: 'click', selector: "[data-testid='AppTabBar_Profile_Link']" }] }),
    http_version: '1.1',
  },
  {
    id: 'a7d5567181bc4ffeb87956f6e6bc74c1',
    zkpass_schema_id: 'b5362e612a254fa484bd555b198b349e',
    platform: 'twitter',
    category: 'following',
    title: 'Verify user is following zkPass on Twitter/X',
    description: 'Proves the user is following the official zkPass account (@zkPass) on Twitter/X. Commonly used for social engagement verification, community membership checks, follow-to-earn campaigns, or confirming participation in marketing activities.',
    condition: 'Following @zkPass',
    keywords: 'twitter,x,following,follow,zkpass,social,community,engagement,membership',
    aliases: 'follow zkpass,following zkpass,followed zkpass,twitter follow,x follow,follow check,am i following',
    site_url: 'https://x.com/zkPass',
    login_config: JSON.stringify({ checkUrl: 'https://x.com/home', loginUrl: 'https://x.com/i/flow/login', selector: "[data-testid='AppTabBar_Home_Link']" }),
    navigation: JSON.stringify({ steps: [{ action: 'navigate', url: 'https://x.com/zkPass' }] }),
    http_version: '1.1',
  },
  {
    id: 'afedac5b7eac43f78243ebba8a141db7',
    zkpass_schema_id: '6cc0b5af94fa45faab1e1a47f0df13dd',
    platform: 'binance',
    category: 'kyc',
    title: 'Verify Binance KYC identity verification',
    description: 'Proves the user has completed KYC (Know Your Customer) identity verification on Binance. Commonly used for human verification, proof of personhood, anti-sybil checks, or confirming the user is a real authenticated person on a regulated exchange.',
    condition: 'KYC Verified',
    keywords: 'binance,kyc,identity,verification,human,personhood,sybil,real person,certified,verified,authenticate,proof of identity',
    aliases: 'bn kyc,binance identity,human verification,proof of human,are you human,real person,identity check,binance verified,i am human,prove i am real',
    site_url: 'https://www.binance.com/my/dashboard',
    login_config: JSON.stringify({ checkUrl: 'https://www.binance.com/en/my/dashboard', loginUrl: 'https://accounts.binance.com/login', selector: '#dashboard-userinfo-nickname' }),
    navigation: JSON.stringify({ steps: [{ action: 'navigate', url: 'https://www.binance.com/en/my/dashboard' }] }),
    http_version: '1.1',
  },
  {
    id: 'bab15b2c27874131a51de5bffe12a299',
    zkpass_schema_id: '1ff5fc8276894264996fb7d6b4f8e352',
    platform: 'binance',
    category: 'balance',
    title: 'Verify Binance spot balance greater than 100 USDT',
    description: 'Proves the user holds more than 100 USDT in their Binance spot account. Commonly used for wealth verification, airdrop eligibility, proving financial capacity, or qualifying for token sales and DeFi protocols.',
    condition: 'Balance > 100 USDT',
    keywords: 'binance,balance,usdt,money,wealth,rich,funds,assets,spot,crypto,holdings,portfolio,financial',
    aliases: 'bn balance,binance balance,binance usdt,have money,prove wealth,i have funds,crypto balance,show my balance,i am rich',
    site_url: 'https://www.binance.com/my/dashboard',
    login_config: JSON.stringify({ checkUrl: 'https://www.binance.com/en/my/dashboard', loginUrl: 'https://accounts.binance.com/login', selector: '#dashboard-userinfo-nickname' }),
    navigation: JSON.stringify({ steps: [{ action: 'navigate', url: 'https://www.binance.com/en/my/dashboard' }] }),
    http_version: '1.1',
  },
  {
    id: '201880abee8f45b1afe9d7aadea3856e',
    zkpass_schema_id: '925af1cca5bc4537b372cdfdc00b2a3b',
    platform: 'weatherstack',
    category: 'weather',
    title: 'Verify local atmospheric pressure greater than 0 mm',
    description: 'Proves the local atmospheric pressure is greater than 0 mm via Weatherstack API. This is a test/demo schema for verifying the zkTLS flow end-to-end without requiring any user account or login.',
    condition: 'Pressure > 0 mm',
    keywords: 'weather,pressure,atmospheric,barometer,test,demo,sample,trial,quick test',
    aliases: 'air pressure,pressure test,demo verification,test schema,try it out,quick demo,sample verification',
    site_url: 'https://weatherstack.com',
    login_config: JSON.stringify({ checkUrl: 'https://weatherstack.com', loginUrl: 'https://weatherstack.com', selector: 'body' }),
    navigation: JSON.stringify({ steps: [{ action: 'navigate', url: 'https://weatherstack.com' }] }),
    http_version: '1.1',
  },
];

const testCampaigns = [
  {
    name: 'zkPass Airdrop Demo',
    aliases: 'airdrop,demo,zkpass airdrop,token drop,claim airdrop,free tokens',
    description: 'Verify Twitter/X follower count and follow zkPass to qualify for the zkPass airdrop. Requires completing both verifications.',
    schemas: ['a7d5567181bc4ffeb87956f6e6bc74c0', 'a7d5567181bc4ffeb87956f6e6bc74c1'],
  },
];

function seed(): void {
  const db = getDb();

  db.exec('DELETE FROM campaign_schemas');
  db.exec('DELETE FROM campaigns');
  db.exec('DELETE FROM schemas');

  const insertSchema = db.prepare(`
    INSERT INTO schemas (id, zkpass_schema_id, platform, category, title, description, condition, keywords, aliases, site_url, login_config, navigation, http_version)
    VALUES (@id, @zkpass_schema_id, @platform, @category, @title, @description, @condition, @keywords, @aliases, @site_url, @login_config, @navigation, @http_version)
  `);

  for (const schema of testSchemas) {
    insertSchema.run(schema);
  }

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (name, aliases, description) VALUES (@name, @aliases, @description)
  `);
  const insertCampaignSchema = db.prepare(`
    INSERT INTO campaign_schemas (campaign_id, schema_id, display_order) VALUES (@campaign_id, @schema_id, @display_order)
  `);

  const checkId = db.prepare('SELECT id FROM schemas WHERE id = ?');

  for (const campaign of testCampaigns) {
    const { lastInsertRowid } = insertCampaign.run({
      name: campaign.name,
      aliases: campaign.aliases,
      description: campaign.description,
    });
    campaign.schemas.forEach((id, i) => {
      if (!checkId.get(id)) {
        throw new Error(`Campaign "${campaign.name}" references unknown schema: "${id}"`);
      }
      insertCampaignSchema.run({ campaign_id: lastInsertRowid, schema_id: id, display_order: i });
    });
  }

  const schemas = db.prepare('SELECT id, platform, category, condition FROM schemas').all() as any[];
  console.log(`\nInserted ${schemas.length} schemas:`);
  schemas.forEach(s => console.log(`  ${s.id} | ${s.platform} | ${s.category} | ${s.condition}`));

  const campaigns = db.prepare(`
    SELECT c.id, c.name, GROUP_CONCAT(cs.schema_id, ', ') as schemas
    FROM campaigns c
    LEFT JOIN campaign_schemas cs ON c.id = cs.campaign_id
    GROUP BY c.id
  `).all() as any[];
  console.log(`\nInserted ${campaigns.length} campaigns:`);
  campaigns.forEach(c => console.log(`  ${c.name} → [${c.schemas}]`));

  console.log('\nSeed complete.');
}

seed();
