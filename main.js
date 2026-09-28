const {app,BrowserWindow,dialog}=require("electron");
const path=require("path");
const net=require("net");
let backendLoaded=false;

function findFreePort(start=3000){
  return new Promise((resolve,reject)=>{
    const tryPort=(port)=>{
      const probe=net.createServer();
      probe.once("error",err=>{
        if(err.code==="EADDRINUSE") return tryPort(port+1);
        reject(err);
      });
      probe.once("listening",()=>probe.close(()=>resolve(port)));
      probe.listen(port,"127.0.0.1");
    };
    tryPort(start);
  });
}
async function prepare(){
  process.env.PORT=String(await findFreePort(3000));
  process.env.JWT_SECRET=process.env.JWT_SECRET||"emergency-delivery-local-v164";
  process.env.EMERGENCY_DB_DIR=path.join(app.getPath("userData"),"database");
  process.env.EMERGENCY_CONFIG_DIR=path.join(app.getPath("userData"),"config");
  process.env.EMERGENCY_CLOUD_URL=process.env.EMERGENCY_CLOUD_URL||"https://emergency-delivery.emergency-delivery1.blitz.cloud";
  process.env.EMERGENCY_CLOUD_TIMEOUT_MS=process.env.EMERGENCY_CLOUD_TIMEOUT_MS||"8000";
  const fs=require("fs");
  const smtpDir=process.env.EMERGENCY_CONFIG_DIR;
  const smtpFile=path.join(smtpDir,"smtp.json");
  if(!fs.existsSync(smtpFile)){
    fs.mkdirSync(smtpDir,{recursive:true});
    fs.writeFileSync(smtpFile,JSON.stringify({
      host:"smtp.gmail.com",
      port:587,
      secure:false,
      user:"emergency.delivery@gmail.com",
      pass:"",
      from:"emergency.delivery@gmail.com"
    },null,2),"utf8");
  }
  const bootstrap=require("./bootstrap-db.js");
  try{
    await bootstrap();
  }catch(firstError){
    const {recoverLocalDb}=require("./local-db.js");
    const recovery=await recoverLocalDb();
    try{ delete require.cache[require.resolve("./bootstrap-db.js")]; }catch(_e){}
    const bootstrapRetry=require("./bootstrap-db.js");
    await bootstrapRetry();
    console.warn("Local database recovered",{firstError:String(firstError),...recovery});
  }
  if(!backendLoaded){require("./server.js");backendLoaded=true}
}
async function createWindow(){
  try{await prepare();}
  catch(e){
    await dialog.showMessageBox({
      type:"error",
      title:"Emergency Delivery Desktop 2.1.8 – Startfehler",
      message:e.message,
      detail:"Die lokale Datenbank konnte nicht initialisiert werden."
    });
    app.quit();
    return;
  }

  const win=new BrowserWindow({
    title:"Emergency Delivery CURRENT 2.1.8",
    width:1440,
    height:900,
    minWidth:1100,
    minHeight:700,
    autoHideMenuBar:true,
    backgroundColor:"#ffffff",
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      partition:"desktop-current-v218"
    }
  });

  win.webContents.on("did-fail-load",(_e,code,desc,url)=>{
    console.error("Load failed:",code,desc,url);
  });

  try{
    await win.loadURL(
      `http://127.0.0.1:${process.env.PORT}/desktop-launch.html`,
      {extraHeaders:"pragma: no-cache\nCache-Control: no-cache\n"}
    );
  }catch(e){
    await dialog.showMessageBox({
      type:"error",
      title:"Emergency Delivery Desktop 2.1.8 – Ladefehler",
      message:"Die Desktop-Oberfläche konnte nicht geladen werden.",
      detail:String(e.stack||e)
    });
  }
}
app.whenReady().then(createWindow);
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});