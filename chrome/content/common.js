(function(){
    var PREF = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.scrapbook.addon.maf.");

    var oSBCommon = 
        (typeof ScrapBookUtils !== "undefined") ? ScrapBookUtils :
        (typeof sbCommonUtils !== "undefined") ? sbCommonUtils :
        null;
    var oSBData = 
        (typeof ScrapBookData !== "undefined") ? ScrapBookData :
        (typeof sbDataSource !== "undefined") ? sbDataSource :
        null;
    var oSBController =
        (typeof sbController !== "undefined") ? sbController :
        null;
    var oSBTree =
        (typeof sbTreeUI !== "undefined") ? sbTreeUI :
        (typeof sbTreeHandler !== "undefined") ? sbTreeHandler :
        null;
    var oSBList =
        (typeof sbListHandler !== "undefined") ? sbListHandler :
        null;

    window.sbMafCommon = {
        get BUNDLE() {
            if (oSBCommon.BUNDLE) {
                return oSBCommon.BUNDLE;
            }
            delete this.BUNDLE;
            return this.BUNDLE = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        },

        get RDFC() {
            return oSBCommon.RDFC;
        },

        getContentDir : function(aID, aSuppressCreate) {
            return oSBCommon.getContentDir(aID, aSuppressCreate) ;
        },

        convertToUnicode : function(aString, aCharset) {
            return oSBCommon.convertToUnicode(aString, aCharset);
        },

        validateFileName : function(aFileName) {
            return oSBCommon.validateFileName(aFileName);
        },

        writeFile : function(aFile, aContent, aChars, aNoCatch) {
            return oSBCommon.writeFile(aFile, aContent, aChars, aNoCatch);
        },

        escapeHTML : function(aStr) {
            var list = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
            return aStr.replace(/[&<>"]/g, function(m){ return list[m]; });
        },

        _stringBundles : [],
        
        lang : function(aBundle, aName, aArgs){
            var bundle = this._stringBundles[aBundle];
            if (!bundle) {
                var uri = "chrome://sbmaf/locale/%s.properties".replace("%s", aBundle);
                bundle = this._stringBundles[aBundle] = this.BUNDLE.createBundle(uri);
            }
            try {
                if (!aArgs)
                    return bundle.GetStringFromName(aName);
                else
                    return bundle.formatStringFromName(aName, aArgs, aArgs.length);
            }
            catch (ex) {
            }
            return aName;
        },

        getBoolPref : function(aName, aDefaultValue) {
            try {
                return PREF.getBoolPref(aName);
            } catch(ex) {
                return aDefaultValue;
            }
        },
        
        copyUnicharPref: function(aName, aDefaultValue) {
            try {
                return PREF.getComplexValue(aName, Components.interfaces.nsISupportsString).data;
            } catch(ex) {
                return aDefaultValue;
            }
        },

        setUnicharPref: function (aName, aValue) {
            try {
                var str = Components.classes["@mozilla.org/supports-string;1"].
                          createInstance(Components.interfaces.nsISupportsString);
                str.data = aValue;
                PREF.setComplexValue(aName, Components.interfaces.nsISupportsString, str);
            }
            catch (ex) {}
        },
    };

    window.sbMafData = {
        get data() {
            return ("dataSource" in oSBData) ? oSBData.dataSource : oSBData.data;
        },

        flattenResources: function(aContRes, aRule, aRecursive) {
            return oSBData.flattenResources(aContRes, aRule, aRecursive);
        },

        findParentResource: function(aRes) {
            return oSBData.findParentResource(aRes);
        },

        getProperty: function(aRes, aProp) {
            return oSBData.getProperty(aRes, aProp);
        },
        
        isContainer: function(aRes) {
            return oSBData.isContainer(aRes);
        },
    };

    window.sbMafTree = {
        get resource() {
            if ("isTreeContext" in oSBController) {
                return oSBController.isTreeContext ? oSBTree.resource : oSBList.resource;
            }
            return oSBTree.resource;
        },
    };
})();
