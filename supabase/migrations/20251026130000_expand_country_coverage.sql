/**
 * Expand Country Coverage - Add 17 More Countries
 * 
 * Week 3: Ecosystem Expansion
 * Expands from 8 countries to 25 countries for global coverage.
 */

-- Add affiliate partner mappings for new countries

-- Mexico (Uber Eats, Rappi)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'MX', 'UBER-EATS-MX-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Netherlands (Uber Eats, Deliveroo)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'NL', 'UBER-EATS-NL-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'NL', 'DELIVEROO-NL-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- Sweden (Uber Eats, Foodora)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SE', 'UBER-EATS-SE-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Poland (Uber Eats, Glovo)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'PL', 'UBER-EATS-PL-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Italy (Uber Eats, Deliveroo, Glovo)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'IT', 'UBER-EATS-IT-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'IT', 'DELIVEROO-IT-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- China (Meituan, Ele.me - placeholders for now)
-- Note: Will need to add Chinese delivery partners in future migration

-- Japan (Uber Eats)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'JP', 'UBER-EATS-JP-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- South Korea (Uber Eats, Coupang Eats - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'KR', 'UBER-EATS-KR-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Singapore (Uber Eats, Deliveroo, GrabFood - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SG', 'UBER-EATS-SG-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SG', 'DELIVEROO-SG-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- Thailand (Uber Eats, GrabFood - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'TH', 'UBER-EATS-TH-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Indonesia (Uber Eats, GrabFood, GoFood - placeholders)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'ID', 'UBER-EATS-ID-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- New Zealand (Uber Eats)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'NZ', 'UBER-EATS-NZ-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- United Arab Emirates (Uber Eats, Deliveroo, Talabat - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'AE', 'UBER-EATS-AE-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'AE', 'DELIVEROO-AE-001', 2, true
FROM delivery_partners WHERE name = 'Deliveroo';

-- Saudi Arabia (Uber Eats, HungerStation - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'SA', 'UBER-EATS-SA-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Brazil (Uber Eats, iFood - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'BR', 'UBER-EATS-BR-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Argentina (Uber Eats, PedidosYa - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'AR', 'UBER-EATS-AR-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Chile (Uber Eats, PedidosYa - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'CL', 'UBER-EATS-CL-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- South Africa (Uber Eats, Mr D Food - placeholder)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
SELECT id, 'ZA', 'UBER-EATS-ZA-001', 1, true
FROM delivery_partners WHERE name = 'Uber Eats';

-- Add grocery affiliates for new countries (Amazon Fresh where available)

-- Germany (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'DE',
  'AMAZON-FRESH-DE-001',
  1,
  true
);

-- France (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'FR',
  'AMAZON-FRESH-FR-001',
  1,
  true
);

-- Italy (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'IT',
  'AMAZON-FRESH-IT-001',
  1,
  true
);

-- Japan (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'JP',
  'AMAZON-FRESH-JP-001',
  1,
  true
);

-- Singapore (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'SG',
  'AMAZON-FRESH-SG-001',
  1,
  true
);

-- Australia (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'AU',
  'AMAZON-FRESH-AU-001',
  1,
  true
);

-- Brazil (Amazon Fresh)
INSERT INTO affiliate_partner_map (partner_id, country, affiliate_id, priority, active)
VALUES (
  (SELECT id FROM delivery_partners WHERE name = 'Amazon Fresh' LIMIT 1),
  'BR',
  'AMAZON-FRESH-BR-001',
  1,
  true
);

-- Create index for faster country lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_map_country ON affiliate_partner_map(country);

-- Add comment
COMMENT ON TABLE affiliate_partner_map IS 'Week 3: Expanded from 8 to 25 countries for global coverage';

