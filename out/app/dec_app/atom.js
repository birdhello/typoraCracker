var t_workingDir;module.exports=function(){},function(){var e=require("path"),n=require("module");t_workingDir=e.join(__dirname,"../"),n.globalPaths.push(e.join(t_workingDir,"node_modules.asar")),n.globalPaths.push(__dirname);var o=n.prototype.require;n.prototype.require=function(n){return/(\.node$)|(\/build\/Release)/.exec(n)&&"."==n[0]&&(n=e.resolve(e.dirname(this.id),n).replace(/\bnode_modules\.asar\b/,"node_modules")),o.call(this,n)};for(let e=0;e<process.argv.length;e++)if(process.argv[e].startsWith("--inspect")||process.argv[e].startsWith("--remote-debugging-port"))throw new Error("Arguments not allowed debug in production main thread")}();var electron=require("electron"),app=electron.app,protocol=electron.protocol,BrowserWindow=electron.BrowserWindow,fs=require("fs-extra"),isWin="win32"==process.platform,isMac="darwin"==process.platform,isLinux="linux"==process.platform,Setting=require("Setting.js"),menuHelper=require("menu.js"),desktop=require("Desktop.js"),filesOp=require("FilesOp.js"),documentController=require("DocumentController.js"),ipc=electron.ipcMain,Raven=require("raven");global.devVersion=!0;var gotSingleInstanceLock=app.requestSingleInstanceLock();if(!gotSingleInstanceLock)return console.log("secondary instance would exit"),void app.quit();app.on("second-instance",function(e,n,o){if(console.log("got argv ["+n.join(" ")+"] from secondary instance"),BrowserWindow.getAllWindows().length){var t=getFilePath(n,o);t?app.openFileOrFolder(t,{forceCreateWindow:!t}):normalOpen(n||[])}});var ReopenType={FOLDER:1,FILE:2,CUSTOM:3};function initAutoUpdate(){if(isWin){var e=require("./updater.js");app.updater=e,setTimeout(function(){e.init().then(function(){!1!==app.setting.get("enableAutoUpdate")&&app.updater.checkForUpdates(!1)})},3e3)}}function getFilePath(e,n){var o;void 0==n&&(n=process.cwd());for(var t=e.length-1;t>=0;t--)if("-"!=e[t][0]){o=e[t];break}if(0!=t&&o!=n||(o=void 0),o&&/^file:\/\//i.exec(o)){o=o.replace(/^file:\/\//i,"");try{o=decodeURI(o)}catch(e){}}return o?require("path").resolve(n,o):void 0}function limitStr(e){if(!e)return e;var n=e.length;return n>50?'"'+e.substr(0,15)+"..."+e.substr(n-15)+'"':e}app.backups={},app.removeBackup=function(e){_onQuittingProcess?app.backups[e]&&(app.backups[e].hasUnsaved=!1):delete app.backups[e]},app.addBackup=function(e,n){e.path&&Object.keys(app.backups).forEach(function(n){e.path&&app.backups[n].path==e.path&&delete app.backups[n]}),app.backups[e.id]=e,app.syncBackups(e.id,n),console.log(`added recovery ${e.id} ${e.path} ${limitStr(e.content)} (${(e.content||"").length})`)};var inBatchClosing,inBatchClosingTimer,_onQuittingProcess=!1;app.syncBackups=function(e,n){var o=app.getPath("userData")+"/backups",t=_onQuittingProcess;function r(r){if(r)console.log("Error on creating backup folder "+r.stack);else{var i=Object.values(app.backups),a={innormalQuit:!t,windows:i.map(function(e){return{id:e.id,path:e.path,encode:e.encode,useCRLF:e.useCRLF,hasUnsaved:e.hasUnsaved,scrollPos:e.scrollPos,syncDate:e.syncDate,mountFolder:e.mountFolder}})};if(t||n){a.windows.forEach(function(e){e.hasUnsaved&&(a.innormalQuit=!0)}),a.windows.length||(a.windows=lastClose.map(function(e,n){return e.id=n,e}));try{fs.writeFileSync(o+"/sum",JSON.stringify(a))}catch(r){console.log("Error on saving backups "+r.stack)}console.log("synced recovery")}else fs.writeFile(o+"/sum",JSON.stringify(a),function(e){e?console.log("Error on saving backups "+e.stack):console.log("synced recovery")});if(void 0!==e||null!==e){var s=app.backups[e];s&&s.hasUnsaved&&fs.writeFile(o+"/"+s.id,s.content,function(e){e&&console.log("Error on saving backups "+e.stack)})}}}if(t||n)try{fs.ensureDirSync(o),r()}catch(e){console.log("Error on creating backup folder "+e.stack)}else fs.ensureDir(o,r)};var lastClose=[];app.onCloseWin=function(e,n){var o=BrowserWindow.fromId(e),t=app.getDocumentController(),r=t.getDocumentFromWindowId(e).path;!function(e,n){var o=e.getBounds();n.lastClosedBounds=n.lastClosedBounds||{},n.lastClosedBounds.fullscreen=e.isFullScreen(),n.lastClosedBounds.maximized=e.isMaximized(),n.lastClosedBounds.fullscreen||n.lastClosedBounds.maximized||(n.lastClosedBounds.x=o.x,n.lastClosedBounds.y=o.y,n.lastClosedBounds.width=o.width,n.lastClosedBounds.height=o.height),app.setting.put("lastClosedBounds",n.lastClosedBounds)}(o,t),inBatchClosing||(inBatchClosing=!0,lastClose=[]),inBatchClosingTimer&&clearTimeout(inBatchClosingTimer),inBatchClosingTimer=setTimeout(function(){inBatchClosing=!1,inBatchClosingTimer=null,app.setting.save()},100);var i=app.backups[e];i||(i={path:r,mountFolder:n}),lastClose.push(i),t.removeWindow(e).then(function(){app.removeBackup(e),o.destroy()})},ipc.on("addBackup",function(e,n,o){(n=JSON.parse(n||"{}")).id=(BrowserWindow.fromWebContents(e.sender)||{}).id,void 0!==n.id&&app.addBackup(n,o)}),app.currentFocusWindowId=null,app.getCurrentFocusWindowId=function(){return app.currentFocusWindowId},ipc.handle("app.openFile",(e,n,o)=>((o=o||{}).curWindow&&(o.curWindow=BrowserWindow.fromWebContents(e.sender)),app.openFile(n||null,o).then(e=>{if(e)return new Promise(n=>{let o=e.activeWindow.webContents;o.isLoading()?o.once("did-finish-load",function(){n({winId:e.activeWindow.id})}):n({winId:e.activeWindow.id})})}))),ipc.handle("app.openFileOrFolder",(e,n,o)=>((o=o||{}).curWindow&&(o.curWindow=BrowserWindow.fromWebContents(e.sender)),app.openFileOrFolder(n||null,o))),ipc.handle("app.openOrSwitch",(e,n,o)=>{var t=BrowserWindow.fromWebContents(e.sender),r=app.documentController.getDocument(n),i=app.documentController.getDocumentFromWindowId(t.id);if(r){var a=r.activeWindow||r.windows.keys().next().value;return a&&a.focus(),!1}return o?(app.openFileOrFolder(n,{curWindow:!0}),!1):new Promise(e=>{require("fs-plus").isDirectory(n,o=>{if(o)app.switchFolder(n,t);else if(!r)return i.rename(n),void e(!0);e(!1)})})}),ipc.handle("app.openFolder",(e,n,o)=>{app.openFolder(n||null,o?BrowserWindow.fromWebContents(e.sender):void 0)}),ipc.handle("app.onCloseWin",(e,n)=>{var o=BrowserWindow.fromWebContents(e.sender);app.onCloseWin(o.id,n)}),ipc.handle("app.sendEvent",(e,n,o)=>{app.sendEvent(n,o)}),ipc.handle("executeJavaScript",(e,n,o)=>{BrowserWindow.fromId(n).webContents.executeJavaScript(o)}),app.reopenFolder=function(){var e=new Set,n=!1;return lastClose.forEach(function(o){o.mountFolder&&!e.has(o.mountFolder)&&(e.add(o.mountFolder),app.openFile(null,{forceCreateWindow:!0,mountFolder:o.mountFolder}),n=!0)}),n},app.reopenClosed=function(e){var n=!1;return lastClose.length&&lastClose.forEach(function(o){var t=app.getDocumentController().getDocument(o.path);t?t.activeWindow&&t.activeWindow.show():(app.openFile(o.path,{forceCreateWindow:!0,mountFolder:o.mountFolder,silent:e,backupState:o}),n=!0)}),n};var normalOpen=function(e){var n=app.setting.get("restoreWhenLaunch")||0,o=!0,t=e||process.argv||[];t.indexOf("--new")>-1&&(n=0),t.indexOf("--reopen-file")>-1&&(n=ReopenType.FILE);try{if(n==ReopenType.FOLDER)o=!app.reopenFolder();else if(n!=ReopenType.FILE||e){if(n==ReopenType.CUSTOM){var r=app.setting.get("pinFolder");r&&(app.openFile(null,{forceCreateWindow:!0,mountFolder:r,pinFolder:r}),o=!1)}}else o=!app.reopenClosed(!0)}catch(e){console.warn(e.stack)}o&&app.openFileOrFolder()};app.recoverFromBackup=function(e){var n=app.getPath("userData")+"/backups",o=0,t=async function(e){console.log("recoverWindow "+JSON.stringify(e));var t=e;if(e.hasUnsaved){if(e.hasUnsaved)try{var r=await fs.readFile(n+"/"+e.id,"utf8");console.log(`[${e.id}] recover from content ${r.length} ${limitStr(r)}`),r.length<2e6?(e.content=r,t=e):(console.log("abort recovery: file too large"),t=null)}catch(e){console.error(e),t=null}}else t=null;if(0!=o&&t&&!t.path&&!t.content)return console.log("skip due to empty untitled file"),void o--;app.openFile(e.path||null,{forceCreateWindow:!0,mountFolder:e.mountFolder,backupState:t})};fs.readFile(n+"/sum","utf8",function(n,r){if(n||!r)return normalOpen();try{var i=JSON.parse(r);lastClose=i.windows.filter(function(e){return e.path||e.mountFolder}).map(function(e){return{path:e.path,mountFolder:e.mountFolder}}),i.windows=i.windows.filter(function(e){return void 0!=e.id}),o=i.windows.length-1,e||i.windows.length&&i.innormalQuit?(console.log("launch from abnormal quit"),i.windows.forEach(t)):normalOpen()}catch(e){app.openFileOrFolder(),console.log("failed to read backup "+e.stack)}})},process.argv.forEach(e=>{/^--/.exec(e)&&("--on-dev"==e?process.traceDeprecation=!0:-1===["--new","--reopen-file"].indexOf(e)&&app.commandLine.appendSwitch.apply(null,[e]))}),app.on("ready",async function(){if(await app.setting.init(),!app.expired){documentController.lastClosedBounds=app.setting.get("lastClosedBounds"),console.log("------------------start------------------"),console.log("typora version: "+app.getVersion()),bindRequestProxy(),app.setAppUserModelId("abnerworks.Typora"),process.argv;var e=getFilePath(process.argv);e&&"--on-dev"!==process.argv[process.argv.length-1]?app.openFileOrFolder(e):app.recoverFromBackup(),menuHelper.loadDict().then(()=>{menuHelper.bindMainMenu()}),bindDownloadingEvents(),initAutoUpdate(),desktop.bindJumplist(),setTimeout(function(){try{cleanUpExpiredDrafts()}catch(e){console.warn(e.stack)}},3e4)}});var clearOlderUnsavedDraftTimer,cachedFileCTime={},cleanUpManyExpiredDrafts=function(e,n){var o=0,t=new Date;return new Promise(r=>{var i=[],a=async function(){var s=Math.min(o+50,n.length);if(o+1>=n.length)r(i);else{for(;o++;o<s){if(!n[o])return void r(i);try{var l=e+"/"+n[o],p=await fs.stat(l);t-p.mtime>864e6?fs.unlink(l,function(){}):(i.push(n[o]),cachedFileCTime[n[o]]=p.mtime.getTime())}catch(e){}}clearOlderUnsavedDraftTimer=setTimeout(a,3e4)}};clearOlderUnsavedDraftTimer=setTimeout(a,1e4)})},cleanUpExpiredDrafts=async function(){var e=await app.setting.getUnsavedDraftPath(),n=await fs.readdir(e);if(!(n.length<250)){n.length>400&&(n=await cleanUpManyExpiredDrafts(e,n));var o=await Promise.all(n.map(async n=>{try{return{name:n,time:cachedFileCTime[n]||(await fs.stat(e+"/"+n)).mtime.getTime()}}catch(e){}return{name:n,time:0}}));cachedFileCTime=null,o.sort(function(e,n){return n.time-e.time}).forEach(function(n,o){o>150&&fs.unlink(e+"/"+n.name,function(){})})}};app.on("window-all-closed",function(){app.quit()}),app.on("before-quit",function(){_onQuittingProcess=!0,app.syncBackups(null,!0),console.log("----------------before-quit-----------------")}),ipc.handle("app.cancelQuit",()=>{_onQuittingProcess=!1}),app.on("quit",function(){console.log("-----------------quit------------------"),app.setting.closeLogging()}),app.on("will-quit",function(){console.log("------------------will-quit------------------"),inBatchClosingTimer&&clearTimeout(inBatchClosingTimer),clearOlderUnsavedDraftTimer&&clearTimeout(clearOlderUnsavedDraftTimer),isWin&&app.updater&&app.updater.installIfNeeded(),app.setting.syncAll();try{var e=app.getPath("userData")+"/typora.log",n=app.getPath("userData")+"/typora-old.log",o=fs.statSync(e);o&&o.size>5e5&&(fs.existsSync(n)&&fs.unlinkSync(n),fs.renameSync(e,n))}catch(e){console.error(e)}}),app.on("browser-window-blur",function(e,n){console.log("[blur] "+n.id)}),app.on("browser-window-focus",function(e,n){console.log("[focus] "+n.id)}),app.getWorkingDir=function(){return __dirname+"../"},app.getDocumentController=function(){return documentController},app.documentController=documentController,app.openFolder=function(e,n){if(n){var o=documentController.getDocumentFromWindowId(n.id);if(o&&!o.path)return app.switchFolder(e,n),Promise.resolve()}return app.setting.addAnalyticsEvent("openFolder"),app.openFile(null,{mountFolder:e,showSidebar:!0})},app.switchFolder=function(e,n,o,t){if("string"==typeof(o=o||!1)&&(o=JSON.stringify(o)),n=n||BrowserWindow.getFocusedWindow()){var r="File.option && (File.option.pinFolder = "+JSON.stringify(e)+");\n File.editor && File.editor.library && File.editor.library.setMountFolder("+JSON.stringify(e)+", true, "+o+")";return setTimeout(function(){n.webContents.executeJavaScript(r)},t||0),n}},app.openFileOrFolder=function(e,n){e&&require("fs-plus").isDirectorySync(e)?n&&n.forceCreateWindow?documentController.openFile(void 0,{prepWindow:!0,displayNow:!0,forceCreateWindow:!0,mountFolder:e,showSidebar:!0}):app.openFolder(e):!e&&n&&n.forceCreateWindow?documentController.openFile(void 0,{prepWindow:!0,displayNow:!0,forceCreateWindow:!0}):app.openFile(e,n)},app.openFile=function(e,n){var o=(n=n||{}).curWindow||BrowserWindow.getFocusedWindow(),t=n.syncAndPrepOnly,r=n.forceCreateWindow;function i(){return documentController.openFile(e,{prepWindow:!0,displayNow:r||!t,forceCreateWindow:r,silent:n.silent,mountFolder:n.mountFolder,pinFolder:n.pinFolder,backupState:n.backupState,showSidebar:n.showSidebar})}if(e=e&&require("path").normalize(e),!t&&e&&!r&&o&&o.webContents&&!o.webContents.isLoadingMainFrame()){var a=documentController.getDocumentFromWindowId(o.id);if(a&&!a.path)return o.webContents.executeJavaScript("File.changeCounter.isDiscardableUntitled()").then(function(n){return n&&n?o.webContents.executeJavaScript("File.editor.library.openFile("+JSON.stringify(e)+")").then(()=>documentController.getDocumentFromWindowId(o.id)):i()}).then(function(e){return e})}return i()},app.sendEvent=function(e,n){BrowserWindow.getAllWindows().forEach(function(o){o.webContents.send(e,n)}),app.onMessage(e,n)},app.execInAll=function(e){BrowserWindow.getAllWindows().forEach(function(n){n.webContents.executeJavaScript(e)})},app.onMessage=function(e,n){"didRename"==e?app.setting.renameRecentDocuments(n.oldPath,n.newPath):"updateQuickOpenCache"==e&&n.toDel&&app.setting.renameRecentDocuments(n.toDel,null)},app.refreshMenu=function(){menuHelper.refreshMenu()};var getFileNameFromURL=e=>{var n=require("url"),o=require("path"),t=n.parse(e),r=o.basename(t.pathname);try{var i=decodeURIComponent(r);if(i!=r)return o.basename(i)}catch(e){}return r},downloadingItems={};function uniqueFilePathOnNode(e){var n=require("path");return e.replace(/(\.[^.\/\\]+?$)/,"")+"-"+(new Date-0)+n.extname(e)}ipc.handle("app.download",(e,n,o,t)=>{var r=require("path"),i=BrowserWindow.fromWebContents(e.sender),a=require("electron-dl"),s=t||getFileNameFromURL(n),l=r.join(o,s);return fs.existsSync(l)&&(l=uniqueFilePathOnNode(l)),console.log("downloading "+n+" to "+l),downloadingItems[i.id+n]||(downloadingItems[i.id+n]=a.download(i,n,{showBadge:!1,directory:o,filename:s})),setTimeout(()=>{delete downloadingItems[i.id+n]},10),Promise.race([downloadingItems[i.id+n].then(e=>({path:e.getSavePath(),state:e.getState(),type:e.getMimeType()}),()=>({path:n,state:"error"})),new Promise(e=>{setTimeout(()=>{e({path:n,state:"timeout"})},3e4)})])});var bindDownloadingEvents=function(){var e=/^file:\/\/([a-z0-9\-_]+\.)+([a-z]+)\//i;electron.session.defaultSession.webRequest.onBeforeRequest({urls:["file://**.*/*"]},function(n,o){var t=n.url;e.exec(t)?(t="https"+t.substr(4),console.log("redirect to "+t),o({cancel:!1,redirectURL:t})):o({cancel:!1})})},bindRequestProxy=function(){protocol.registerFileProtocol("typora",function(e,n){e.url?n({path:app.getRealPath(e.url)}):n({error:-324})}),protocol.registerBufferProtocol("typora-bg",function(e,n){var o=app.setting.get("backgroundColor");n(o?{mimeType:"text/css",data:Buffer.from(`body {background:${o};`)}:{mimeType:"text/css",data:Buffer.from("")})})};app.getRealPath=function(e){if(/^typora:\/\//.exec(e)){try{e=decodeURI(e)}catch(e){}var n=e.substr(9);return/userData/.exec(n)&&(n=n.replace("userData",app.getPath("userData").replace(/\\/g,"\\\\"))),/current-theme\.css/.exec(n)&&(n=n.replace("current-theme.css",app.setting.curTheme())),/typemark/i.exec(n)&&(n=n.replace("typemark",t_workingDir)),n=n.replace(/[?#][^\\\/]*$/,"")}return e},app.filesOp=filesOp;