const path=require("path");
const fs=require("fs");
let instancePromise=null;
let dbDir=null;
let pgPool=null;

async function getDb(){
  if(!instancePromise){
    instancePromise=(async()=>{
      const {PGlite}=await import("@electric-sql/pglite");
      const dir=process.env.EMERGENCY_DB_DIR || path.join(require("electron").app.getPath("userData"),"database");
      dbDir=dir;
      return new PGlite(dir);
    })();
  }
  return instancePromise;
}

/*
 * PostgreSQL accepts a batch of SQL statements in some client modes.
 * PGlite's prepared-query path does not. The legacy Emergency Delivery
 * modules still contain a few schema batches, so split them here and
 * execute each statement separately.
 */
function splitSql(sql){
  const out=[];
  let start=0, quote=null, dollar=null;
  for(let i=0;i<sql.length;i++){
    const c=sql[i], n=sql[i+1];

    if(dollar){
      if(sql.startsWith(dollar,i)){ i+=dollar.length-1; dollar=null; }
      continue;
    }

    if(quote){
      if(c==="'" && n==="'"){ i++; continue; }
      if(c===quote){
        if(quote==="'" && n==="'"){ i++; continue; }
        quote=null;
      }
      continue;
    }

    if(c==="'" || c==='"'){ quote=c; continue; }

    if(c==="$"){
      const m=sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if(m){ dollar=m[0]; i+=dollar.length-1; continue; }
    }

    if(c===";"){
      const statement=sql.slice(start,i).trim();
      if(statement) out.push(statement);
      start=i+1;
    }
  }

  const tail=sql.slice(start).trim();
  if(tail) out.push(tail);
  return out;
}

const CONNECTION_RETRY_DELAYS_MS=[500,1000,2000,4000,8000];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function queryPostgresWithRetry(text,params){
  if(!pgPool){
    const {Pool}=require("pg");
    pgPool=new Pool({
      connectionString:process.env.DATABASE_URL,
      max:5,
      connectionTimeoutMillis:5000,
      keepAlive:true
    });
    // A pool-level error can occur for idle clients. Handle it so a transient
    // network interruption does not become an unhandled EventEmitter error.
    pgPool.on("error",err=>{
      console.error("PostgreSQL idle client error:",err.message);
    });
  }

  for(let attempt=0;;attempt++){
    try{
      return await pgPool.query(text,params);
    }catch(err){
      // Retry only failures that prove no PostgreSQL query was executed:
      // ECONNREFUSED, ETIMEDOUT, or pg-pool's connection-acquisition timeout.
      // Do not retry generic socket resets or server/query errors because the
      // database may already have executed a non-idempotent statement.
      const message=String(err && err.message || "").toLowerCase();
      const connectionWasNotEstablished=
        err.code==="ECONNREFUSED" ||
        err.code==="ETIMEDOUT" ||
        message.includes("timeout exceeded when trying to connect");
      if(!connectionWasNotEstablished || attempt>=CONNECTION_RETRY_DELAYS_MS.length) throw err;
      const delay=CONNECTION_RETRY_DELAYS_MS[attempt];
      console.warn(`PostgreSQL connection refused; retrying in ${delay}ms (attempt ${attempt+1}/${CONNECTION_RETRY_DELAYS_MS.length}).`);
      await sleep(delay);
    }
  }
}

const pool={
  async query(text,params=[]){
    // blitz.cloud / online mode: use managed PostgreSQL when DATABASE_URL is present.
    if(process.env.DATABASE_URL){
      return queryPostgresWithRetry(text,params);
    }
    const db=await getDb();
    const statements=splitSql(String(text));
    let last={rows:[]};

    for(const statement of statements){
      // Parameters are only valid for the original single statement.
      // Emergency Delivery's batched legacy schema statements do not use
      // parameters, while normal application queries remain one statement.
      if(statements.length>1 && params.length){
        throw new Error("Multi-statement SQL cannot use parameters in Emergency Delivery local database.");
      }
      last=await db.query(statement,params,{rowMode:"object"});
    }
    return last;
  },
  async end(){
    if(pgPool){ await pgPool.end(); pgPool=null; return; }
    const db=await getDb();
    if(db.close) await db.close();
  }
};

async function recoverLocalDb(){
  try{
    if(instancePromise){
      try{ const db=await instancePromise; if(db && db.close) await db.close(); }catch(_e){}
    }
  }finally{
    instancePromise=null;
  }

  const dir=dbDir || process.env.EMERGENCY_DB_DIR || path.join(require("electron").app.getPath("userData"),"database");
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const backup=dir+"-backup-"+stamp;
  try{
    if(fs.existsSync(dir)) fs.renameSync(dir,backup);
    dbDir=dir;
    return {backup};
  }catch(err){
    // If Windows still holds the old directory, use a fresh sibling directory
    // for this run. The original data remains untouched for manual recovery.
    const fresh=dir+"-fresh-"+stamp;
    fs.mkdirSync(fresh,{recursive:true});
    process.env.EMERGENCY_DB_DIR=fresh;
    dbDir=fresh;
    return {backup:null,fresh};
  }
}

module.exports={pool,getDb,splitSql,recoverLocalDb};
