require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
})

const cafes = [
  {
    name: 'Kean Coffee',
    location: 'Irvine, CA',
    description: 'Award-winning specialty roaster known for single-origin espresso and expertly crafted pour-overs.',
    logo_url: 'https://logo.clearbit.com/keancoffee.com',
  },
  {
    name: 'Portola Coffee',
    location: 'Costa Mesa, CA',
    description: 'Farm-to-cup coffee with seasonal menus and a warm, welcoming atmosphere.',
    logo_url: 'https://logo.clearbit.com/portolacoffeelab.com',
  },
  {
    name: 'Philz Coffee',
    location: 'Irvine, CA',
    description: 'Hand-crafted one cup at a time — signature blends made exactly to your taste.',
    logo_url: 'https://logo.clearbit.com/philzcoffee.com',
  },
  {
    name: 'Starbucks',
    location: 'Irvine, CA',
    description: 'Your neighborhood coffeehouse for handcrafted beverages, fresh food, and free Wi-Fi.',
    logo_url: 'https://logo.clearbit.com/starbucks.com',
  },
  {
    name: 'The Coffee Bean & Tea Leaf',
    location: 'Irvine, CA',
    description: 'Premium coffee and tea since 1963, famous for blended Ice Blended® drinks.',
    logo_url: 'https://logo.clearbit.com/coffeebean.com',
  },
  {
    name: '85°C Bakery Cafe',
    location: 'Irvine, CA',
    description: 'Taiwanese-style bakery café serving fresh-baked goods and iconic sea salt coffee.',
    logo_url: 'https://logo.clearbit.com/85cbakerycafe.com',
  },
  {
    name: "Peet's Coffee",
    location: 'Irvine, CA',
    description: 'Deep-roasted, handcrafted coffee with a legacy of uncompromising quality since 1966.',
    logo_url: 'https://logo.clearbit.com/peets.com',
  },
  {
    name: 'Bear Coast Coffee',
    location: 'Newport Beach, CA',
    description: 'SoCal surf-culture café with quality single-origin brews and a laid-back vibe.',
    logo_url: 'https://logo.clearbit.com/bearcoastcoffee.com',
  },
]

async function seed() {
  for (const cafe of cafes) {
    await pool.query(
      `INSERT INTO cafes (name, location, description, logo_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [cafe.name, cafe.location, cafe.description, cafe.logo_url]
    )
    console.log(`Inserted: ${cafe.name}`)
  }
  await pool.end()
  console.log('Seeding complete.')
}

seed().catch(err => { console.error(err); process.exit(1) })
