-- Up Migration
-- Default admin: username=admin, password=webhoch2024
-- bcrypt hash for 'webhoch2024' with 12 rounds
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@webhoch.com', '$2a$12$1o1gB9KTb8gH6ZfJ7tW1GOBgQi8m2KctlsVV4CgbOR7bPS2x69t76', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value, is_encrypted) VALUES
  ('default_ai_model', 'claude-opus-4-20250514', false),
  ('teaser_domain', 'webseiten-werkstatt.at', false)
ON CONFLICT (key) DO NOTHING;
