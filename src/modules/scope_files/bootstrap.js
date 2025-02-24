const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/Services.jsm');

var startupData;

function loadIntoWindow(window) {
    try {
        window.require.setRequirePath("scope-files/", "chrome://scope-files/content/");
        var commando = window.require("commando/commando");
        commando.registerScope("scope-files", {
            name: "Files",
            icon: "chrome://icomoon/skin/icons/file5.png",
            handler: "scope-files/files"
        });
    } catch (e) {
        Cu.reportError("Commando: Exception while registering scope 'Files'");
        Cu.reportError(e);
    }

    try {
        var component = startupData.installPath.clone();
        component.append("components");
        component.append("component.manifest");

        var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
        registrar.autoRegister(component);
    } catch (e) {
        Cu.reportError("Commando: Exception while registering component for 'Files' scope");
        Cu.reportError(e);
    }

    window.addEventListener("komodo-post-startup", function() {
        window.require("scope-files/files").prepare();
    });
}

function unloadFromWindow(window) {
    if (!window) return;
    window.require.removeRequirePath("scope-files");
    var commando = window.require("commando/commando");
    commando.unregisterScope("project-files");
}

var windowListener = {
    onOpenWindow: function(aWindow) {
        // Wait for the window to finish loading
        let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        domWindow.addEventListener("komodo-ui-started", function onLoad() {
            domWindow.removeEventListener("komodo-ui-started", onLoad, false);
            loadIntoWindow(domWindow);
        }, false);
    },

    onCloseWindow: function(aWindow) {},
    onWindowTitleChange: function(aWindow, aTitle) {}
};

function startup(data, reason) {
    startupData = data;

    // Load into any existing windows
    let windows = Services.wm.getEnumerator("Komodo");
    while (windows.hasMoreElements()) {
        Cu.reportError("====== HAS WINDOW");
        let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        loadIntoWindow(domWindow);
    }

    // Load into any new windows
    Services.wm.addListener(windowListener);
}

function shutdown(data, reason) {
    // When the application is shutting down we normally don't have to clean
    // up any UI changes made
    if (reason == APP_SHUTDOWN) return;

    // Stop listening for new windows
    Services.wm.removeListener(windowListener);

    // Unload from any existing windows
    let windows = Services.wm.getEnumerator("Komodo");
    while (windows.hasMoreElements()) {
        let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
        unloadFromWindow(domWindow);
    }
}

function install(data, reason) {}

function uninstall(data, reason) {}
