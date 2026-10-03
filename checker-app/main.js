const {app,BrowserWindow,protocol,shell,Menu,dialog,ipcMain,net}=require('electron');
const fs=require('fs'),path=require('path'),https=require('https'),http=require('http');
const cfg=require('./config.json');
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const U=f=>path.join(app.getPath('userData'),f);
function cachedVer(){try{return parseInt(fs.readFileSync(U('version.txt'),'utf8'),10)||0}catch(e){return 0}}
function curVer(){return Math.max(cfg.bundledVersion,cachedVer())}
function html(){if(cachedVer()>cfg.bundledVersion){try{return fs.readFileSync(U('page.html'))}catch(e){}}return fs.readFileSync(path.join(__dirname,'page.html'))}
function get(url){return new Promise((res,rej)=>{const m=url.startsWith('https')?https:http;
  const r=m.get(url,{headers:{'Cache-Control':'no-cache'}},x=>{
    if(x.statusCode>=300&&x.statusCode<400&&x.headers.location){x.resume();return res(get(new URL(x.headers.location,url).href))}
    if(x.statusCode!==200){x.resume();return rej(Error('HTTP '+x.statusCode))}
    const c=[];x.on('data',d=>c.push(d));x.on('end',()=>res(Buffer.concat(c)))});
  r.on('error',rej);r.setTimeout(10000,()=>r.destroy(Error('timeout')))})}
async function checkUpdate(){
  if(!cfg.updateUrl)return false;
  try{const v=parseInt((await get(cfg.updateUrl+'version.txt')).toString().trim(),10);
    if(v>curVer()){const h=await get(cfg.updateUrl+'page.html');
      if(h.length>5000&&h.includes(cfg.pub)){fs.writeFileSync(U('page.html'),h);fs.writeFileSync(U('version.txt'),String(v));return true}}}catch(e){}
  return false}
let win;
ipcMain.handle('mc:fetchText',async(e,url)=>{
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'||u.hostname!=='auth.roblox.com'||u.pathname!=='/v1/usernames/validate')return{error:'blocked url'};
    const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),9000);
    const r=await net.fetch(u.href,{signal:ctl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36','Accept':'application/json'}}).finally(()=>clearTimeout(t));
    const body=(await r.text()).slice(0,200000);
    return{status:r.status,body};
  }catch(err){return{error:String(err&&err.message||err).slice(0,120)}}
});
app.whenReady().then(()=>{
  protocol.handle('app',()=>new Response(html(),{headers:{'content-type':'text/html; charset=utf-8'}}));
  Menu.setApplicationMenu(null);
  win=new BrowserWindow({width:1100,height:800,title:'MC Checker',icon:path.join(__dirname,'build','icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.js')}});
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https:/.test(url))shell.openExternal(url);return{action:'deny'}});
  win.webContents.on('will-navigate',(e,u)=>{if(!u.startsWith('app://')){e.preventDefault();if(/^https:/.test(u))shell.openExternal(u)}});
  win.loadURL('app://checker/');
  const tick=async()=>{if(await checkUpdate()&&win&&!win.isDestroyed()){
    const r=await dialog.showMessageBox(win,{message:'An update was downloaded.',detail:'Reload now to use the new version?',buttons:['Reload now','Later'],defaultId:0});
    if(r.response===0)win.loadURL('app://checker/')}};
  tick();setInterval(tick,30*60*1000);
});
app.on('window-all-closed',()=>app.quit());
