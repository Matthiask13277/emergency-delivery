-- Idempotent schema repair for delay communication, customer channels and live alerts.
-- Base tables trips, trip_stops and customers are owned by the main application schema.
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS customer_delay_notified_at timestamptz;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS customer_delay_notification_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_delay_channel text DEFAULT 'email';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_phone text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_phone text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS communication_language text DEFAULT 'it';

CREATE TABLE IF NOT EXISTS control_alerts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_control_alerts_active
  ON control_alerts(acknowledged,severity,created_at DESC);

CREATE TABLE IF NOT EXISTS delay_escalation_rules(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  threshold_minutes integer NOT NULL,
  severity text NOT NULL,
  active boolean DEFAULT true
);
INSERT INTO delay_escalation_rules(name,threshold_minutes,severity)
SELECT '10 Minuten',10,'warning'
WHERE NOT EXISTS(SELECT 1 FROM delay_escalation_rules WHERE threshold_minutes=10);
INSERT INTO delay_escalation_rules(name,threshold_minutes,severity)
SELECT '30 Minuten',30,'critical'
WHERE NOT EXISTS(SELECT 1 FROM delay_escalation_rules WHERE threshold_minutes=30);
INSERT INTO delay_escalation_rules(name,threshold_minutes,severity)
SELECT '60 Minuten',60,'critical'
WHERE NOT EXISTS(SELECT 1 FROM delay_escalation_rules WHERE threshold_minutes=60);

CREATE TABLE IF NOT EXISTS customer_delay_notifications(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid REFERENCES trip_stops(id) ON DELETE CASCADE,
  threshold_minutes integer NOT NULL,
  eta_at timestamptz,
  email text,
  subject text,
  outbox_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_delay_notifications_stop
  ON customer_delay_notifications(stop_id,created_at DESC);

CREATE TABLE IF NOT EXISTS customer_communication_outbox(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  stop_id uuid REFERENCES trip_stops(id) ON DELETE SET NULL,
  channel text NOT NULL,
  recipient text,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'Queued',
  provider text,
  provider_message_id text,
  attempts integer DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_communication_outbox ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE customer_communication_outbox ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE customer_communication_outbox ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE customer_communication_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;

CREATE TABLE IF NOT EXISTS communication_templates(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  language text NOT NULL DEFAULT 'it',
  event_type text NOT NULL,
  threshold_minutes integer DEFAULT 0,
  subject text,
  body text NOT NULL,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
-- A non-unique lookup index avoids failing the entire repair if legacy duplicates exist.
CREATE INDEX IF NOT EXISTS idx_comm_template_lookup
  ON communication_templates(channel,language,event_type,threshold_minutes);

-- Repair columns referenced by the vehicle-document and delivery-deviation sweeps.
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS delivery_photo text;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS time_window_start time;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS time_window_end time;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS planned_kg numeric;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS planned_pieces integer;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS deviation_note text;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS deviation_acknowledged boolean NOT NULL DEFAULT false;

-- Idempotently provision event-deduplication tables used by periodic notification sweeps.
CREATE TABLE IF NOT EXISTS order_event_links(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_key text UNIQUE NOT NULL,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_event_links_order
  ON order_event_links(order_id,created_at DESC);

CREATE TABLE IF NOT EXISTS trip_event_links(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_key text UNIQUE NOT NULL,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_event_links_trip
  ON trip_event_links(trip_id,created_at DESC);

CREATE TABLE IF NOT EXISTS stop_event_links(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id uuid NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  event_key text UNIQUE NOT NULL,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stop_event_links_stop
  ON stop_event_links(stop_id,created_at DESC);

CREATE TABLE IF NOT EXISTS notification_event_links(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text UNIQUE NOT NULL,
  source text NOT NULL,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
