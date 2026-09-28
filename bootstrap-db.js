const fs=require("fs");
const path=require("path");
const {pool}=require("./local-db.js");
const bcrypt=require("bcryptjs");
let done=false;

function splitSql(sql){
  const out=[];
  let start=0, quote=null, dollar=null;
  for(let i=0;i<sql.length;i++){
    const c=sql[i], n=sql[i+1];
    if(dollar){
      if(sql.startsWith(dollar,i)){i+=dollar.length-1;dollar=null;}
      continue;
    }
    if(quote){
      if(c==="'" && n==="'"){i++;continue;}
      if(c===quote) quote=null;
      continue;
    }
    if(c==="'" || c==='"'){quote=c;continue;}
    if(c==="$"){
      const m=sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if(m){dollar=m[0];i+=dollar.length-1;continue;}
    }
    if(c===";"){
      const s=sql.slice(start,i).trim();
      if(s) out.push(s);
      start=i+1;
    }
  }
  const tail=sql.slice(start).trim();
  if(tail) out.push(tail);
  return out;
}

async function runScript(sql){
  for(const statement of splitSql(sql)) await pool.query(statement);
}

async function bootstrap(){
  if(done)return;
  const schema=fs.readFileSync(path.join(__dirname,"db","schema.sql"),"utf8");
  await runScript(schema);

  const migrations=`
    CREATE TABLE IF NOT EXISTS orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_number text UNIQUE,customer_id uuid REFERENCES customers(id),status text DEFAULT 'new',priority text DEFAULT 'normal',planned_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,planned_at timestamptz,dispatch_note text,dispatch_position integer,created_at timestamptz DEFAULT now());
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS dispatch_slot integer;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS dispatch_locked boolean NOT NULL DEFAULT false;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_calculated_at timestamptz;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_total_distance_km numeric;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_total_duration_min integer;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_eta_end_at timestamptz;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_distance_km numeric;
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_duration_min numeric;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS lat numeric;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS lng numeric;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS dispatch_position integer;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS planned_sequence integer;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS planned_kg numeric;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS planned_pieces integer;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS planned_arrival_at timestamptz;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS actual_arrival_at timestamptz;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS route_arrival_at timestamptz;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS route_departure_at timestamptz;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS lat numeric;
    ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS lng numeric;
  `;
  await runScript(migrations);
  await runScript(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS license_class text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_date date;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid;
  `);

  await runScript(`
    CREATE TABLE IF NOT EXISTS vehicle_maintenance_plans(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      title text NOT NULL,
      maintenance_type text NOT NULL DEFAULT 'service',
      due_date date,
      due_odometer_km numeric,
      interval_km numeric,
      interval_days integer,
      estimated_cost numeric NOT NULL DEFAULT 0,
      provider text,
      active boolean NOT NULL DEFAULT true,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // V180_EMPLOYEE_FIELDS
  await runScript(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS license_class text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_date date;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid;
  `);


  // V182_DOCUMENT_TABLES – idempotent document schema
  await runScript(`
    CREATE TABLE IF NOT EXISTS delivery_documents(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id uuid UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
      document_number text UNIQUE NOT NULL,
      issued_at timestamptz DEFAULT now(),
      status text DEFAULT 'Open',
      proof_complete boolean DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_delivery_documents_trip ON delivery_documents(trip_id);
  `);

  const users=[["admin","Administrator","Admin","admin123"],["dispatcher","Disposition","Dispatcher","dispatch123"],["driver","Fahrer 1","Driver","driver123"],["accounting","Buchhaltung","Accounting","account123"]];
  for(const u of users){
    const h=await bcrypt.hash(u[3],12);
    await pool.query("insert into users(username,name,role,password_hash) values($1,$2,$3,$4) on conflict(username) do nothing",[u[0],u[1],u[2],h]);
  }
  await pool.query("insert into vehicles(name,plate) values('Transporter 1','ED-001'),('Transporter 2','ED-002') on conflict(plate) do nothing");
 // ONLINE COMPATIBILITY SCHEMA
  await runScript(`
    CREATE TABLE IF NOT EXISTS orders(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number text UNIQUE,
      customer_id uuid REFERENCES customers(id),
      status text DEFAULT 'new',
      priority text DEFAULT 'normal',
      planned_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
      planned_at timestamptz,
      dispatch_note text,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer
      ON orders(customer_id);

    CREATE INDEX IF NOT EXISTS idx_orders_planned_trip
      ON orders(planned_trip_id);

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS planned_kg numeric;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS delivered_kg numeric;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS planned_pieces integer;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS planned_arrival_at timestamptz;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS actual_arrival_at timestamptz;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS route_arrival_at timestamptz;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS route_departure_at timestamptz;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS arrival_variance_min integer;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS arrival_radius_m integer;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS live_status text;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS lat numeric;

    ALTER TABLE trip_stops
      ADD COLUMN IF NOT EXISTS lng numeric;

    CREATE TABLE IF NOT EXISTS vehicle_documents(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
      document_type text,
      document_number text,
      issued_at timestamptz,
      expires_at timestamptz,
      status text DEFAULT 'active',
      note text,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle
      ON vehicle_documents(vehicle_id);

    CREATE TABLE IF NOT EXISTS email_outbox(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient text,
      subject text,
      body text,
      status text DEFAULT 'pending',
      attempts integer DEFAULT 0,
      last_error text,
      created_at timestamptz DEFAULT now(),
      sent_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS customer_communication_outbox(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
      channel text,
      recipient text,
      subject text,
      body text,
      status text DEFAULT 'pending',
      attempts integer DEFAULT 0,
      last_error text,
      created_at timestamptz DEFAULT now(),
      sent_at timestamptz
    );

    CREATE INDEX IF NOT EXISTS idx_customer_communication_outbox_customer
      ON customer_communication_outbox(customer_id);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference text;

ALTER TABLE trips ADD COLUMN IF NOT EXISTS live_status text;

ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS delivered_pieces integer;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS eta_at timestamptz;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS arrival_radius_m integer;

ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS queued_at timestamptz;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;

ALTER TABLE customer_communication_outbox ADD COLUMN IF NOT EXISTS queued_at timestamptz;
ALTER TABLE customer_communication_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;`);

  console.log("ONLINE COMPATIBILITY SCHEMA: bereit");

  done=true; 
}
module.exports=bootstrap;
