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
  if(!backendLoaded){require("./server.js");backendLoaded=true}
}
function ensureDesktopShortcuts(){
  if(!app.isPackaged || process.platform!=="win32") return;
  try{
    const fs=require("fs");
    const {shell}=require("electron");
    const appData=app.getPath("appData");
    const stableDir=path.join(app.getPath("userData"),"app");
    const stableExe=path.join(stableDir,"Emergency Delivery Desktop.exe");
    const currentExe=process.execPath;

    fs.mkdirSync(stableDir,{recursive:true});

    // When the app was started from a newly downloaded portable EXE, refresh
    // the stable copy used by the Desktop/Start Menu shortcuts. When started
    // from the stable copy itself, never overwrite the running executable.
    if(path.resolve(currentExe).toLowerCase()!==path.resolve(stableExe).toLowerCase()){
      const tmpExe=stableExe+".new";
      try{
        fs.copyFileSync(currentExe,tmpExe);
        fs.renameSync(tmpExe,stableExe);
      }catch(copyError){
        try{ if(fs.existsSync(tmpExe)) fs.unlinkSync(tmpExe); }catch(_e){}
        console.warn("Stable desktop EXE refresh failed:",String(copyError));
      }
    }

    const targets=[
      path.join(app.getPath("desktop"),"Emergency Delivery.lnk"),
      path.join(appData,"Microsoft","Windows","Start Menu","Programs","Emergency Delivery.lnk")
    ];
    for(const shortcut of targets){
      fs.mkdirSync(path.dirname(shortcut),{recursive:true});
      shell.writeShortcutLink(shortcut,{
        target:stableExe,
        cwd:stableDir,
        description:"Emergency Delivery",
        icon:stableExe,
        iconIndex:0
      });
    }
  }catch(e){console.warn("Desktop shortcut creation failed:",String(e))}
}

async function createWindow(){
  try{await prepare();}
  catch(e){
    await dialog.showMessageBox({
      type:"error",
      title:"Emergency Delivery Desktop 2.2.1 – Startfehler",
      message:e.message,
      detail:"Die lokale Datenbank konnte nicht initialisiert werden."
    });
    app.quit();
    return;
  }

  const win=new BrowserWindow({
    title:"Emergency Delivery CURRENT 2.2.1",
    width:1440,
    height:900,
    minWidth:1100,
    minHeight:700,
    autoHideMenuBar:true,
    backgroundColor:"#ffffff",
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      partition:"desktop-current-v221"
    }
  });

  win.webContents.on("did-fail-load",(_e,code,desc,url)=>{
    console.error("Load failed:",code,desc,url);
  });

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
  bootstrap();

  try{
    await win.loadURL(
      `http://127.0.0.1:${process.env.PORT}/desktop-launch.html`,
      {extraHeaders:"pragma: no-cache\nCache-Control: no-cache\n"}
    );
  }catch(e){
    await dialog.showMessageBox({
      type:"error",
      title:"Emergency Delivery Desktop 2.2.1 – Ladefehler",
      message:"Die Desktop-Oberfläche konnte nicht geladen werden.",
      detail:String(e.stack||e)
    });
  }
}
let shuttingDown=false;
app.on("before-quit",event=>{
  if(shuttingDown) return;
  shuttingDown=true;
  event.preventDefault();
  const shutdown=async()=>{
    try{
      const {pool}=require("./local-db.js");
      await Promise.race([
        pool.end(),
        new Promise(resolve=>setTimeout(resolve,5000))
      ]);
      try{
        const localServer=require("./server.js").server;
        if(localServer && localServer.listening){
          await new Promise(resolve=>localServer.close(()=>resolve()));
        }
      }catch(serverError){
        console.warn("Local server shutdown failed:",String(serverError));
      }
    }catch(e){
      console.warn("Local database shutdown failed:",String(e));
    }finally{
      app.quit();
    }
  };
  shutdown();
});
app.on("window-all-closed",()=>{
  if(process.platform!=="darwin") app.quit();
});
app.whenReady().then(async()=>{ensureDesktopShortcuts();await createWindow()});