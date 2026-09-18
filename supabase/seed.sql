insert into plans (code, name, description, price_cents, ai_questions_per_day, oem_access_limit, saved_history_limit, features)
values
  ('free', 'Free', 'Basic limited access', 0, 5, 3, 10,
   '{"troubleshooting":"limited","oem":"limited","maintenance":"basic"}'::jsonb),
  ('unlimited', 'Unlimited', 'Full DG Expert access', 1999, null, null, null,
   '{"troubleshooting":"full","oem":"full","maintenance":"full","priority":true}'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  ai_questions_per_day = excluded.ai_questions_per_day,
  oem_access_limit = excluded.oem_access_limit,
  saved_history_limit = excluded.saved_history_limit,
  features = excluded.features;

insert into knowledge_categories (slug, name, description, icon, sort_order) values
  ('fundamentals', 'Generator Fundamentals', 'Working principles and components', 'BookOpen', 10),
  ('engine',       'Engine',        'Diesel engine faults and diagnosis', 'Cog', 20),
  ('electrical',   'Electrical',    'Wiring, output and electrical faults', 'Zap', 30),
  ('alternator',   'Alternator',    'AVR, excitation and output problems', 'Activity', 40),
  ('cooling',      'Cooling',       'Radiator, coolant and temperature', 'Thermometer', 50),
  ('fuel',         'Fuel System',   'Injectors, pumps, filters, air locks', 'Fuel', 60),
  ('lubrication',  'Lubrication',   'Oil pressure, filters, consumption', 'Droplet', 70),
  ('starting',     'Starting System','Starter, solenoid, cranking', 'Power', 80),
  ('battery',      'Battery',       'Charging, voltage, terminals', 'BatteryCharging', 90),
  ('exhaust',      'Exhaust',       'Smoke colour, back-pressure', 'Wind', 100),
  ('control',      'Control Panel', 'Controllers, alarms, protection', 'Gauge', 110),
  ('maintenance',  'Maintenance',   'Preventive and scheduled maintenance', 'Wrench', 120)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into oems (slug, name, country, overview, engine_families, sort_order) values
  ('cummins',        'Cummins',         'USA',    'Global diesel engine and power generation manufacturer.', 'QSB, QSK, QSX, KTA', 10),
  ('caterpillar',    'Caterpillar',     'USA',    'Heavy equipment and power systems, CAT-branded gensets.', 'C-Series (C4.4, C7, C9, C15, C18, C32)', 20),
  ('perkins',        'Perkins',         'UK',     'Widely used industrial diesel engines (Caterpillar group).', '400, 1100, 1200, 2000, 4000 Series', 30),
  ('kirloskar',      'Kirloskar',       'India',  'Leading Indian genset and engine maker.', 'R-Series, HA, DV, TV', 40),
  ('volvo-penta',    'Volvo Penta',     'Sweden', 'Industrial and marine diesel power.', 'TAD, TWD Series', 50),
  ('mtu',            'MTU',             'Germany','High-output diesel engines (Rolls-Royce Power Systems).', 'Series 1600, 2000, 4000', 60),
  ('kohler',         'Kohler',          'USA',    'Residential to industrial generators.', 'KDI, KDW', 70),
  ('mahindra-powerol','Mahindra Powerol','India', 'Indian genset brand from Mahindra.', 'DI Series', 80),
  ('ashok-leyland',  'Ashok Leyland',   'India',  'Commercial vehicle and power solutions.', 'H-Series, Neptune', 90),
  ('greaves',        'Greaves',         'India',  'Diesel engines and gensets.', 'GA, MK Series', 100)
on conflict (slug) do update set name = excluded.name, overview = excluded.overview;

insert into knowledge_articles
  (title, category_id, system, problem, symptoms, possible_causes, diagnostic_procedure,
   corrective_action, safety_precautions, references_text, body, is_demo, status, published_at)
select * from (values
  (
    'Diesel Generator Working Principle',
    (select id from knowledge_categories where slug='fundamentals'),
    'Fundamentals', null, null, null, null, null,
    'Follow the manufacturer''s official manual for all operation and maintenance.',
    'DG Expert demo content.',
    'A diesel generator converts the chemical energy of diesel fuel into electrical energy in two stages. First, a diesel engine burns fuel to produce rotational mechanical energy (the prime mover). Second, that rotating shaft drives an alternator, which uses electromagnetic induction to generate AC electricity. An Automatic Voltage Regulator (AVR) holds output voltage steady, while a governor controls engine speed to keep frequency (50/60 Hz) constant under changing load. Supporting systems — fuel, cooling, lubrication, starting/battery, exhaust and the control panel — keep the set running safely.',
    true, 'published'::article_status, now()
  ),
  (
    'DG Does Not Start',
    (select id from knowledge_categories where slug='starting'),
    'Starting', 'DG does not start / does not crank',
    'Engine does not turn over, or cranks but does not fire.',
    E'1. Discharged or faulty battery\n2. Loose/corroded battery terminals\n3. Faulty starter motor or solenoid\n4. Fuel supply issue (empty tank, closed valve, air lock)\n5. Controller in wrong mode or active shutdown alarm\n6. Emergency stop engaged',
    E'1. Check controller for active alarms / E-stop.\n2. Measure battery voltage (should be ~12.6V or 24-25V at rest).\n3. Inspect and clean battery terminals.\n4. Verify fuel level and that fuel valves are open.\n5. Listen for solenoid click when cranking.',
    E'1. Charge or replace the battery as required.\n2. Clean/tighten terminals.\n3. Bleed the fuel system if air-locked.\n4. Clear resolved shutdown alarms per OEM procedure.\n5. If the starter is faulty, have it repaired/replaced by a qualified technician.',
    'Batteries can produce explosive gases and deliver high current. Wear eye protection. Ensure the set cannot start unexpectedly while you work — isolate the starting circuit.',
    'DG Expert demo content.', null,
    true, 'published', now()
  ),
  (
    'High Coolant Temperature',
    (select id from knowledge_categories where slug='cooling'),
    'Cooling', 'High coolant temperature / overheating',
    'High-temperature alarm, coolant near boiling, possible shutdown.',
    E'1. Low coolant level\n2. Blocked or dirty radiator core\n3. Faulty thermostat\n4. Failing water pump\n5. Broken/loose fan belt\n6. Excessive engine load\n7. Faulty temperature sensor',
    E'1. Allow the engine to cool before opening anything.\n2. Check coolant level per OEM procedure.\n3. Inspect radiator fins for blockage.\n4. Check fan belt tension and condition.\n5. Verify the temperature sensor reading against an independent gauge.',
    E'1. Top up coolant with the correct specification.\n2. Clean the radiator core.\n3. Replace a faulty thermostat or water pump.\n4. Reduce load if the set is overloaded.\n5. Replace a faulty sensor.',
    'Do NOT open a pressurized cooling system while the engine is hot — escaping steam and coolant can cause severe burns. Let it cool first.',
    'DG Expert demo content.', null,
    true, 'published', now()
  ),
  (
    'Low Oil Pressure',
    (select id from knowledge_categories where slug='lubrication'),
    'Lubrication', 'Low engine oil pressure',
    'Low oil pressure alarm or shutdown; possible engine noise.',
    E'1. Low oil level\n2. Wrong oil grade / diluted oil\n3. Clogged oil filter\n4. Faulty oil pressure sensor/switch\n5. Worn oil pump or bearings\n6. Oil leak',
    E'1. Stop the engine if an alarm is active — do not run under low oil pressure.\n2. Check oil level on the dipstick.\n3. Inspect for external leaks.\n4. Confirm the correct oil grade.\n5. Verify the sensor reading with a mechanical gauge.',
    E'1. Top up or change oil and filter with OEM-specified grade.\n2. Replace a faulty pressure sensor.\n3. If pressure is genuinely low with correct oil, stop use and have a qualified technician inspect the pump/bearings.',
    'Hot oil and hot engine components can cause burns. Running an engine with genuinely low oil pressure can cause catastrophic, unsafe failure — shut down and investigate.',
    'DG Expert demo content.', null,
    true, 'published', now()
  ),
  (
    'Battery / Starting-System Problems',
    (select id from knowledge_categories where slug='battery'),
    'Battery', 'Low battery voltage / weak cranking',
    'Slow cranking, repeated start failures, low-voltage alarm.',
    E'1. Aged or sulfated battery\n2. Faulty charging alternator or battery charger\n3. Loose/corroded connections\n4. Parasitic drain\n5. Loose alternator belt',
    E'1. Measure resting battery voltage.\n2. Measure charging voltage with the set running (typically ~13.8-14.4V per 12V).\n3. Load-test the battery.\n4. Inspect terminals and charger operation.',
    E'1. Replace an aged/failed battery.\n2. Repair or replace the charging source.\n3. Clean and tighten connections.\n4. Adjust/replace the charging belt.',
    'Batteries emit explosive hydrogen and can short with very high current. No sparks or flames near batteries; wear eye protection.',
    'DG Expert demo content.', null,
    true, 'published', now()
  ),
  (
    'No Generator Output Voltage',
    (select id from knowledge_categories where slug='alternator'),
    'Alternator', 'No output voltage',
    'Engine runs normally but there is no or very low output voltage.',
    E'1. Faulty AVR\n2. Loss of residual magnetism\n3. Open/faulty excitation winding\n4. Tripped output circuit breaker\n5. Faulty rotating diodes\n6. Loose output connections',
    E'1. Confirm engine speed/frequency is correct.\n2. Check the main output breaker.\n3. Inspect the AVR and its fuses.\n4. Measure excitation per OEM procedure.',
    E'1. Reset/replace a tripped breaker.\n2. Re-flash residual magnetism per OEM procedure.\n3. Replace a faulty AVR or diodes.\n4. Have alternator winding faults assessed by a qualified technician.',
    'HIGH VOLTAGE. The alternator output and control panel can be lethal. De-energize and lock out before touching output terminals. This work should be performed by qualified personnel.',
    'DG Expert demo content.', null,
    true, 'published', now()
  ),
  (
    'Preventive Maintenance Basics',
    (select id from knowledge_categories where slug='maintenance'),
    'Maintenance', 'Preventive maintenance schedule (general)',
    null,
    null,
    E'Daily/Weekly: visual inspection, coolant & oil level, leaks, battery, fuel level.\nEvery ~250h: oil & filter change (per OEM), check belts and hoses.\nEvery ~500h: fuel filters, air filter check, cooling system check.\nAnnually: full inspection, load test, valve and injector checks per OEM.',
    'Adjust all intervals to the manufacturer''s official maintenance schedule and your operating environment.',
    'Isolate and secure the set before servicing. Allow hot components to cool. Follow lockout/tagout.',
    'DG Expert demo content — always defer to the OEM service schedule.',
    null,
    true, 'published', now()
  )
) as v(title, category_id, system, problem, symptoms, possible_causes, diagnostic_procedure,
       corrective_action, safety_precautions, references_text, body, is_demo, status, published_at)
where not exists (
  select 1 from knowledge_articles k where k.title = v.title and k.is_demo = true
);
