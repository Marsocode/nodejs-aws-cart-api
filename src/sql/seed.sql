INSERT INTO carts (
  id,
  user_id,
  created_at,
  updated_at,
  status
)
VALUES (
  uuid_generate_v4(),
  'd2d68343-da62-47dc-a41b-01d0bd8f242f',
  NOW(),
  NOW(),
  'OPEN'
)
ON CONFLICT DO NOTHING;

INSERT INTO cart_items (
  cart_id,
  product_id,
  count
)
VALUES
(
  '1a6b60e9-cbaf-4ef9-981b-7d2b07bbe2bc',
  'b7e0dd70-7420-4e13-acdc-e5fb96ddc1c9',
  2
),
(
  '1a6b60e9-cbaf-4ef9-981b-7d2b07bbe2bc',
  '19411d2a-f6c4-42ad-a2de-9a8536572c5c',
  1
),
(
  '1a6b60e9-cbaf-4ef9-981b-7d2b07bbe2bc',
  'e3af92ef-c71d-47c1-b18b-a260032eeb1f',
  3
)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, name, password) VALUES
  (uuid_generate_v4(), 'marsocode', 'TEST_PASSWORD')
ON CONFLICT (name) DO NOTHING;