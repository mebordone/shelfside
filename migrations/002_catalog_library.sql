-- Catálogo local (metadatos cacheados de APIs o manual).
CREATE TABLE IF NOT EXISTS catalog_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  poster_local_path TEXT,
  season_number INTEGER,
  episode_number INTEGER,
  parent_catalog_id INTEGER REFERENCES catalog_item (id) ON DELETE SET NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, external_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_catalog_item_media_type ON catalog_item (media_type);
CREATE INDEX IF NOT EXISTS idx_catalog_item_title ON catalog_item (title);

-- Una fila de biblioteca por ítem de catálogo (un solo usuario).
CREATE TABLE IF NOT EXISTS library_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catalog_item_id INTEGER NOT NULL UNIQUE REFERENCES catalog_item (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'planning',
  score INTEGER,
  current_season INTEGER,
  last_episode_watched INTEGER,
  progress_current INTEGER,
  progress_total INTEGER,
  owned INTEGER,
  started_at TEXT,
  completed_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (score IS NULL OR (score >= 1 AND score <= 10)),
  CHECK (
    status IN (
      'completed',
      'in_progress',
      'planning',
      'paused',
      'dropped'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_library_entry_status ON library_entry (status);
