-- B60 Seed Data

-- Locations
insert into public.locations (id, name, address, city, phone, is_open, open_hours) values
  ('oud-metha',  'Oud Metha',     'Oud Metha Road, Dubai',         'Dubai',   '+971 4 000 0001', true, '10:00 AM – 12:00 AM'),
  ('al-ghurair', 'Al Ghurair',    'Al Ghurair Centre, Deira',      'Dubai',   '+971 4 000 0002', true, '10:00 AM – 11:00 PM'),
  ('muwaileh',   'Muwaileh',      'Muwaileh Commercial, Sharjah',  'Sharjah', '+971 6 000 0003', true, '10:00 AM – 11:00 PM'),
  ('al-warqa',   'Al Warqa',      'Al Warqa, Dubai',               'Dubai',   '+971 4 000 0004', true, '10:00 AM – 12:00 AM')
on conflict (id) do nothing;

-- Menu Categories
insert into public.menu_categories (name, slug, sort_order) values
  ('Burgers',  'burgers',  1),
  ('Sides',    'sides',    2),
  ('Drinks',   'drinks',   3),
  ('Combos',   'combos',   4)
on conflict (slug) do nothing;

-- Sample Menu Items
with cats as (select id, slug from public.menu_categories)
insert into public.menu_items (category_id, name, description, price, is_featured, calories, customizations) values
  ((select id from cats where slug='burgers'), 'B60 Classic Smash',
    'Double smash patty, American cheese, B60 sauce, pickles, onions on a brioche bun.',
    29, true, 620,
    '[{"id":"patty","name":"Patty","type":"single","options":[{"id":"single","name":"Single Patty","price_delta":0},{"id":"double","name":"Double Patty","price_delta":5}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"extra-cheese","name":"Extra Cheese","price_delta":3},{"id":"bacon","name":"Smashed Bacon","price_delta":5},{"id":"jalapeno","name":"Jalapeños","price_delta":2}]}]'::jsonb),
  ((select id from cats where slug='burgers'), 'Spicy Assassin',
    'Crispy fried chicken, ghost pepper sauce, slaw, pickled chilli on a potato bun.',
    34, true, 710,
    '[{"id":"heat","name":"Heat Level","type":"single","options":[{"id":"medium","name":"Medium","price_delta":0},{"id":"hot","name":"Hot","price_delta":0},{"id":"lethal","name":"Lethal 🔥","price_delta":0}]}]'::jsonb),
  ((select id from cats where slug='burgers'), 'Mushroom Swiss',
    'Smash patty, sautéed mushrooms, Swiss cheese, truffle mayo.',
    36, false, 580, '[]'::jsonb),
  ((select id from cats where slug='sides'), 'Smash Fries',
    'Crispy shoestring fries, B60 seasoning, house dip.',
    15, true, 380, '[]'::jsonb),
  ((select id from cats where slug='sides'), 'Onion Rings',
    'Beer-battered onion rings, smoky chipotle dip.',
    17, false, 420, '[]'::jsonb),
  ((select id from cats where slug='drinks'), 'Freestyle Soda',
    'Choose from 50+ Coca-Cola flavours.',
    10, false, 150, '[]'::jsonb),
  ((select id from cats where slug='drinks'), 'Milkshake',
    'Thick hand-spun shake — Vanilla, Chocolate, or Strawberry.',
    22, false, 480,
    '[{"id":"flavor","name":"Flavour","type":"single","options":[{"id":"vanilla","name":"Vanilla","price_delta":0},{"id":"chocolate","name":"Chocolate","price_delta":0},{"id":"strawberry","name":"Strawberry","price_delta":0}]}]'::jsonb),
  ((select id from cats where slug='combos'), 'B60 Combo',
    'Any burger + Smash Fries + Freestyle Soda. Best value.',
    49, true, 1050, '[]'::jsonb);
