var licenseInfoStr,
  Dict = require("Dict.js"),
  electron = require("electron"),
  shell = electron.shell,
  app = electron.app,
  isWin = "win32" == process.platform,
  isMac = "darwin" == process.platform,
  isLinux = "linux" == process.platform,
  WindowController = require("WindowController.js"),
  trailRemains = -1,
  hasLicense = null,
  fingerPrint = "";
const canContinueUse = () => hasLicense || 0 != trailRemains,
  getFingerPrint = async () => (
    fingerPrint ||
      (fingerPrint = await require("node-machine-id").getMachineId()),
    fingerPrint
  ),
  watchLicense = async () => {
    await [validateTrail(), firstValidateLicense()],
      !1 !== hasLicense && (await validateLicenseAfterRegister(licenseInfoStr)),
      hasLicense && validateInterval();
  },
  validateInterval = async () => {
    var e = app.setting.history,
      a = e.getState().validateDate;
    if (new Date() - a > 864e5) {
      JSON.stringify([licenseInfoStr, fingerPrint]);
      (e.getState().validateDate = new Date() - 0), e.write();
    }
  },
  validateTrail = async () => {
    var e = app.setting.get("installDate");
    !e &&
      compareVersion(app.version, "1.0") >= 0 &&
      (e = (
        await require("fs-extra").stat(
          app.getPath("userData") + "/profile.data"
        )
      ).birthtimeMs);
    var a = Math.floor((new Date() - e) / 864e5);
    trailRemains = Math.max(0, 25 - a);
  },
  firstValidateLicense = async () => {
    (licenseInfoStr = app.setting.get("licenseInfo")) || (hasLicense = !1);
  },
  hashOfString = (e, a) => {
    const i = require("crypto").createHmac("sha256", a);
    return i.update(e), i.digest("base64");
  },
  validateLicenseAfterRegister = async (e) => {
    var a = app.setting.get("l_hash"),
      i = await getFingerPrint(),
      t = hashOfString(e, i);
    hasLicense = t === a;
  },
  endBetaTrail = function () {
    (app.expired = !0),
      (dialog = electron.dialog),
      dialog
        .showMessageBox(null, {
          type: "error",
          buttons: ["OK"],
          defaultId: 0,
          cancelId: 0,
          title: Dict.getPanelString("Error"),
          message: Dict.getPanelString(
            "This beta version of Typora is expired, please download and install a newer version."
          ),
        })
        .then(() => {
          shell.openExternal("https://typora.io/#download"),
            setTimeout(() => {
              process.exit(1);
            }, 1e3);
        });
  };
var DAY_IN_MS = 864e5;
const validateBetaTrail = function (e) {
};
var licensePanel = null;
const showLicensePanel = function (e) {
  null != licensePanel
    ? licensePanel.focus()
    : (licensePanel = WindowController.showPanelWindow({
        width: 525,
        height: 395,
        path: "page-dist/license.html",
        frame: !1,
      })).on("closed", function () {
        licensePanel = null;
      });
};
(exports.validateBetaTrail = validateBetaTrail),
  (exports.watchLicense = watchLicense),
  (exports.showLicensePanel = showLicensePanel);
