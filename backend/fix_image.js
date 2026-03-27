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

async function run() {
  console.log('Fetching Classic Beef...');
  const { data: fetch, error: fetchErr } = await supabase
    .from('menu_items')
    .select('id, name, image_url')
    .eq('name', 'Classic Beef')
    .single();

  if (fetchErr) {
    console.error('Fetch error (maybe it doesnt exist?):', fetchErr.message);
  } else {
    console.log('Found Classic Beef, updating image:', fetch.image_url, '→ https://b60.ae/images/classic.webp');
    const { error: updErr } = await supabase
      .from('menu_items')
      .update({ image_url: 'https://b60.ae/images/classic.webp' })
      .eq('name', 'Classic Beef');
    
    if (updErr) console.error('Update error:', updErr.message);
    else console.log('Successfully updated Classic Beef image!');
  }
}

run().catch(console.error);
