const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Fetching...');
  const { data, error } = await supabase.from('menu_items').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    for (const item of data) {
      console.log(`- ${item.name}: ${item.image_url} | Price: ${item.price} | Cals: ${item.calories}`);
    }
  }
}
run();
