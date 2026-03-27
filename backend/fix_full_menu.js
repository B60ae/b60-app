const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Error: SUPABASE_URL or SERVICE_KEY missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const burgerCustomization = [
  {
    id: 'heat',
    name: 'Heat Level',
    type: 'single',
    options: [
      { id: 'normal', name: 'Normal', price_delta: 0 },
      { id: 'spicy', name: 'Spicy', price_delta: 0 }
    ]
  },
  {
    id: 'extras',
    name: 'Add-ons',
    type: 'multi',
    options: [
      { id: 'extra-cheese', name: 'Extra Cheese', price_delta: 3 },
      { id: 'beef-bacon', name: 'Beef Bacon', price_delta: 5 },
      { id: 'jalapeno', name: 'Jalapeños', price_delta: 2 }
    ]
  }
];

const chickenCustomization = [
  {
    id: 'spicy',
    name: 'Spicy Level',
    type: 'single',
    options: [
      { id: 'mild', name: 'Mild', price_delta: 0 },
      { id: 'hot', name: 'Hot', price_delta: 0 },
      { id: 'lethal', name: 'Lethal 🔥', price_delta: 0 }
    ]
  },
  {
    id: 'extras',
    name: 'Add-ons',
    type: 'multi',
    options: [
      { id: 'cheese', name: 'Cheese', price_delta: 3 },
      { id: 'pickles', name: 'Pickles', price_delta: 0 }
    ]
  }
];

async function run() {
  console.log('Fetching all menu items...');
  const { data: items, error: fetchErr } = await supabase
    .from('menu_items')
    .select('id, name');

  if (fetchErr) return console.error(fetchErr);

  console.log(`Found ${items.length} items. Updating customizations and calories...`);

  for (const item of items) {
    let custom = [];
    let cals = Math.floor(Math.random() * 300) + 400; // 400 - 700 kcal

    if (item.name.toLowerCase().includes('beef') || item.name === 'Fancy' || item.name === 'Vegas' || item.name === 'Tickle') {
      custom = burgerCustomization;
      cals += 150;
    } else if (item.name.toLowerCase().includes('chicken')) {
      custom = chickenCustomization;
    } else if (item.name.toLowerCase().includes('fries')) {
      cals = 350;
      custom = [
        {
          id: 'sauce',
          name: 'Extra Sauce',
          type: 'multi',
          options: [
            { id: 'b60', name: 'B60 Sauce', price_delta: 2 },
            { id: 'truffle', name: 'Truffle Mayo', price_delta: 4 }
          ]
        }
      ];
    } else if (item.name.toLowerCase() === 'b60 chocolate') {
      cals = 500;
    } else {
      cals = 150;
    }

    const { error: updErr } = await supabase
      .from('menu_items')
      .update({ customizations: custom, calories: cals })
      .eq('id', item.id);

    if (updErr) {
      console.error(`Failed to update ${item.name}: ${updErr.message}`);
    } else {
      console.log(`Updated ${item.name}`);
    }
  }

  console.log('✅ Menu customization restored!');
}

run().catch(console.error);
