-- Replace placeholder menu with real B60 menu

-- Clear old data
delete from public.menu_items;
delete from public.menu_categories;

-- Real Categories
insert into public.menu_categories (name, slug, sort_order) values
  ('Burgers',  'burgers',  1),
  ('Chicken',  'chicken',  2),
  ('Fries',    'fries',    3),
  ('Dessert',  'dessert',  4),
  ('Extras',   'extras',   5)
on conflict (slug) do nothing;

-- Real Menu Items
with cats as (select id, slug from public.menu_categories)
insert into public.menu_items (category_id, name, description, price, image_url, is_featured, calories, customizations) values
  -- Burgers
  ((select id from cats where slug='burgers'), 'Classic Beef',
    'Double beef patty, cheese, pickle, sauce.',
    15, '', true, 620, '[{"id":"heat","name":"Heat Level","type":"single","options":[{"id":"normal","name":"Normal","price_delta":0},{"id":"spicy","name":"Spicy","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"extra-cheese","name":"Extra Cheese","price_delta":3},{"id":"beef-bacon","name":"Beef Bacon","price_delta":5},{"id":"jalapeno","name":"Jalapeños","price_delta":2}]}]'::jsonb),
  ((select id from cats where slug='burgers'), 'Fancy',
    'Double beef patty, cheese, beef bacon, tomato, lettuce, pickle, sauce.',
    20, '', true, 710, '[{"id":"heat","name":"Heat Level","type":"single","options":[{"id":"normal","name":"Normal","price_delta":0},{"id":"spicy","name":"Spicy","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"extra-cheese","name":"Extra Cheese","price_delta":3},{"id":"beef-bacon","name":"Beef Bacon","price_delta":5},{"id":"jalapeno","name":"Jalapeños","price_delta":2}]}]'::jsonb),
  ((select id from cats where slug='burgers'), 'Vegas',
    'Smoked pastrami, beef patty, mustard sauce, special sauce.',
    29, '', true, 680, '[{"id":"heat","name":"Heat Level","type":"single","options":[{"id":"normal","name":"Normal","price_delta":0},{"id":"spicy","name":"Spicy","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"extra-cheese","name":"Extra Cheese","price_delta":3},{"id":"beef-bacon","name":"Beef Bacon","price_delta":5},{"id":"jalapeno","name":"Jalapeños","price_delta":2}]}]'::jsonb),
  ((select id from cats where slug='burgers'), 'Tickle',
    'Fried onions, beef patty, special sauce, jam, jalapeno.',
    26, '', false, 650, '[{"id":"heat","name":"Heat Level","type":"single","options":[{"id":"normal","name":"Normal","price_delta":0},{"id":"spicy","name":"Spicy","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"extra-cheese","name":"Extra Cheese","price_delta":3},{"id":"beef-bacon","name":"Beef Bacon","price_delta":5},{"id":"jalapeno","name":"Jalapeños","price_delta":2}]}]'::jsonb),

  -- Chicken
  ((select id from cats where slug='chicken'), 'Classic Chicken',
    'Fried chicken, sauce, lettuce.',
    10, '', true, 550, '[{"id":"spicy","name":"Spicy Level","type":"single","options":[{"id":"mild","name":"Mild","price_delta":0},{"id":"hot","name":"Hot","price_delta":0},{"id":"lethal","name":"Lethal 🔥","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"cheese","name":"Cheese","price_delta":3},{"id":"pickles","name":"Pickles","price_delta":0}]}]'::jsonb),
  ((select id from cats where slug='chicken'), 'Hot Chicken',
    'Spicy fried chicken, lettuce, jalapeno, sauce.',
    15, '', false, 580, '[{"id":"spicy","name":"Spicy Level","type":"single","options":[{"id":"mild","name":"Mild","price_delta":0},{"id":"hot","name":"Hot","price_delta":0},{"id":"lethal","name":"Lethal 🔥","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"cheese","name":"Cheese","price_delta":3},{"id":"pickles","name":"Pickles","price_delta":0}]}]'::jsonb),
  ((select id from cats where slug='chicken'), 'Classic Tenders',
    'Crispy fried chicken tenders.',
    10, '', false, 480, '[{"id":"spicy","name":"Spicy Level","type":"single","options":[{"id":"mild","name":"Mild","price_delta":0},{"id":"hot","name":"Hot","price_delta":0},{"id":"lethal","name":"Lethal 🔥","price_delta":0}]},{"id":"extras","name":"Add-ons","type":"multi","options":[{"id":"cheese","name":"Cheese","price_delta":3},{"id":"pickles","name":"Pickles","price_delta":0}]}]'::jsonb),

  -- Fries
  ((select id from cats where slug='fries'), 'Chicken & Fries',
    'Loaded fries with chicken.',
    15, '', true, 750, '[{"id":"sauce","name":"Extra Sauce","type":"multi","options":[{"id":"b60","name":"B60 Sauce","price_delta":2},{"id":"truffle","name":"Truffle Mayo","price_delta":4}]}]'::jsonb),
  ((select id from cats where slug='fries'), 'Just Fries',
    'Classic crispy golden fries.',
    5, '', false, 350, '[{"id":"sauce","name":"Extra Sauce","type":"multi","options":[{"id":"b60","name":"B60 Sauce","price_delta":2},{"id":"truffle","name":"Truffle Mayo","price_delta":4}]}]'::jsonb),
  ((select id from cats where slug='fries'), 'Seasoned Fries',
    'Crispy golden fries with signature seasoning.',
    6, '', false, 380, '[{"id":"sauce","name":"Extra Sauce","type":"multi","options":[{"id":"b60","name":"B60 Sauce","price_delta":2},{"id":"truffle","name":"Truffle Mayo","price_delta":4}]}]'::jsonb),

  -- Dessert
  ((select id from cats where slug='dessert'), 'B60 Chocolate',
    'Rich and creamy signature chocolate treat.',
    10, '', true, 500, '[]'::jsonb),

  -- Extras
  ((select id from cats where slug='extras'), 'Lemonade',
    'Refreshing ice-cold lemonade.',
    3, '', false, 150, '[]'::jsonb),
  ((select id from cats where slug='extras'), 'White Sauce',
    'Signature dip.',
    2, '', false, 50, '[]'::jsonb),
  ((select id from cats where slug='extras'), 'Special Sauce',
    'Signature dip.',
    2, '', false, 60, '[]'::jsonb);
