(function() {

    var local = {};
    var commando = function()
    {
        if ( ! ("commando" in local))
            local.commando = require("commando/commando");

        return local.commando;
    }

    var controller =
    {
        do_cmd_commandoPrefs: function()
        {
            prefs_doGlobalPrefs("commandoItem");
        },

        do_cmd_showCommando: function()
        {
            commando().showCommando();
        },

        /**
         * Check whether command is supported
         *
         * @param   {String} command
         *
         * @returns {Bool}
         */
        supportsCommand: function(command)
        {
            return ("do_" + command) in this;
        },

        /**
         * Check whether command is enabled
         *
         * @param   {String} command
         *
         * @returns {Bool}
         */
        isCommandEnabled: function(command)
        {
            var method = "is_" + command + "_enabled";
            return (method in this) ?
                    this["is_" + command + "_enabled"]() : true;
        },

        /**
         * Execute command
         *
         * @param   {String} command
         *
         * @returns {Mixed}
         */
        doCommand: function(command)
        {
            return this["do_" + command]();
        }
    };

    window.controllers.appendController(controller);

}());
