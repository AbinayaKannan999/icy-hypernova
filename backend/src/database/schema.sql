-- ============================================================
-- FoodBridge - Intelligent Food Distribution Management System
-- PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('admin', 'donor', 'receiver'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'food_condition') THEN CREATE TYPE food_condition AS ENUM ('excellent', 'good', 'fair', 'needs_immediate_use'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'food_category') THEN CREATE TYPE food_category AS ENUM ('cooked_meals', 'raw_produce', 'packaged_food', 'beverages', 'dairy', 'bakery', 'other'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected', 'in_transit', 'completed', 'cancelled'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN CREATE TYPE notification_type AS ENUM ('donation_added', 'request_received', 'request_accepted', 'request_rejected', 'delivery_started', 'delivery_completed', 'feedback_received', 'system'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN CREATE TYPE delivery_status AS ENUM ('pending', 'picked_up', 'in_transit', 'delivered', 'failed'); END IF; END $$;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'receiver',
  phone VARCHAR(20),
  avatar_url TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- FOOD DONATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS food_donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  food_type food_category NOT NULL DEFAULT 'other',
  quantity INTEGER NOT NULL,
  quantity_remaining INTEGER NOT NULL,
  quantity_unit VARCHAR(50) DEFAULT 'servings',
  condition food_condition NOT NULL DEFAULT 'good',
  preparation_time TIMESTAMP,
  expiry_time TIMESTAMP NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_city VARCHAR(100),
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),
  is_available BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  special_instructions TEXT,
  allergen_info TEXT,
  is_vegetarian BOOLEAN DEFAULT TRUE,
  serving_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- FOOD REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS food_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  quantity_requested INTEGER NOT NULL,
  urgency_level INTEGER DEFAULT 3 CHECK (urgency_level BETWEEN 1 AND 5),
  delivery_address TEXT NOT NULL,
  delivery_city VARCHAR(100),
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  beneficiary_count INTEGER DEFAULT 1,
  special_notes TEXT,
  rejection_reason TEXT,
  qr_code TEXT,
  qr_verified BOOLEAN DEFAULT FALSE,
  qr_verified_at TIMESTAMP,
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure volunteer_id is removed from food_requests if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='food_requests' AND column_name='volunteer_id') THEN
    ALTER TABLE food_requests DROP COLUMN volunteer_id;
  END IF;
END $$;

-- ============================================================
-- DELIVERIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status delivery_status NOT NULL DEFAULT 'pending',
  pickup_latitude DECIMAL(10, 8),
  pickup_longitude DECIMAL(11, 8),
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  pickup_time TIMESTAMP,
  estimated_delivery_time TIMESTAMP,
  actual_delivery_time TIMESTAMP,
  distance_km DECIMAL(8, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure receiver_id exists in deliveries and volunteer_id is gone
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='volunteer_id') THEN
    ALTER TABLE deliveries DROP COLUMN volunteer_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='receiver_id') THEN
    ALTER TABLE deliveries ADD COLUMN receiver_id UUID REFERENCES users(id) ON DELETE CASCADE;
    -- In a real migration, we would update this from food_requests.receiver_id here
    UPDATE deliveries d SET receiver_id = r.receiver_id FROM food_requests r WHERE d.request_id = r.id;
    ALTER TABLE deliveries ALTER COLUMN receiver_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  related_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  feedback_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LOCATION TRACKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS location_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Ensure receiver_id exists in location_tracking and volunteer_id is gone
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='location_tracking' AND column_name='volunteer_id') THEN
    ALTER TABLE location_tracking DROP COLUMN volunteer_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='location_tracking' AND column_name='receiver_id') THEN
    ALTER TABLE location_tracking ADD COLUMN receiver_id UUID REFERENCES users(id) ON DELETE CASCADE;
    -- Try to backfill from delivery table
    UPDATE location_tracking lt SET receiver_id = d.receiver_id FROM deliveries d WHERE lt.delivery_id = d.id;
    -- If we can't backfill, we might need a default or allow null temporarily
    ALTER TABLE location_tracking ALTER COLUMN receiver_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- VERIFICATION OTPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  otp_type VARCHAR(50) NOT NULL DEFAULT 'password_reset',
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_verification_otps_user ON verification_otps(user_id, otp_code, is_used);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_food_donations_donor ON food_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_food_donations_available ON food_donations(is_available, expiry_time);
CREATE INDEX IF NOT EXISTS idx_food_requests_donation ON food_requests(donation_id);
CREATE INDEX IF NOT EXISTS idx_food_requests_receiver ON food_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_food_requests_status ON food_requests(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_request ON deliveries(request_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_receiver ON deliveries(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewee ON feedback(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_delivery ON location_tracking(delivery_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_food_donations_updated_at') THEN
    CREATE TRIGGER update_food_donations_updated_at BEFORE UPDATE ON food_donations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_food_requests_updated_at') THEN
    CREATE TRIGGER update_food_requests_updated_at BEFORE UPDATE ON food_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_deliveries_updated_at') THEN
    CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
