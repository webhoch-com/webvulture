-- Up Migration

CREATE TYPE user_role AS ENUM ('admin', 'editor');
CREATE TYPE lead_status AS ENUM ('new', 'approved', 'teaser_generated', 'email_generated', 'contacted', 'archived');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE search_jobs (
  id SERIAL PRIMARY KEY,
  target_group VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  count INTEGER NOT NULL DEFAULT 5,
  status job_status NOT NULL DEFAULT 'pending',
  results_count INTEGER DEFAULT 0,
  error_message TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500),
  url VARCHAR(2000) NOT NULL,
  email VARCHAR(500),
  phone VARCHAR(100),
  branche VARCHAR(255),
  region VARCHAR(255),
  address TEXT,
  ssl BOOLEAN DEFAULT FALSE,
  mobile BOOLEAN DEFAULT FALSE,
  speed VARCHAR(20) DEFAULT 'unknown',
  rating INTEGER CHECK (rating >= 1 AND rating <= 3),
  suggestions TEXT,
  analysis_raw JSONB,
  analysis_cost DECIMAL(10,4) DEFAULT 0,
  status lead_status NOT NULL DEFAULT 'new',
  design_wishes TEXT,
  teaser_subdomain VARCHAR(100),
  teaser_html TEXT,
  teaser_cost DECIMAL(10,4) DEFAULT 0,
  email_text TEXT,
  email_cost DECIMAL(10,4) DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  search_job_id INTEGER REFERENCES search_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teaser_changes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  change_request TEXT NOT NULL,
  html_before TEXT,
  html_after TEXT,
  cost DECIMAL(10,4) DEFAULT 0,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_rating ON leads(rating);
CREATE INDEX idx_leads_branche ON leads(branche);
CREATE INDEX idx_leads_search_job ON leads(search_job_id);
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_teaser_changes_lead ON teaser_changes(lead_id);
