const {app,BrowserWindow,dialog}=require("electron");

async function start(){
  process.env.PORT="3187";
  try{require("./server.js");}catch(e){
    await dialog.showMessageBox({type:"error",title:"Desktop Diagnose 2.1.6",message:"Server konnte nicht gestartet werden.",detail:String(e.stack||e)});
    app.quit();
    return;
  }

  const win=new BrowserWindow({
    title:"Emergency Delivery DESKTOP DIAGNOSE 2.1.6",
    width:1440,height:900,minWidth:1100,minHeight:700,
    autoHideMenuBar:true,
    backgroundColor:"#ffffff",
    webPreferences:{contextIsolation:true,nodeIntegration:false}
  });

  const errors=[];
  win.webContents.on("console-message",(event,details)=>{
    if(details.level==="error" || details.level==="warning"){
      errors.push("["+details.level+"] "+details.message+" @ "+details.sourceId+":"+details.lineNumber);
      if(errors.length>20) errors.shift();
    }
  });

  win.webContents.on("did-finish-load",()=>{
    setTimeout(async()=>{
      try{
        const raw=await win.webContents.executeJavaScript(`JSON.stringify({
          root:document.getElementById("root") ? document.getElementById("root").innerHTML.length : -1,
          body:document.body ? document.body.innerText.slice(0,400) : ""
        })`);
        const info=JSON.parse(raw);
        if(Number(info.root)===0){
          const detail=["#root ist leer.","","Console:",...(errors.length?errors:["keine"])].join("\n");
          await dialog.showMessageBox({
            type:"error",
            title:"Emergency Delivery DESKTOP DIAGNOSE 2.1.6",
            message:"Die HTML-Datei wurde geladen, aber ihr JavaScript hat keine Oberfläche aufgebaut.",
            detail
          });
        }
      }catch(e){}
    },1500);
  });

  await win.loadURL("http://127.0.0.1:3187/desktop-launch.html",{extraHeaders:"pragma: no-cache\nCache-Control: no-cache\n"});
}

app.whenReady().then(start);
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});