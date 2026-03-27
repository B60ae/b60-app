const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Reverting image_url so placeholders can show...');
  const { error } = await supabase
    .from('menu_items')
    .update({ image_url: '' })
    .neq('name', 'something_that_doesnt_exist'); // Update everything

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully cleared all images. App will use Emoji placeholders.');
  }
}

run();
