  // Get property strings.
  var strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
  this.strings = strbundle.createBundle("chrome://sbmaf/locale/prefwindow.properties"); 

  // Get the path to the output directory.
  function onOutputBrowse()
  {
    // Get property strings.
    var strbundle = document.getElementById("strings");
    var browseFolder = strbundle.getString('browseFolder');

    // Init a file picker and display it.
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, browseFolder, nsIFilePicker.modeGetFolder);

    var res = fp.show();
    if (res == nsIFilePicker.returnOK){
      var thefile = fp.file;
      // Update pref.
      document.getElementById("outputpath").value = thefile.path;
    }
    
    return true;
  }
  
  function onClickHelp()
  {
    // Add tab, then make active
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var mainWindow = wm.getMostRecentWindow("navigator:browser");
    mainWindow.gBrowser.selectedTab = mainWindow.gBrowser.addTab("https://github.com/danny0838/firefox-scrapbook-maf-creator/wiki");

    this.close();
  }
  
  function onDialogAccept()
  {
    // Check that the output path is valid.
    var pathOutput = document.getElementById("outputpath");
    var ret = true;

    if(pathOutput.value == ""){
      var errorPathEmpty = this.strings.GetStringFromName("errorPathEmpty");
      alert(errorPathEmpty);
      ret = false;
    }
    else{
      var fileOutput = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
      fileOutput.initWithPath(pathOutput.value);
      if(!fileOutput.exists()){
        alert(this.strings.formatStringFromName("errorPathInvalid", [pathOutput.value], 1));
        ret = false;
      }
    }
    return ret;
  }
