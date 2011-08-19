/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is ScrapBook MAF Creator.
 *
 * The Initial Developer of the Original Code is Gary Harris.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *     Gomita <gomita@xuldev.org> (the author of Scrapbook)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// TODO: behaviour for notes and bookmarks
// TODO: use getType to exclude notes and bookmarks.
// TODO: check for presence of scrapbook and version?


var sbMafService = {
  // Zip constants.
  PR_RDONLY      : 0x01,
  PR_WRONLY      : 0x02,
  PR_RDWR        : 0x04,
  PR_CREATE_FILE : 0x08,
  PR_APPEND      : 0x10,
  PR_TRUNCATE    : 0x20,
  PR_SYNC        : 0x40,
  PR_EXCL        : 0x80,

	entryTitle : "",
	contentDir : null,
	resource : null,
	fileRDF : null,
	dateTime : null,
	zipW : null,

	strings : null,
  oSBTree : null,
  oSBData : null,
  oSBUtils : null,
	
	exec : function()
	{
    // Get property strings.
    var strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    this.strings = strbundle.createBundle("chrome://sbmaf/locale/overlay.properties"); 

    // Support SB and SB+.
    // API changes in SB 1.4.0 and again in 1.4.7 broke this extension. The same changes weren't made in SB+
    // NOTE: ScrapBookUtils and ScrapBookData are now in the "modules" directory, not in the .jar.
    if (typeof(sbTreeUI) == "object"){
      // SB 1.4.0 or later.
      this.oSBTree = sbTreeUI;
      this.oSBData = ScrapBookData;
      this.oSBUtils = ScrapBookUtils;
    }
    else if (typeof(sbTreeHandler) == "object"){
      // SB < 1.4.0 or SB+.
      this.oSBTree = sbTreeHandler;
      this.oSBData = sbDataSource;
      this.oSBUtils = sbCommonUtils;
    }
    else{
      var sbVersion = this.strings.GetStringFromName("sbVersion");
			return alert(sbVersion);
		}
		// Get selected entry.
    var selectEntry = this.strings.GetStringFromName("selectEntry");
		var aRes = this.oSBTree.resource ? this.oSBTree.resource : (sbController.isTreeContext ? sbTreeHandler.resource : sbListHandler.resource);
    if(aRes === null){
      alert(selectEntry);
      return false;
    }

		this.entryTitle = (this.oSBData.getProperty(aRes, "title"));

    var id = this.oSBData.getProperty(aRes, "id");
    this.contentDir = this.oSBUtils.getContentDir(id, true);

		// Get datetime.
    id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
		var dd = new Date(
			parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10),
			parseInt(RegExp.$4, 10), parseInt(RegExp.$5, 10), parseInt(RegExp.$6, 10)
		);
		this.dateTime = dd;


    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var bMulti = prefs.getBoolPref("extensions.scrapbook.maf.multitoone");
    var pathOutput = prefs.getCharPref("extensions.scrapbook.maf.outputpath");
    
    // If user output path not set, prompt.
    if(pathOutput == ""){
      var errorPathEmpty = this.strings.GetStringFromName("errorPathEmpty");
      alert(errorPathEmpty);
      return false;
    }
    if(!this.oSBData.isContainer(aRes)){
      // Create the MAF.
    	if(!this.IsNewFileOrCanOverwrite(pathOutput, this.oSBUtils.validateFileName(this.entryTitle + ".maff"))){
        return false;
    	}
      // An exception returned here from handleError() aborts the script.
      try{
        try{
          this.CreateRDF(aRes);
          this.CreateZip(pathOutput);
          this.ZipEntry();
          this.CloseZip();
          this.PostProcess();
        }catch(e){
          this.HandleError(e);
        }
        this.ReportCompletion();
      }catch(e){
        return false;
      }
    }
    else{
      // An exception returned here from handleError() aborts the script.
      try{
        this.processFolderRecursively(aRes, pathOutput, bMulti, true);
      }catch(e){
        return false;
      }
    }
    
    return true;
	},
	
	CreateRDF : function(aRes)
	{
    var txtContent = "";
    txtContent += "<?xml version=\"1.0\"?>\n";
    txtContent += "<RDF:RDF xmlns:MAF=\"http://maf.mozdev.org/metadata/rdf#\"\n";
    txtContent += "         xmlns:NC=\"http://home.netscape.com/NC-rdf#\"\n";
    txtContent += "         xmlns:RDF=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n";
    txtContent += "  <RDF:Description RDF:about=\"urn:root\">\n";
    txtContent += "    <MAF:originalurl RDF:resource=\"" + this.oSBData.getProperty(aRes, "source") + "\"/>\n";
    txtContent += "    <MAF:title RDF:resource=\"" + this.entryTitle + "\"/>\n";
    txtContent += "    <MAF:archivetime RDF:resource=\"" + this.dateTime + "\"/>\n";
    txtContent += "    <MAF:indexfilename RDF:resource=\"index.html\"/>\n";
    txtContent += "    <MAF:charset RDF:resource=\"UTF-8\"/>\n";
    txtContent += "  </RDF:Description>\n";
    txtContent += "</RDF:RDF>\n";
    
		this.fileRDF = this.contentDir.clone();
		this.fileRDF.append("index.rdf");

    this.oSBUtils.writeFile(this.fileRDF, txtContent, "UTF-8");
  },
	
	CreateZip : function(pathOutput)
	{
    var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
    this.zipW = new zipWriter();
    
    var zipFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    zipFile.initWithPath(pathOutput);
    zipFile.append(this.oSBUtils.validateFileName(this.entryTitle) + ".maff");
    
    this.zipW.open(zipFile, this.PR_RDWR | this.PR_CREATE_FILE | this.PR_TRUNCATE);
  },

	CloseZip : function()
	{
      this.zipW.close();
	},
	
  ZipEntry : function()
  {
      this.zipW.addEntryDirectory(this.contentDir.leafName, 0, false);
      // Loop through the files in the dir and find the content files.
      var entries = this.contentDir.directoryEntries;
      while(entries.hasMoreElements())
      {
        var entry = entries.getNext();
        entry.QueryInterface(Components.interfaces.nsIFile);
        // Skip pre-existing .maffs.
        if(entry.leafName.substr(entry.leafName.lastIndexOf('.'), 5) == ".maff"){
          continue;
        }
        this.zipW.addEntryFile(this.contentDir.leafName + "/" + entry.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_BEST, entry, false);
      }
  },

  PostProcess : function()
  {
    // Delete rdf file.
    try{
      var fileRdf = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
      fileRdf.initWithPath(this.contentDir.path);
      fileRdf.append("index.rdf");
      fileRdf.remove(false);
    }catch(e if e.name == "NS_ERROR_FILE_ACCESS_DENIED"){
      var errorAccess = this.strings.GetStringFromName("errorAccess");
      alert(errorAccess);
    }catch(e){
      this.HandleError(e);
    }
  },

	ReportCompletion : function()
	{
    var alertLabel = this.strings.GetStringFromName("alertLabel");
    var alertMessage = this.strings.GetStringFromName("alertMessage");
    var alerts = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
    alerts.showAlertNotification("chrome://sbmaf/content/sbmaf.png", alertLabel, alertMessage, false, "", null);
  },

	processFolderRecursively : function(aRes, pathOutput, bMulti, aRecursive, bRecurring)
	{
    if (typeof(sbTreeUI) == "object"){
      // SB 1.4.7 API changes.
      this.oSBUtils.RDFC.Init(this.oSBData._dataSource, aRes);
    }
    else{
      // SB prior to 1.4.7 and SB+.
      this.oSBUtils.RDFC.Init(this.oSBData.data, aRes);
    }
		var resEnum = this.oSBUtils.RDFC.GetElements();

    this.entryTitle = (this.oSBData.getProperty(aRes, "title"));
    try{
      // Store multiple stored sites in one archive.
      // Prevent zip writing during recursion.
      if(bMulti && typeof(bRecurring) == 'undefined'){
        this.CreateZip(pathOutput);
      }
  		while ( resEnum.hasMoreElements() )
  		{
  			var res = resEnum.getNext();
  			if ( this.oSBData.isContainer(res) ) {
  				if ( aRecursive ){
            this.processFolderRecursively(res, pathOutput, bMulti, aRecursive, true);
          }
  			} else {
          this.entryTitle = (this.oSBData.getProperty(res, "title"));
          var id = this.oSBData.getProperty(res, "id");
          this.contentDir = this.oSBUtils.getContentDir(id, true);
  
        	if(!this.IsNewFileOrCanOverwrite(pathOutput, this.oSBUtils.validateFileName(this.entryTitle + ".maff"))){
            continue;
        	}

          // Create the MAF.
          // Store each stored site in it's own archive.
          if(!bMulti){
            this.CreateZip(pathOutput);
          }

          this.CreateRDF(res);
          this.ZipEntry();

          // Store each stored site in it's own archive.
          if(!bMulti){
            this.CloseZip();
          }
        
          this.PostProcess();
  			}
  		}
      // Store multiple stored sites in one archive.
      // Prevent zip writing during recursion.
      if(bMulti && typeof(bRecurring) == 'undefined'){
        this.CloseZip();
      }
    }catch(e){
      this.HandleError(e);
    }
    this.ReportCompletion();
	},

 	HandleError : function(e)
	{
    var errorText1 = this.strings.GetStringFromName("errorText1");
    var errorText2 = this.strings.GetStringFromName("errorText2");
    var errorText3 = this.strings.GetStringFromName("errorText3");
    var txt = errorText1 + e.name + ".\n\n";
    txt += errorText2 + "\n" + e.message + "\n\n";
    txt += errorText3 + "\n\n";
    alert(txt);
    // Abort the script.
    throw "stop";
	},
	
  // Check if the file already exists and, if so, whether to overwrite.
	IsNewFileOrCanOverwrite : function(pathOutput, fileName)
	{
		var fileOutput = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    fileOutput.initWithPath(pathOutput); 
    fileOutput.append(fileName);
    if(fileOutput.exists()){
      var promptOverwrite1 = this.strings.GetStringFromName("promptOverwrite1");
      var promptOverwrite2 = this.strings.GetStringFromName("promptOverwrite2");
      if(!confirm(fileOutput.path + "\n" + promptOverwrite1 + "\n\n" + promptOverwrite2)){
        return false;
      }
    }
    return true;
  },
	
};

