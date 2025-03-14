var isLoggingEnd, originOut, PRODUCTION_MODE = !0, electron = require("electron"), app = electron.app,
    util = require("util"), Hjson = require("hjson"), Menu = electron.Menu, MenuItem = electron.MenuItem,
    BrowserWindow = electron.BrowserWindow, shell = electron.shell, isWin = "win32" == process.platform,
    isMac = "darwin" == process.platform, isLinux = "linux" == process.platform, fs = require("fs-extra"),
    t_workingDir = require("path").join(__dirname, "../"), menuHelper = require("menu.js"),
    DownloadTask = require("Downloader.js"), Dict = require("Dict.js"), License = require("License.js"),
    pkg = require(PRODUCTION_MODE ? "package.json" : "../package.json"), Raven = require("raven"),
    MAX_LOGGING_LINE = 1e4;

function initLog_(e) {
    var t, n, a = 0, i = app.getPath("userData") + "/typora.log", r = "", o = console.error;

    function s(e, i) {
        try {
            if (a > MAX_LOGGING_LINE) return;
            if (!isLoggingEnd) {
                var o = i + " " + (new Date).toLocaleString() + "  " + util.format(e) + "\n";
                t ? (n.write(o), a++) : r += o
            }
        } catch (e) {
            console.error(e)
        }
    }

    try {
        require("fs-extra").ensureFile(i, function (a) {
            try {
                if (a) return o("failed to create log file"), void(isLoggingEnd = !0);
                (n = fs.createWriteStream(i, {flags: "a"})).on("close", function () {
                    t = !1
                }), r && n.write(r), t = !0, e(n)
            } catch (e) {
                console.error(e)
            }
        }), console.log = function (e) {
            s(e, "INFO")
        }, console.error = function (e) {
            s(e, "ERROR")
        }, console.debug = function (e) {
            s(e, "DEBUG")
        }, originOut = process.stdout.write, process.stdout.write = process.stderr.write = function (e) {
            try {
                if (a > MAX_LOGGING_LINE) return;
                isLoggingEnd || t && (n.write(e), a++)
            } catch (e) {
                console.error(e)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

function prepDatabase(e) {
    return require("lowdb")(new (require("lowdb/adapters/FileSync"))(e, {
        serialize: function (e) {
            return str = JSON.stringify(e) || "{}", Buffer.from(str).toString("hex")
        }, deserialize: function (e) {
            try {
                return e = Buffer.from(e || "", "hex").toString(), JSON.parse(e)
            } catch (e) {
                return {}
            }
        }
    }))
}

var Setting = function () {
    this.db, this.history, this.allThemes = [], this.config = {}, this.saveTimer = null, this.downloadingDicts = [], this.analyticsEvents = [], this.initUserConfig_(), initLog_(e => {
        this.logStream = e
    })
};

function compareVersion(e, t) {
    var n, a, i;
    for (e = e.split("."), t = t.split("."), a = Math.min(e.length, t.length), n = 0; n < a; n++) if (0 !== (i = parseInt(e[n], 10) - parseInt(t[n], 10))) return i;
    return e.length - t.length
}

Setting.prototype.closeLogging = function () {
    console.log("closeLogging");
    try {
        isLoggingEnd = !0, originOut && (process.stdout.write = process.stderr.write = originOut), this.logStream && this.logStream.end()
    } catch (e) {
        console.error(e)
    }
}, Setting.prototype.put = function (e, t) {
    this.db.getState()[e] = t, this.saveTimer && clearTimeout(this.saveTimer), this.saveTimer = setTimeout(this.save.bind(this), 500)
}, Setting.prototype.get = function (e, t) {
    try {
        if ("recentDocument" == e) return this.getRecentDocuments();
        if ("recentFolder" == e) return this.getRecentFolders();
        if ("framelessWindow" == e && isLinux) return !1;
        var n = this.db.getState();
        return void 0 === n[e] ? t : n[e]
    } catch (e) {
        return console.error(e), t
    }
}, Setting.prototype.save = function () {
    this.saveTimer && clearTimeout(this.saveTimer), this.saveTimer = null;
    try {
        this.db.write()
    } catch (e) {
        console.error(e.stack)
    }
}, Setting.prototype.syncAll = function () {
    this.saveTimer && clearTimeout(this.saveTimer);
    try {
        this.db.write(), this.history.write()
    } catch (e) {
        console.error(e.stack)
    }
}, Setting.prototype.getAllThemes = function () {
    return this.allThemes
}, Setting.prototype.getRecentFolders = function () {
    var e = this.history.getState(), t = e.recentFolder;
    return t || (t = [], e.recentFolder = t), t || []
}, Setting.prototype.addRecentFolder = function (e) {
    console.log("addRecentFolder"), e = require("path").normalize(e);
    var t = require("path").basename(e), n = this.getRecentFolders();
    if (t.length) {
        this.removeRecentFolder(e, !0), n.unshift({
            name: t,
            path: e,
            date: new Date
        }), n.length > 8 && n.splice(8), app.addRecentDocument(e);
        try {
            this.history.write()
        } catch (e) {
        }
        app.refreshMenu()
    }
}, Setting.prototype.removeRecentFolder = function (e) {
    var t = this.history.getState().recentFolder, n = t.findIndex(function (t) {
        return t.path == e
    });
    if (~n) {
        t.splice(n, 1);
        try {
            this.history.write()
        } catch (e) {
        }
        app.refreshMenu()
    }
}, Setting.prototype.getRecentDocuments = function () {
    var e = this.history.getState(), t = e.recentDocument;
    return t || (t = [], e.recentDocument = t), t || []
}, Setting.prototype.renameRecentDocuments = function (e, t) {
    if (e != t) {
        var n = isWin ? "\\" : "/", a = this.get("recentDocument");
        if (recentFolders = this.getRecentFolders(), found = !1, toDel = [], [a || [], recentFolders || []].forEach(function (a) {
            a.forEach(function (a, i) {
                a.path != e && 0 != a.path.indexOf(e + n) || (found = !0, t ? (a.path = t + a.path.substring(e.length), a.name = require("path").basename(a.path)) : toDel.push(i))
            });
            for (var i = toDel.length - 1; i >= 0; i--) {
                var r = toDel[i];
                a.splice(r, 1)
            }
        }, this), found) try {
            this.history.write()
        } catch (e) {
        }
    }
}, Setting.prototype.addRecentDocument = function (e) {
    console.log("addRecentDocument");
    var t = require("path").basename(e), n = this.getRecentDocuments();
    this.removeRecentDocument(e, !0), n.unshift({
        name: t,
        path: e,
        date: t.length ? new Date - 0 : 0
    }), n.length > 40 && n.splice(40), app.addRecentDocument(require("path").normalize(e));
    try {
        this.history.write()
    } catch (e) {
    }
    app.refreshMenu(), app.sendEvent("updateQuickOpenCache", {toAdd: e, group: "recentFiles"})
}, Setting.prototype.removeRecentDocument = function (e, t) {
    var n = this.get("recentDocument"), a = n.findIndex(function (t) {
        return t.path == e
    });
    if (~a && (n.splice(a, 1), !t)) {
        try {
            this.history.write()
        } catch (e) {
        }
        app.refreshMenu()
    }
}, Setting.prototype.clearRecentDocuments = function () {
    console.log("clearRecentDocuments");
    var e = this.history.getState();
    e.recentDocument = [], e.recentFolder = [];
    try {
        this.history.write()
    } catch (e) {
    }
    app.clearRecentDocuments && app.clearRecentDocuments(), app.refreshMenu()
}, Setting.prototype.compareVersion = compareVersion, Setting.prototype.refreshThemeMenu = function () {
    var e = Menu.getApplicationMenu().getItem("Themes");
    if (null != e) {
        var t = e.submenu, n = this.curTheme();
        t.clear(), this.allThemes.map(function (e) {
            var a = e.replace(/\.css$/, "").replace(/(^|-|_)(\w)/g, function (e, t, n, a) {
                return (t ? " " : "") + n.toUpperCase()
            });
            t.append(new MenuItem({
                label: a, type: "checkbox", checked: e == n, click: function () {
                    app.forceRefreshMenu(), app.execInAll("window.File && File.setTheme('" + e + "');"), app.setting.setCurTheme(e, a)
                }
            }))
        }), isMac && Menu.setApplicationMenu(Menu.getApplicationMenu())
    }
};
var instanceKey, generateUUID = function () {
    var e = (new Date).getTime();
    return uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (t) {
        var n = (e + 16 * Math.random()) % 16 | 0;
        return e = Math.floor(e / 16), ("x" == t ? n : 3 & n | 8).toString(16)
    })
};
Setting.prototype.generateUUID = function () {
    var e = this.get("uuid", void 0);
    return e || (e = generateUUID(), this.put("uuid", e)), e
};
var userLanguageSetting, encodeSensitiveData = function (e) {
    return e && e.replace(/([^\\\/\s]+[\\\/]){3,}[^\s'"]+['"]*/g, "{filepath}").replace(/[^\s."'{]+\.(md|mmd|markdown|mdwn|txt|text)/g, "{filepath}")
}, processJsFile = function (e) {
    var t;
    return (t = (e = e.replace(/\\/g, "/")).lastIndexOf("/atom")) > -1 && (e = "http://typora-app/atom/" + e.substring(t).replace(/^\/atom(\.asar)?\//, "")), e
}, sanitizeData = function (e) {
    if (e) {
        e.message && (e.message = encodeSensitiveData(e.message)), (e.exception || []).forEach(function (e) {
            e.value && (e.value = encodeSensitiveData(e.value)), e.stacktrace && e.stacktrace.frames && e.stacktrace.frames.forEach(function (e) {
                e.filename && (e.filename = processJsFile(e.filename))
            })
        });
        var t = e.stacktrace || [], n = (e.exception || {}).values || [];
        n.forEach && n.forEach(function (e, n) {
            e && (e.value && (e.value = encodeSensitiveData(e.value)), e.stacktrace && e.stacktrace.frames && (t = t.concat(e.stacktrace.frames)))
        }), t.length && t.forEach(function (e) {
            var t;
            (t = e.filename.lastIndexOf("atom.asar")) > -1 && (e.filename = "http://typora-app/atom/" + e.filename.substring(t + 9).replace(/\\/g, "/"))
        })
    }
}, initSentry = function (e) {
    var t = !1, n = 0;
    if (!isNaN(1630337109905)) {
        var a = (new Date - 1630337109905) / 864e5;
        a > 30 ? (t = !0, n = .001) : n = Math.max(0, (30 - a) / 30), isNaN(n) && (n = .01)
    }
    Raven.config("https://d0d9715b99a0479dbe56658b193c1f5a@sentry2.typora.io/2", {
        logger: "node",
        release: pkg.releaseId,
        autoBreadcrumbs: {http: !1, console: !1},
        sampleRate: n,
        shouldSendCallback: function () {
            return !t && !e.hasUpdates && e.db && e.get("send_usage_info") + "" != "false"
        }
    }).install(uncaughtExceptionHandler), instanceKey = generateUUID(), Raven.mergeContext({
        tags: {
            instance: instanceKey,
            arch: process.platform,
            appVersion: app.getVersion()
        }
    }), Raven.disableConsoleAlerts(), setTimeout(function () {
        console.log("[Raven] instanceKey = " + instanceKey)
    }, 0), Raven.setDataCallback(function (e) {
        try {
            if (!e) return;
            return e.request && (e.request.url = "http://typora/"), e.mechanism && delete e.mechanism, e.exception && sanitizeData(e), e
        } catch (e) {
            console.error(e.stack)
        }
        return {}
    })
}, initProcessConfig = function () {
    const e = require("process");
    e.traceDeprecation = !PRODUCTION_MODE, e.traceProcessWarnings = !PRODUCTION_MODE, e.noDeprecation = !!PRODUCTION_MODE
};
Setting.prototype.init = async function () {
    initProcessConfig(), initSentry(this), this.db = prepDatabase(app.getPath("userData") + "/profile.data"), this.history = prepDatabase(app.getPath("userData") + "/history.data");
    var e = this.get("initialize_ver"), t = app.getPath("userData") + (isWin ? "\\" : "/") + "themes";
    this.put("initialize_ver", app.getVersion()), this.setDefaultFonts_(), e || (this.put("line_ending_crlf", isWin), this.put("preLinebreakOnExport", !0));
    var n = this.generateUUID();
    Raven.mergeContext({user: {id: n}}), setTimeout(function () {
        console.log("[Raven] userId = " + n)
    }, 100);
    var a = this, i = a.allThemes, r = this.curTheme(), o = function () {
    }, s = require("path"), c = require("fs-plus");

    function g() {
        c.list(t, function (e, t) {
            (t || []).forEach(function (e) {
                var t = s.basename(e);
                /^[^\/\sA-Z]+\.css$/.exec(t) && !/\.user\.css/.exec(t) && i.push(t)
            });
            try {
                a.refreshThemeMenu()
            } catch (e) {
                Raven.captureException(e)
            }
        }), a.get("isDarkMode") && !a.get("useSeparateDarkTheme") && (electron.nativeTheme.themeSource = "dark")
    }

    var u, l, p = 0;
    e ? (p = compareVersion(app.getVersion(), e), !(u = (e.split(/\./) || [])[1] != (app.getVersion() || []).split(/\./)[1]) && compareVersion(e, "0.11.3") < 0 && (u = !0)) : p = 1, 0 != p ? (console.log("luanchFromDiffVersion, pre version is " + e), this.addAnalyticsEvent("updateLocation"), l = new Date - 0, this.put("verInitTime", l)) : l = this.get("verInitTime"), License.validateBetaTrail(l);
    var h = t_workingDir + "/style/themes", d = t + "/old-themes";
    if (e && u && await async function () {
        console.log("cleanupOlderCache");
        const e = app.getPath("userData");
        await Promise.all(["blob_storage", "Cache", "Code Cache", "databases", "GPUCache", "IndexedDB", "Local Storage", "Session Storage", "shared_proto_db", "VideoDecodeStats"].concat(["Cookies", "Cookies-journal", "Network Persistent State", "Preferences", "QuotaManager", "QuotaManager-journal", "TransportSecurity"]).map(t => new Promise(n => {
            fs.rm(s.join(e, t), {force: !0, recursive: !0, maxRetries: 1}, n)
        })))
    }(), 0 == p && fs.existsSync(t) ? g() : function () {
        console.log("overwriteThemeFolder"), fs.ensureDirSync(d);
        var e = [];
        if (["github.css", "newsprint.css", "night.css", "pixyll.css", "white.css"].indexOf(r) > -1) {
            try {
                fs.renameSync(s.join(t, r), s.join(d, r)), e.push(r)
            } catch (e) {
            }
            fs.copySync(s.join(h, r), s.join(t, r), {overwrite: !0})
        }
        c.list(h, function (n, a) {
            Promise.all(a.map(function (n) {
                var a = s.basename(n);
                return new Promise(function (n, i) {
                    if (e.indexOf(a) > -1) return n();
                    var r = s.join(h, a), o = s.join(t, a), c = s.join(d, a);
                    fs.rename(o, c, function () {
                        fs.copy(r, o, function () {
                            n()
                        })
                    })
                })
            })).then(function () {
                g()
            })
        })
    }(), 0 != p) {
        var f = {overwrite: !0};
        fs.copy(t_workingDir + "/conf.default.json", app.getPath("userData") + "/conf/conf.default.json", f, o);
        var m = app.getPath("userData") + "/conf/conf.user.json";
        fs.exists(m, function (t) {
            t && "0.9.5" != e || fs.copy(t_workingDir + "/conf.default.json", m, f, o)
        }), e ? compareVersion(e, "0.10.11") <= 0 && this.put("noHintForOpenLink", !0) : (this.put("strict_mode", !0), this.put("copy_markdown_by_default", !0))
    }
    this.initDictionary_(compareVersion(e || "0.9.94", "0.9.93") <= 0), this.addAnalyticsEvent("launch"), e && 0 != p ? this.addAnalyticsEvent(p > 0 ? "upgradeApp" : "downgradeApp", {
        change: e + " → " + app.getVersion(),
        to: app.getVersion()
    }) : this.addAnalyticsEvent("newInstall")
}, Setting.prototype.addAnalyticsEvent = function (e, t) {
    t = t || {}, this.analyticsEvents.push([e, t])
}, Setting.prototype.initUserConfig_ = function () {
    var e, t = app.getPath("userData") + "/conf/conf.user.json";
    try {
        e = fs.readFileSync(t, "utf8"), this.config = e ? Hjson.parse(e) : {}
    } catch (e) {
        console.log("cannot parse user config, use the default one"), this.config = {}
    }
    if (this.config.flags && this.config.flags.length) try {
        this.config.flags.forEach(function (e) {
            e.length && (console.log("--" + e.join(" ")), app.commandLine.appendSwitch.apply(null, e), "disable-gpu" == e.join("") && (console.log("Disable GPU Acceleration"), app.disableHardwareAcceleration()))
        })
    } catch (e) {
        console.error(e.stack)
    }
}, Setting.prototype.setDefaultFonts_ = function () {
    "zh-Hans" == this.getUserLocale() && (this.config.defaultFontFamily = this.config.defaultFontFamily || {}, isWin ? (this.config.defaultFontFamily.standard = this.config.defaultFontFamily.standard || "微软雅黑", this.config.defaultFontFamily.standard = this.config.defaultFontFamily.sansSerif || "微软雅黑") : isLinux && (this.config.defaultFontFamily.standard = this.config.defaultFontFamily.standard || "Noto Serif CJK SC", this.config.defaultFontFamily.standard = this.config.defaultFontFamily.sansSerif || "Noto Sans CJK SC", this.config.defaultFontFamily.standard = this.config.defaultFontFamily.serif || "Noto Serif CJK SC"))
}, Setting.prototype.getUserLocale = function () {
    if (userLanguageSetting || (userLanguageSetting = this.get("userLanguage", "auto")), userLanguageSetting && "auto" != userLanguageSetting || (userLanguageSetting = app.getLocale()), !/^ar/.exec(userLanguageSetting)) {
        switch (userLanguageSetting) {
            case"zh-CN":
            case"zh-Hans":
                userLanguageSetting = "zh-Hans";
                break;
            case"zh-TW":
            case"zh-Hant":
                userLanguageSetting = "zh-Hant";
                break;
            case"it":
            case"it-IT":
            case"it-CH":
                userLanguageSetting = "it-IT";
                break;
            case"nl":
            case"nl-NL":
                userLanguageSetting = "nl-NL";
                break;
            case"hu":
            case"hu-HU":
                userLanguageSetting = "hu-HU";
                break;
            case"pl":
            case"pl-PL":
                userLanguageSetting = "pl-PL";
                break;
            case"pt":
            case"pt-PT":
                userLanguageSetting = "pt-PT";
                break;
            case"pt-BR":
                userLanguageSetting = "pt-BR";
                break;
            case"ko":
            case"ko-KR":
                userLanguageSetting = "ko-KR";
                break;
            case"es-ES":
            case"es":
            case"es-419":
                userLanguageSetting = "es-ES";
                break;
            case"el":
            case"el-CY":
            case"el-GR":
                userLanguageSetting = "el-GR";
                break;
            case"fr":
            case"fr-FR":
            case"fr-CH":
            case"fr-CA":
                userLanguageSetting = "fr-FR";
                break;
            case"hr":
            case"hr-HR":
                userLanguageSetting = "hr-HR";
                break;
            case"sk":
            case"sk-SK":
                userLanguageSetting = "sk-SK";
                break;
            case"sv":
            case"sv-SE":
                userLanguageSetting = "sv-SE";
                break;
            case"de":
            case"de-AT":
            case"de-DE":
                userLanguageSetting = "de-DE";
                break;
            case"de-CH":
                userLanguageSetting = "de-CH";
                break;
            case"ru":
            case"ru-RU":
                userLanguageSetting = "ru-RU";
                break;
            case"ja":
            case"ja-JP":
                userLanguageSetting = "ja-JP";
                break;
            case"cs":
            case"cs-CZ":
                userLanguageSetting = "cs-CZ";
                break;
            case"gl":
            case"gl-ES":
                userLanguageSetting = "gl-ES";
                break;
            case"id":
            case"id-ID":
                userLanguageSetting = "id-ID";
                break;
            case"vi":
            case"vi-VN":
                userLanguageSetting = "vi-VN";
                break;
            case"ca":
            case"ca-ES":
                userLanguageSetting = "ca-ES";
                break;
            case"da":
            case"da-DK":
            case"da-GL":
                userLanguageSetting = "da-DK";
                break;
            case"uk":
            case"uk-UA":
                userLanguageSetting = "uk-UA";
                break;
            case"fa":
            case"fa-AF":
            case"fa-IR":
                userLanguageSetting = "fa-IR";
                break;
            case"tr":
            case"tr-CY":
            case"tr-TR":
                userLanguageSetting = "tr-TR";
                break;
            case"he":
            case"he-IL":
                userLanguageSetting = "he-IL";
                break;
            case"ro":
            case"ro-RO":
                userLanguageSetting = "ro-RO";
                break;
            default:
                userLanguageSetting = "Base"
        }
        return userLanguageSetting
    }
    userLanguageSetting = "ar-SA"
}, Setting.prototype.getLocaleFolder = function (e) {
    return e = e || "Front", "locales/" + this.getUserLocale() + ".lproj/" + e + ".json"
};
const defaultCustomExport = [{name: "Word (.docx)", type: "docx", key: "docx"}, {
    name: "OpenOffice",
    type: "odt",
    key: "odt"
}, {name: "RTF", type: "rtf", key: "rtf"}, {name: "Epub", type: "epub", key: "epub"}, {
    name: "LaTeX",
    type: "latex",
    key: "latex"
}, {name: "Media Wiki", type: "wiki", key: "wiki"}, {
    name: "reStructuredText",
    type: "rst",
    key: "rst"
}, {name: "Textile", type: "textile", key: "textile"}, {name: "OPML", type: "opml", key: "opml"}];
Setting.prototype.loadCustomExports = function () {
    return app.setting.get("customExport") || defaultCustomExport
}, Setting.prototype.exportSettingFor = function (e) {
    var t = app.setting.get("export.general") || {}, n = {type: e};
    return Object.assign(n, t, app.setting.get("export." + e) || {}), n
}, app.setting = new Setting;
var lastExport, ipc = require("electron").ipcMain;
ipc.on("sendLog", function (e, t) {
    console.log("[RenderProcess " + e.sender.id + "][Log] " + t)
}), ipc.handle("setting.loadExports", () => {
    var e = app.setting.get("export.general") || {}, t = {};
    ["pdf", "html", "html-plain", "image"].forEach(n => {
        t[n] = Object.assign({type: n}, e, app.setting.get("export." + n) || {})
    });
    var n = {};
    return app.setting.loadCustomExports().forEach(t => {
        n[t.key] = Object.assign({}, e, t, app.setting.get("export." + t.key) || {})
    }), JSON.stringify([t, n])
}), ipc.handle("export.recordLastExport", (e, t) => {
    lastExport || (app.updateMenu({"File→Export→Export with Previous": {enabled: !0}}), app.updateMenu({"File→Export→Export and Overwrite with Previous": {enabled: !0}})), lastExport = t, app.setting.lastExport = t, app.execInAll(`File.option._lastExport = ${JSON.stringify(t)}`)
}), ipc.handle("setting.getDownloadingDicts", e => JSON.stringify(app.setting.downloadingDicts || [])), ipc.handle("setting.getUserDictionaryPath", e => app.setting.getUserDictionaryPath()), ipc.handle("setting.getUserDict", e => JSON.stringify(app.setting.userDict)), ipc.handle("setting.downloadDict", (e, t) => {
    var n = BrowserWindow.fromWebContents(e.sender);
    app.setting.downloadDict(t, n.id)
}), ipc.handle("setting.getThemes", e => ({
    all: app.setting.getAllThemes() || [],
    current: app.setting.curTheme()
})), ipc.handle("setting.setCurTheme", (e, t, n) => {
    app.setting.setCurTheme(t, n)
}), ipc.handle("setting.loadExportSettings", e => JSON.stringify(app.setting.loadExportSettings())), ipc.handle("setting.resetAdvancedSettings", (e, t) => {
    var n = require("fs-extra"), a = app.getPath("userData") + "/conf/conf.user.json", i = function () {
    };
    n.copy(t_workingDir + "/conf.default.json", app.getPath("userData") + "/conf/conf.default.json", {overwrite: !0}, t ? function () {
        electron.shell.showItemInFolder(a)
    } : i), n.copy(t_workingDir + "/conf.default.json", a, {overwrite: !0}, i)
}), ipc.handle("logger.error", function (e, t) {
    console.log("[RenderProcess " + e.sender.id + "][Error] " + t)
}), ipc.handle("logger.warn", function (e, t) {
    console.log("[RenderProcess " + e.sender.id + "][Warn] " + t)
}), ipc.handle("setting.clearRecentDocuments", e => {
    app.setting.clearRecentDocuments()
}), ipc.handle("setting.removeRecentFolder", (e, t) => {
    app.setting.removeRecentFolder(t)
}), ipc.handle("setting.removeRecentDocument", (e, t) => {
    app.setting.removeRecentDocument(t)
}), ipc.handle("setting.addRecentFolder", (e, t) => {
    app.setting.addRecentFolder(t)
}), ipc.handle("setting.getRecentFiles", e => JSON.stringify({
    files: app.setting.getRecentDocuments() || [],
    folders: app.setting.getRecentFolders() || []
})), ipc.handle("setting.put", (e, t, n) => {
    app.setting.put(t, n)
}), ipc.handle("setting.get", (e, t) => app.setting.get(t)), ipc.handle("setting.fetchAnalytics", e => {
    var t = JSON.stringify(app.setting.analyticsEvents);
    return app.setting.analyticsEvents = [], t
});
var unsavedDraftPath = null;
ipc.handle("setting.getUnsavedDraftsPath", e => app.setting.getUnsavedDraftPath()), Setting.prototype.getUnsavedDraftPath = function () {
    return unsavedDraftPath ? Promise.resolve(unsavedDraftPath) : (unsavedDraftPath = require("path").resolve(app.getPath("userData"), "draftsRecover"), require("fs-extra").ensureDir(unsavedDraftPath).then(() => unsavedDraftPath))
};
var uncaughtExceptionHandler = function (e, t, n) {
    if (t && console.info(t.stack || t.message), e = e || {}, console.error(e.stack || e.message), app.isReady()) {
        var a = e.errno || e.code;
        "ENOTFOUND" != a && "ETIMEDOUT" != a && "ECONNRESET" != a && 0 != (e.message || "").indexOf("net::ERR") && (dialog = require("electron").dialog, stack = null != (ref = e.stack) ? ref : e.name + ": " + e.message, message = "Uncaught Exception:\n" + stack, dialog.showMessageBox(null, {
            type: "error",
            buttons: ["OK", "Learn Data Recovery"],
            defaultId: 0,
            cancelId: 0,
            title: "A JavaScript error occurred in the main process",
            message: message
        }).then(({response: e}) => {
            1 == e ? shell.openExternal("https://support.typora.io/Version-Control/") : process.exit(1)
        }))
    }
};

function sendToRender(e, t) {
    BrowserWindow.getAllWindows().forEach(function (n) {
        n.isDestroyed() || n.webContents.isDestroyed() || n.webContents.isLoading() || n.webContents.send(e, t)
    })
}

function removeFromArr(e, t) {
    var n = e.indexOf(t);
    n > -1 && e.splice(n, 1)
}

process.on("unhandledRejection", function (e) {
    (!e || "ENOTFOUND" != e.errno && "ETIMEDOUT" != e.errno && "ECONNRESET" != e.errno) && (Raven.captureException(e, {
        level: "debug",
        tags: {category: "unhandledRejection"}
    }), console.error("unhandledRejection " + e.stack))
}), Setting.prototype.getUserDictionaryPath = function () {
    return this.userDictionaryPath
}, Setting.prototype.downloadDict = function (e, t) {
    var n = require("electron-dl").download, a = BrowserWindow.fromId(t), i = "https://dict.typora.io/";
    sendToRender("dict-download-start", e);
    var r = this.userDictionaryPath, o = this.downloadingDicts;
    if (!(o.indexOf(e) > -1)) {
        var s = function (e, t) {
            sendToRender("dict-download-err", {
                locale: e,
                message: t.message
            }), fs.unlink(r + "/_" + e + ".dic", function () {
            }), fs.unlink(r + "/_" + e + ".aff", function () {
            }), removeFromArr(o, e)
        };
        o.push(e), Promise.all(["dic", "aff"].map(function (t) {
            return n(a, i + e + "/index." + t, {
                directory: r,
                filename: "_" + e + "." + t,
                saveAs: !1,
                showBadge: !1,
                onCancel: function () {
                    s(e, {message: "Dowbload Cancelled"})
                },
                onProgress: function (n) {
                    try {
                        sendToRender("dict-download-process", {locale: e, type: t, process: n.percent})
                    } catch (e) {
                        console.error(e)
                    }
                }
            })
        }, this)).then(function () {
            Promise.all([e + ".dic", e + ".aff"].map(function (e) {
                return fs.move(r + "/_" + e, r + "/" + e.replace(/-/, "_"), {overwrite: !0})
            })).then(function () {
                removeFromArr(o, e), sendToRender("dict-download-end", e)
            }).catch(function (t) {
                s(e, t)
            })
        }).catch(function (t) {
            s(e, t)
        }), n(a, i + e + "/LICENSE", {
            directory: this.userDictionaryPath,
            filename: e + "-LICENSE",
            saveAs: !1,
            showBadge: !1
        })
    }
};
var getDictionaryPath_ = function () {
    var e = require("path"),
        t = e.join(t_workingDir, "node_modules", "spellchecker", "vendor", "hunspell_dictionaries");
    try {
        var n = t.replace(".asar" + e.sep, ".asar.unpacked" + e.sep);
        require("fs").statSyncNoException(n) && (t = n)
    } catch (e) {
    }
    return t
};
Setting.prototype.initDictionary_ = async function (e) {
    var t = this;
    this.userDictionaryPath = null, this.userDict = {};
    try {
        var n = getDictionaryPath_(), a = app.getPath("userData"), i = require("path"), r = i.join(a, "dictionaries"),
            o = i.join(a, "typora-dictionaries");
        if (await fs.pathExists(o)) t.userDictionaryPath = o, sendToRender("dict-loaded", o); else try {
            e && await fs.pathExists(r) ? await fs.copy(r, o) : await fs.copy(n, o), Raven.captureBreadcrumb("copy userDictionaryPath"), t.userDictionaryPath = o, sendToRender("dict-loaded", o)
        } catch (e) {
            console.error(e), Raven.captureException(e)
        }
    } catch (e) {
        console.error(e), Raven.captureException(e)
    }
    try {
        t.userDictionaryPath && (t.userDict = require(this.userDictionaryPath + "/user-dict.json"))
    } catch (e) {
    }
    var s = function () {
        t.userDictionaryPath && require("fs").writeFile(t.userDictionaryPath + "/user-dict.json", JSON.stringify(t.userDict), function () {
        }), app.sendEvent("user-dict-update", t.userDict)
    }, c = electron.ipcMain;
    c.on("user-dict-add", function (e, n) {
        t.userDict[n.lang] = t.userDict[n.lang] || [], t.userDict[n.lang].push(n.word), s()
    }), c.on("user-dict-remove", function (e, n) {
        t.userDict[n.lang] = (t.userDict[n.lang] || []).filter(function (e) {
            return e != n.word
        }), s()
    })
}, Setting.prototype.buildOption = function () {
    var e = {};
    e.enableInlineMath = this.get("enable_inline_math") || !1, e.enableHighlight = this.get("enable_highlight") || !1, e.enableSubscript = this.get("enable_subscript") || !1, e.enableSuperscript = this.get("enable_superscript") || !1, e.enableDiagram = 0 != this.get("enable_diagram"), e.copyMarkdownByDefault = this.get("copy_markdown_by_default") || !1, e.showLineNumbersForFence = this.get("show_line_numbers_for_fence") || !1, e.noPairingMatch = this.get("no_pairing_match") || !1, e.autoPairExtendSymbol = this.get("match_pari_markdown") || !1, e.expandSimpleBlock = this.get("auto_expand_block") || !1, e.headingStyle = this.get("heading_style") || 0, e.ulStyle = this.get("ul_style") || 0, e.olStyle = this.get("ol_style") || 0, e.scrollWithCursor = !this.get("no_mid_caret"), e.autoNumberingForMath = this.get("auto_numbering_for_math"), e.noDisplayLinesInMath = this.get("noDisplayLinesInMath"), e.useRelativePathForImg = this.get("use_relative_path_for_img") || !1, e.allowImageUpload = this.get("allow_image_upload") || !1, e.defaultImageStorage = this.get("image_save_location") || null, "custom" == e.defaultImageStorage && (e.defaultImageStorage = this.get("custom_image_save_location")), e.applyImageMoveForWeb = this.get("apply_image_move_for_web") || !1, e.applyImageMoveForLocal = !this.get("no_image_move_for_local"), e.preferCRLF = this.get("line_ending_crlf") || !1, e.sidebarTab = this.get("sidebar_tab") || "", e.useTreeStyle = this.get("useTreeStyle") || !1, e.sortType = this.get("file_sort_type") || 0, e.strictMarkdown = this.get("strict_mode") || !1, e.noLineWrapping = this.get("no_line_wrapping") || !1, e.prettyIndent = this.get("prettyIndent") || !1, e.convertSmartOnRender = this.get("SmartyPantsOnRendering"), e.smartDash = this.get("smartDash"), e.smartQuote = this.get("smartQuote"), e.twoHyphensToEm = this.get("twoHyphensToEm") || !1, e.remapUnicodePunctuation = this.get("remapPunctuation"), e.indentSize = this.get("indentSize") || 2, e.codeIndentSize = this.get("codeIndentSize") || 4, e.enableAutoSave = this.get("enableAutoSave") || !1, e.saveFileOnSwitch = this.get("save_file_on_switch") || !1, e.presetSpellCheck = this.get("preset_spell_check") || "auto", e.autoCorrectMisspell = !1;
    var t = this.config || {};
    e.monocolorEmoji = t.monocolorEmoji, e.userQuotesArray = this.get("userQuotesArray"), e.passiveEvents = !0, e.canCollapseOutlinePanel = this.get("can_collapse_outline_panel"), e.preLinebreakOnExport = this.get("preLinebreakOnExport"), e.preLinebreakOnExport = 1 == e.preLinebreakOnExport || "true" == e.preLinebreakOnExport, e.indentFirstLine = this.get("indentFirstLine"), e.hideBrAndLineBreak = this.get("hideBrAndLineBreak"), e.isFocusMode = this.get("isFocusMode"), e.isTypeWriterMode = this.get("isTypeWriterMode"), e.ignoreLineBreak = this.get("ignoreLineBreak") || !1, e.sendAnonymousUsage = this.get("send_usage_info"), void 0 !== e.sendAnonymousUsage && null !== e.sendAnonymousUsage || (e.sendAnonymousUsage = !0), e.uuid = this.get("uuid"), e.appVersion = app.getVersion(), e.instance = instanceKey, e.userLocale = this.getUserLocale(), e.appLocale = app.getLocale(), e.sidebarWidth = this.get("sidebar-width"), e.caseSensitive = this.get("caseSensitive"), e.wholeWord = this.get("wholeWord"), e.fileSearchCaseSensitive = this.get("fileSearchCaseSensitive"), e.fileSearchWholeWord = this.get("fileSearchWholeWord"), e.wordCountDelimiter = this.get("wordCountDelimiter") || 0;
    try {
        e.userPath = app.getPath("home") || ""
    } catch (t) {
        e.userPath = ""
    }
    e.userDataPath = app.getPath("userData") || "", e.tempPath = app.getPath("temp");
    try {
        e.documentsPath = app.getPath("documents")
    } catch (t) {
        e.documentsPath = ""
    }
    return e.curTheme = this.curTheme(), e.useCustomFontSize = this.get("useCustomFontSize"), e.customFontSize = this.get("customFontSize"), e.expandFolders = this.get("not_group_by_folders"), e.framelessWindow = this.get("framelessWindow"), e.showStatusBar = !1 !== this.get("showStatusBar"), e.customWordsPerMinute = this.get("customWordsPerMinute"), e.customWordsPerMinute ? e.wordsPerMinute = this.get("wordsPerMinute") || 382 : e.wordsPerMinute = 382, e.maxFetchCountOnFileList = t.maxFetchCountOnFileList || 200, e.autoSaveTimer = t.autoSaveTimer || 3, e.autoHideMenuBar = t.autoHideMenuBar, e.searchService = t.searchService, e.zoomFactor = this.get("zoomFactor") || 1, e.noMagnification = this.get("noMagnification"), e.autoEscapeImageURL = this.get("autoEscapeImageURL") || !1, e.moveColLeftKey = (menuHelper.getKeyAccelerator("Move Column Left", "Alt+Left") || "").toLowerCase(), e.moveColRightKey = (menuHelper.getKeyAccelerator("Move Column Right", "Alt+Right") || "").toLowerCase(), e.moveRowUpKey = (menuHelper.getKeyAccelerator("Move Row Up", "Alt+Up") || "").toLowerCase(), e.moveRowDownKey = (menuHelper.getKeyAccelerator("Move Row Down", "Alt+Down") || "").toLowerCase(), e.mathFormatOnCopy = this.get("mathFormatOnCopy") || "svg", e.imageUploader = this.get("image_uploader"), e.customImageUploader = this.get("custom_image_uploader"), e.picgoAppPath = this.get("picgo_app_path"), e.noWarnigUploadDisabled = this.get("noWarnigUploadDisabled") || !1, e.noWarnigForMoveFile = this.get("noWarnigForMoveFile") || !1, e.noWarnigForMoveFileToList = this.get("noWarnigForMoveFileToList") || !1, e.noWarnigForDeleteFile = this.get("noWarnigForDeleteFile") || !1, e.noWarnigForTypeWriterMode = this.get("noWarnigForTypeWriterMode") || !1, e.noHintForOpenLink = this.get("noHintForOpenLink") || !1, e.noHintForUnibody = this.get("noHintForUnibody") || !1, e.noWarnigForFocusMode = this.get("noWarnigForFocusMode") || !1, e.noWarningForExportOverwrite = this.get("noWarningForExportOverwrite") || !1, e.hasUpdates = this.hasUpdates || !1, e.pandocPath = this.get("pandocPath") || "", e.buildTime = 1630337109905, e.debug = this.get("debug"), e._lastExport = lastExport, e
}, Setting.prototype.extraOption = function () {
    var e = this.buildOption();
    return e.restoreWhenLaunch = this.get("restoreWhenLaunch") || 0, e.pinFolder = this.get("pinFolder"), e.enable_inline_math = e.enableInlineMath, e.enable_highlight = e.enableHighlight, e.enable_subscript = e.enableSubscript, e.enable_superscript = e.enableSuperscript, e.enableDiagram = 0 != this.get("enable_diagram"), e.enable_diagram = e.enableDiagram, e.copy_markdown_by_default = !!this.get("copy_markdown_by_default"), e.show_line_numbers_for_fence = !!this.get("show_line_numbers_for_fence"), e.no_pairing_match = !!this.get("no_pairing_match"), e.match_pari_markdown = !!this.get("match_pari_markdown"), e.auto_expand_block = !!this.get("auto_expand_block"), e.heading_style = this.get("heading_style") || 0, e.ul_style = this.get("ul_style") || 0, e.ol_style = this.get("ol_style") || 0, e.no_mid_caret = this.get("no_mid_caret"), e.auto_numbering_for_math = this.get("auto_numbering_for_math"), e.use_relative_path_for_img = this.get("use_relative_path_for_img"), e.allow_image_upload = this.get("allow_image_upload"), e.image_save_location = this.get("image_save_location"), e.custom_image_save_location = this.get("custom_image_save_location"), e.apply_image_move_for_web = this.get("apply_image_move_for_web"), e.no_image_move_for_local = this.get("no_image_move_for_local"), e.line_ending_crlf = this.get("line_ending_crlf"), e.strict_mode = this.get("strict_mode"), e.no_line_wrapping = this.get("no_line_wrapping"), e.prettyIndent = this.get("prettyIndent"), e.SmartyPantsOnRendering = this.get("SmartyPantsOnRendering"), e.remapPunctuation = this.get("remapPunctuation"), e.save_file_on_switch = this.get("save_file_on_switch") || !1, e.preset_spell_check = this.get("preset_spell_check") || "auto", e.can_collapse_outline_panel = this.get("can_collapse_outline_panel"), e.send_usage_info = !1 !== this.get("send_usage_info"), e.currentThemeFolder = app.getPath("userData") + "/themes", e.enableAutoUpdate = !1 !== this.get("enableAutoUpdate"), e.userLanguage = this.get("userLanguage"), e.image_uploader = this.get("image_uploader"), e.custom_image_uploader = this.get("custom_image_uploader"), e.picgo_app_path = this.get("picgo_app_path"), e.allThemes = this.allThemes, e.useSeparateDarkTheme = this.get("useSeparateDarkTheme") || !1, e.theme = this.get("theme") || "github.css", e.darkTheme = this.get("darkTheme") || "night.css", e.customExport = this.get("customExport"), ["general", "pdf", "html", "html-plain", "image"].forEach(t => {
        e["export." + t] = this.get("export." + t)
    }), (e.customExport || defaultCustomExport).forEach(t => {
        e["export." + t.key] = this.get("export." + t.key)
    }), e
}, ipc.handle("setting.getExtraOption", e => JSON.stringify(app.setting.extraOption())), ipc.handle("setting.doDownloadPicgo", e => {
    app.setting.doDownloadPicgo()
}), ipc.handle("setting.getKeyBinding", e => app.setting.config.keyBinding || {}), Setting.prototype.doDownloadPicgo = function () {
    Dict.init().then(function () {
        let e = "https://github.com/typora/PicGo-cli/releases/download/latest/%@.zip".replace("%@", isWin ? "x64" == process.arch ? "win64" : "win32" : "linux");
        console.log(e);
        let t = require("path").normalize(app.getPath("userData") + "/picgo"),
            n = require("path").normalize(t + "/_picgo.zip");
        var a = new DownloadTask(e, n, {
            title: Dict.getPanelString("Download"),
            text: Dict.getPanelString("Downloading…"),
            processOnComplete: .9
        });
        a.onSuccess = ((e, i) => {
            require("extract-zip")(n, {dir: t}, function (e) {
                i.value = 1, i.text = Dict.getPanelString("Finished"), i.detail = "", setTimeout(() => {
                    a.setCompleted()
                }, 2e3), fs.unlink(n, () => {
                })
            }), i.detail = Dict.getPanelString("Unzipping…")
        }), a.onError = (e => {
            electron.dialog.showErrorBox(Dict.getPanelString("Download"), e.message)
        }), a.download()
    })
};
var lastIsDarkTheme = null;
Setting.prototype.useDarkTheme = function () {
    return lastIsDarkTheme = electron.nativeTheme.shouldUseDarkColors && this.get("useSeparateDarkTheme")
}, Setting.prototype.useDarkThemeBefore = function () {
    return lastIsDarkTheme
}, Setting.prototype.curTheme = function () {
    return this.useDarkTheme() ? this.get("darkTheme") || "night.css" : this.get("theme") || "github.css"
}, Setting.prototype.setCurTheme = function (e, t) {
    return Menu.getApplicationMenu().getItem("Themes").submenu.items.map(function (e) {
        e.checked = e.label == t
    }), this.useDarkTheme() ? this.put("darkTheme", e) : this.put("theme", e)
}, exports = module.exports = Setting;