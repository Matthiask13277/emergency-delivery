const {app,BrowserWindow,dialog}=require("electron");
const path=require("path");
const net=require("net");
let backendLoaded=false;

// Prevent multiple portable instances from locking the local PGlite database.
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
  global.__EMERGENCY_DESKTOP_MODE__=true;
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
  if(!backendLoaded){
    const localServer=require("./server.js").server;
    backendLoaded=true;
    if(localServer && !localServer.listening){
      await new Promise((resolve,reject)=>{
        const onError=err=>{cleanup();reject(err)};
        const onListening=()=>{cleanup();resolve()};
        const cleanup=()=>{
          localServer.off("error",onError);
          localServer.off("listening",onListening);
        };
        localServer.once("error",onError);
        localServer.once("listening",onListening);
      });
    }
  }
}
// Installed Windows builds use the NSIS-created shortcuts directly.
// Do not replace them with a copied portable EXE: that was the source of
// the repeated-start problem when the shortcut targeted the old stable copy.
function ensureDesktopShortcuts(){
  return;
}

async function createWindow(){
  try{await prepare();}
  catch(e){
    await dialog.showMessageBox({
      type:"error",
      title:"Emergency Delivery Desktop 2.2.2 – Startfehler",
      message:e.message,
      detail:"Die lokale Datenbank konnte nicht initialisiert werden."
    });
    app.quit();
    return;
  }

  const win=new BrowserWindow({
    title:"Emergency Delivery CURRENT 2.2.2",
    width:1440,
    height:900,
    minWidth:1100,
    minHeight:700,
    autoHideMenuBar:true,
    backgroundColor:"#ffffff",
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      partition:"desktop-current-v222"
    }
  });

  win.webContents.on("did-fail-load",(_e,code,desc,url)=>{
    console.error("Load failed:",code,desc,url);
  });
  win.webContents.on("did-finish-load",()=>console.log("Desktop UI loaded successfully."));

  const bootstrap=async()=>{
    try{
      await require("./bootstrap-db.js")();
    }catch(firstError){
      try{
        const {recoverLocalDb}=require("./local-db.js");
        const recovery=await recoverLocalDb();
        delete require.cache[require.resolve("./bootstrap-db.js")];
        await require("./bootstrap-db.js")();
        console.warn("Local database recovered",{firstError:String(firstError),...recovery});
      }catch(recoveryError){
        console.error("Local database bootstrap failed:",String(recoveryError));
      }
    }
  };

  try{
    // IMPORTANT: render the shell before starting PGlite/bootstrap. PGlite/WASM
    // startup can temporarily occupy the Electron main process; if bootstrap
    // starts first Chromium can report ERR_FAILED for the localhost page.
    await win.loadURL(
      `http://127.0.0.1:${process.env.PORT}/desktop-launch.html`,
      {extraHeaders:"pragma: no-cache\nCache-Control: no-cache\n"}
    );
    // Only initialize the database after the HTML shell has finished loading.
    // Login/API calls can then wait for the same bootstrap work instead of
    // preventing the desktop window from appearing.
    bootstrap();
  }catch(e){
    await dialog.showMessageBox({
      type:"error",
      title:"Emergency Delivery Desktop 2.2.2 – Ladefehler",
      message:"Die Desktop-Oberfläche konnte nicht geladen werden.",
      detail:String(e.stack||e)
    });
  }
}
// Windows portable mode: the local HTTP server lives in this Electron
// process. When the last window closes, terminate the whole process directly.
// This deliberately avoids asynchronous DB/server teardown because a lingering
// shutdown hook can leave the portable executable unable to start again.
app.on("window-all-closed",()=>{
  if(process.platform!=="darwin"){
    try{
      const localServer=require("./server.js").server;
      if(localServer && localServer.listening) localServer.close();
    }catch(_e){}
    app.exit(0);
  }
});
app.whenReady().then(async()=>{ensureDesktopShortcuts();await createWindow()});
