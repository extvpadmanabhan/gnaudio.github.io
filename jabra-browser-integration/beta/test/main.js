﻿/// <reference path="../../JavaScriptLibrary/jabra.browser.integration-2.0.d.ts" />

// DOM loaded
document.addEventListener('DOMContentLoaded', function () {
  let initSDKBtn = document.getElementById('initSDKBtn');
  let unInitSDKBtn = document.getElementById('unInitSDKBtn');
  let checkInstallBtn = document.getElementById('checkInstallBtn');

  let devicesBtn = document.getElementById('devicesBtn');
  let deviceSelector = document.getElementById('deviceSelector');
  let changeActiveDeviceBtn = document.getElementById('changeActiveDeviceBtn');

  let methodSelector = document.getElementById('methodSelector');
  let invokeApiBtn = document.getElementById('invokeApiBtn');

  let txtParam1 = document.getElementById('txtParam1');
  let txtParam2 = document.getElementById('txtParam2');
  let txtParam3 = document.getElementById('txtParam3');
  let txtParam4 = document.getElementById('txtParam4');
  let txtParam5 = document.getElementById('txtParam5');

  let clearMessageAreaBtn = document.getElementById('clearMessageAreaBtn');
  let clearErrorAreaBtn = document.getElementById('clearErrorAreaBtn');
  let clearlogAreaBtn = document.getElementById('clearlogAreaBtn');

  let messageArea = document.getElementById('messageArea');
  let errorArea = document.getElementById('errorArea');
  let logArea = document.getElementById('logArea');

  let installCheckResult = document.getElementById('installCheckResult');
  let clientlibVersionTxt = document.getElementById('clientlibVersionTxt');
  let otherVersionTxt = document.getElementById('otherVersionTxt');

  let player = document.getElementById('player');

  let variables = {
    "audioElement": player
  }

  // Help function
  function isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };
  
  // Advanced methods not available for normal testing.
  let nonMethodSelectorMethods = ["init", 
                                  "shutdown",                                  
                                  "addEventListener",
                                  "removeEventListener"
                                 ];

  // Add all other methods as testable api's.
  Object.entries(jabra).forEach(([key, value]) => {
    if (isFunction(value) && !key.startsWith("_") && !nonMethodSelectorMethods.includes(key)) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.innerHTML = key;
      methodSelector.appendChild(opt);
    }
  });

  // Setup SDK when asked.
  initSDKBtn.onclick = () => {
    // Make sure we log anything by default unless overridden by the user.
    // Useful for testing with old <=0.5 versions.
    jabra.logLevel = 255;

    // Use the Jabra library
    jabra.init().then(() => {
      addStatusMessage("Jabra library initialized successfully")
      toastr.info("Jabra library initialized successfully");
      initSDKBtn.disabled = true;
      unInitSDKBtn.disabled = false;
      checkInstallBtn.disabled = false;
      devicesBtn.disabled = false;
    }).catch((err) => {
       addError(err);
    });
  };

  // Catch all events and errors.
  jabra.addEventListener(/.*/, (event) => {
    if (event && event.error) {
       addError(event);
    } else {
       addEventMessage(event);
    }
  });

  // Close API when asked.
  unInitSDKBtn.onclick = () => {
    if (jabra.shutdown()) {
      initSDKBtn.disabled = false;
      unInitSDKBtn.disabled = true;
      checkInstallBtn.disabled = true;
      devicesBtn.disabled = true;
      changeActiveDeviceBtn.disabled = true;
      while (deviceSelector.options.length > 0) {                
        deviceSelector.remove(0);
      }
      variables = {
        "audioElement": player
      }
    }
  };

  checkInstallBtn.onclick = () => {
    jabra.getInstallInfo().then((installInfo) => {
      if (installInfo.installationOk) {
        installCheckResult.innerHTML = " Installation is ok.";
        installCheckResult.style.color = "green";
      } else {
        installCheckResult.innerHTML = " Installation is not up to date or in-consistent - please upgrade for full functionality and new bug fixes.";
        installCheckResult.style.color = "red";
      }

      otherVersionTxt.innerHTML = ", Browser extension v" + (installInfo.version_browserextension || "?")
                                + ", Native chromehost v" + (installInfo.version_chromehost || "?")
                                + ", Native platform SDK v" + (installInfo.version_nativesdk || "?");

    }).catch((err) => {
      installCheckResult.innerHTML = " Failed verifying installation. Likely because installation is not working or too old to support verification.";
      installCheckResult.style.color = "red";
    })
  };

  // Fillout devices dropdown when asked.
  devicesBtn.onclick = () => {
    jabra.getDevices().then((devices) => {
      while (deviceSelector.options.length > 0) {
        deviceSelector.remove(0);
      }

      // Normally one should not need to check for legacy_result, but for this
      // special test page we would like it to work with older extensions/chromehosts
      // while at the same time using newest JS API. This is not normally
      // supported so we need special code to deal with legazy result formats as well.
      // Do not do this yourself - upgrade dependencies or use older API.

      if (!Array.isArray(devices) && devices && devices.legacy_result) {
        let devicesAry = devices.legacy_result.split(",");
        for (var i = 0; i < devicesAry.length; i += 2){
          Object.entries(devices).forEach(([key, value]) => {
            var opt = document.createElement('option');
            opt.value = devicesAry[i];
            opt.innerHTML = devicesAry[i+1];
            deviceSelector.appendChild(opt);
          });
        }
      } else {
        // Decode device information normally - recommended way going forward.
        devices.forEach(device => {
          var opt = document.createElement('option');
          opt.value = device.deviceID;
          opt.innerHTML = device.deviceName;
          deviceSelector.appendChild(opt);
        });
      }

      if (deviceSelector.options.length == 0) {
        addError("No devices found");
      } else {
        changeActiveDeviceBtn.disabled = false;
      }
    }).catch((error) => {
      addError(error);
    });
  };
  
  // Change active device
  changeActiveDeviceBtn.onclick = () => {
    let id = deviceSelector.value;
    jabra.setActiveDeviceId(id);
  };

  // Call into user selected API method.
  invokeApiBtn.onclick = () => {
    let apiFuncName = methodSelector.options[methodSelector.selectedIndex].value;
    let apiFunc = jabra[apiFuncName];
    let result;

    let arg1 = undefined;
    let arg2 = undefined;
    let arg3 = undefined;
    let arg4 = undefined;
    let arg5 = undefined;

    // Setup arguments for special calls that have special needs:
    if (apiFuncName === "trySetDeviceOutput") {
      arg1 = variables.audioElement;
      arg2 = variables.deviceInfo;
      if (!arg1 || !arg2) {
        addError("Prior call of getUserDeviceMediaExt required to setup custom arguments in this test application");
        return;
      }
    } else if (apiFuncName === "isDeviceSelectedForInput") {
      arg1 = variables.mediaStream;
      arg2 = variables.deviceInfo;
      if (!arg1 || !arg2) {
        addError("Prior call of getUserDeviceMediaExt required to setup custom arguments in this test application");
        return;
      }      
    } else if (apiFuncName === "getUserDeviceMediaExt") {
      try {
        arg1 = JSON.parse(txtParam1.value || "{}");
      } catch (err) {
        addError("Value of text parameter 1 should be a parse-able json object for this api method")
        return;
      }
    } else {
      // Setup arguments for trivial calls that just use text as input.
      arg1 = txtParam1.value;
      arg2 = txtParam2.value;
      arg3 = txtParam3.value;
      arg4 = txtParam4.value;
      arg5 = txtParam5.value;
    }

    try {
      result = apiFunc.call(jabra, arg1, arg2, arg3, arg4, arg5);
      if (result instanceof Promise) {
        result.then((value) => {
          // Handle special calls that must have side effects in this test application:
          if (apiFuncName === "getUserDeviceMediaExt") {
            // Store result for future use in new API calls that needs them.
            variables.mediaStream = value.stream;
            variables.deviceInfo = value.deviceInfo;

            // Configure player to use stream
            player.srcObject =  value.stream;

            // Print prettyfied result:
            addResponseMessage({ stream: (value.stream ? "<MediaStream instance>" : value.stream), "deviceInfo": value.deviceInfo });
            addStatusMessage("NB: Storing stream and deviceinfo to use for subsequent API calls!");
          } else {
            // Normal call - just print output
            addResponseMessage(value);
          }
        }).catch((error) => {
          addError(error);
        });
      } else if (result !== undefined ) {
        addResponseMessage(result);
      }
    } catch (err) {
      addError(err);
    }
  };

  clearMessageAreaBtn.onclick = () => {
    messageArea.value="";
  };

  clearErrorAreaBtn.onclick = () => {
    errorArea.value="";
  };

  clearlogAreaBtn.onclick = () => {
    logArea.value="";
  };

  function addError(err) {  
    let txt;
    if (typeof err === 'string' || err instanceof String) {
      txt = "error string: " + err;
    } else if (err instanceof Error) {
      txt = err.name + " : " + err.message;
    } else {
      txt = "error object: " + JSON.stringify(err, null, 2);
    }
    errorArea.value = errorArea.value + "\n" + txt;
    errorArea.scrollTop = errorArea.scrollHeight;
  }

  function addStatusMessage(msg) {
    let txt = (typeof msg === 'string' || msg instanceof String) ? msg : "Status: " + JSON.stringify(msg, null, 2);
    messageArea.value = messageArea.value + "\n" + txt;
    messageArea.scrollTop = messageArea.scrollHeight;
  }

  function addResponseMessage(msg) {
    let txt = (typeof msg === 'string' || msg instanceof String) ? "response string: " + msg : "response object: " + JSON.stringify(msg, null, 2);
    messageArea.value = messageArea.value + "\n" + txt;
    messageArea.scrollTop = messageArea.scrollHeight;
  }

  function addEventMessage(msg) {
    let txt = (typeof msg === 'string' || msg instanceof String) ? "event string: " + msg : "event object: " + JSON.stringify(msg, null, 2);
    messageArea.value = messageArea.value + "\n" + txt;
    messageArea.scrollTop = messageArea.scrollHeight;
  }

  // Copy console output to log area:
  var console = window.console
  if (console) {
    function replaceStr(str, ...placeholders) {
      var count = 0;
      // return str;
      return str.replace(/%s/g, () => placeholders[count++]);
    }
    function intercept(method){
        var original = console[method]
        console[method] = function() {
          original.apply(console, arguments);

          let txt = replaceStr.apply(this, arguments);          
          logArea.value = logArea.value + "\n" + txt;
          logArea.scrollTop = logArea.scrollHeight;
        }
    }
    var methods = ['log', 'warn', 'error']
    for (var i = 0; i < methods.length; i++)
        intercept(methods[i])
  }

  function getChromeVersion () {     
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/(([0-9]+\.?)*)/);
    return raw ? raw[2] : "?";
  }

  function getOS() {
    if (window.navigator.userAgent.indexOf("Windows")) {
      return "Windows"
    } else if (window.navigator.userAgent.indexOf("Mac")) {
      return "MacOS"
    } else if (window.navigator.userAgent.indexOf("Linux")) {
      return "Linux";
    } else {
      return "?"
    }
  }
  
  // Update initial status texts.
  clientlibVersionTxt.innerHTML = jabra.apiVersion;
  browserAndOsVersionTxt.innerHTML = "Chrome v" + getChromeVersion() + ", " + getOS();
}, false);