var OverlayMAF = {
  // Update prefs on first load.

  init : function(){
    //gets the version number.
    try {
      // Firefox 4 and later; Mozilla 2 and later
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID("{1544D611-955F-4ceb-95D3-82C720C29EAE}", function(addon) {
        OverlayMAF.init2(addon.version);
      });
    } catch (ex) {
      // Firefox 3.6 and before; Mozilla 1.9.2 and before
      var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
      var addon = em.getItemForID("{1544D611-955F-4ceb-95D3-82C720C29EAE}");
        OverlayMAF.init2(addon.version);
    }
  },

  init2 : function(current){
    var ver = -1;
    var firstrun = false;
    var PrefsMAF = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    var oldPrefsMAF = PrefsMAF.getBranch("scrapbook.maf.");
    var newPrefsMAF = PrefsMAF.getBranch("extensions.scrapbook.maf.");


    try{
    	ver = newPrefsMAF.getCharPref("version");
    	firstrun = newPrefsMAF.getBoolPref("firstrun");
    }catch(e){
      //nothing
    }finally{
      if (firstrun){
        newPrefsMAF.setBoolPref("firstrun",false);
        newPrefsMAF.setCharPref("version",current);
      }		

      if (ver!=current && !firstrun){ // !firstrun ensures that this section does not get loaded if its a first run.
        newPrefsMAF.setCharPref("version",current);

        // Insert code if version is different here => upgrade
        var cnt = {};
        var list = new Array();
        list = oldPrefsMAF.getChildList("", cnt);
        
        // If old prefs exist, convert and delete them.
        if(cnt.value > 0){
          for(var i in list)
          {
            var type = oldPrefsMAF.getPrefType(list[i]);
            // Only convert prefs that have user values.
            if(oldPrefsMAF.prefHasUserValue(list[i])) {
              if(type == Components.interfaces.nsIPrefBranch.PREF_STRING){
                newPrefsMAF.setCharPref(list[i], oldPrefsMAF.getCharPref(list[i]));
              }
              if(type == Components.interfaces.nsIPrefBranch.PREF_INT){
                newPrefsMAF.setIntPref(list[i], oldPrefsMAF.getIntPref(list[i]));
              }
              if(type == Components.interfaces.nsIPrefBranch.PREF_BOOL){
                newPrefsMAF.setBoolPref(list[i], oldPrefsMAF.getBoolPref(list[i]));
              }
            }
          }
          //Delete old prefs.
          oldPrefsMAF.deleteBranch("");
          PrefsMAF.savePrefFile(null);
        }
      }
      
      // Open the help on first run or upgrade.
      if (firstrun || ver != current){
        var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                               .getInterface(Components.interfaces.nsIWebNavigation)
                               .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                               .rootTreeItem
                               .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                               .getInterface(Components.interfaces.nsIDOMWindow);
        
        mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab("chrome://sbmaf/locale/sbmaf.html");
      }
    }
    window.removeEventListener("load", OverlayMAF.init, true);
  }
};


window.addEventListener("load", OverlayMAF.init, true);



