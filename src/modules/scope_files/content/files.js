(function() {
    const log       = require("ko/logging").getLogger("commando-scope-files")
    const commando  = require("commando/commando");
    const {Cc, Ci}  = require("chrome");

    const scope     = Cc["@activestate.com/commando/koScopeFiles;1"].getService(Ci.koIScopeFiles);
    const partSvc   = Cc["@activestate.com/koPartService;1"].getService(Ci.koIPartService);
    const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    const prefs     = ko.prefs;

    //log.setLevel(require("ko/logging").LOG_DEBUG);
    var activeUuid = null;

    this.prepare = function()
    {
        var opts = {};
        var curProject = partSvc.currentProject;
        if (curProject)
        {
            var path = curProject.liveDirectory;
            opts["excludes"] = curProject.prefset.getString("import_exclude_matches");
            opts["includes"] = curProject.prefset.getString("import_include_matches");

            opts["excludes"] = opts["excludes"] == "" ? [] : opts["excludes"].split(";");
            opts["includes"] = opts["includes"] == "" ? [] : opts["includes"].split(";");
        }
        else
        {
            var path = ioService.newURI(ko.places.getDirectory(), null, null).path;
        }

        scope.buildCache(path, JSON.stringify(opts));
    }

    this.onSearch = function(query, uuid)
    {
        log.debug(uuid + " - Starting Scoped Search");

        activeUuid = uuid;

        var opts = {
            "maxresults": ko.prefs.getLong("commando_search_max_results", 25)
        }

        // Detect directory to search in
        var curProject = partSvc.currentProject;
        var subscope = commando.getSubscope();
        if ( ! subscope && curProject)
        {
            subscope = {label: curProject.name.split(".")[0], path: curProject.liveDirectory};
        }
        else if ( ! subscope)
        {
            var placesPath = ioService.newURI(ko.places.getDirectory(), null, null).path;
            subscope = {label: placesPath, path: placesPath};
        }
        //commando.setSubscope(subscope);

        // Todo: platform specific separator
        if (query.substr(0,2) == "./" || query.substr(0,3) == "../" || query[0] == "/")
        {
            var isAbsolute = query[0] == "/";
            query = query.split("/");

            if (isAbsolute)
                subscope.path = "/" + query.slice(0,-1).join("/");
            else
                subscope.path += "/" + query.slice(0,-1).join("/");
                
            query = query.slice(-1);
            opts["recursive"] = false;
        }

        if (query == "")
            opts["recursive"] = false;

        // Set includes/excludes, if relevant
        if (curProject && subscope.path.indexOf(curProject.liveDirectory) === 0)
        {
            opts["excludes"] = curProject.prefset.getString("import_exclude_matches");
            opts["includes"] = curProject.prefset.getString("import_include_matches");

            opts["excludes"] = opts["excludes"] == "" ? [] : opts["excludes"].split(";");
            opts["includes"] = opts["includes"] == "" ? [] : opts["includes"].split(";");
        }

        opts["weightMatch"] = prefs.getBoolean('commando_files_weight_multiplier_match', 30);
        opts["weightHits"] = prefs.getBoolean('commando_files_weight_multiplier_hits', 20);
        opts["weightDepth"] = prefs.getBoolean('commando_files_weight_multiplier_depth', 10);

        opts = JSON.stringify(opts);
        log.debug(uuid + " - Opts: " + opts);

        scope.search(query, subscope.path, opts, function(status, entry)
        {
            if (activeUuid != uuid)
            {
                log.debug(uuid + " - No longer the active search, don't pass result");
                return; // Don't waste any more time on past search queries
            }
            
            if (entry == "done") // search complete
            {
                commando.onSearchComplete("scope-files", uuid);
                return;
            }

            var [name, path, fullPath, type, description, weight] = entry;

            if (path != fullPath)
                description = "<label class='em' crop='left' value='"+subscope.label+"'/>" + description;

            commando.renderResult({
                id: path,
                name: name,
                description: description,
                icon: type == 'dir' ? "chrome://komodo/skin/images/folder-32.png" : "moz-icon://" + path + "?size=32",
                isScope: type == 'dir',
                weight: weight,
                data: {
                    path: path,
                    fullPath: fullPath,
                }
            }, uuid);
        });
    }

    this.sort = function(current, previous)
    {
        return previous.name.localeCompare(current.name) > 0 ? 1 : -1;
    }

    this.onSelectResult = function(selectedItems)
    {
        var uris = []
        for (let item in selectedItems)
        {
            item = selectedItems[item];
            // Todo be a bit more intelligent
            uris.push("file://" + item.resultData.data.fullPath);
        }

        log.debug("Opening files: " + uris.join(", "));

        ko.open.multipleURIs(uris);

        commando.hideCommando();
    }

}).apply(module.exports);
