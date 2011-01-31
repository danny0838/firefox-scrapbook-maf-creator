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
    sbCommonUtils.loadURL("chrome://sbmaf/locale/sbmaf.html", true);
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
        var errorPathInvalid = this.strings.GetStringFromName("errorPathInvalid");
        alert(pathOutput.value + "\n\n" + errorPathInvalid);
        ret = false;
      }
    }
    return ret;
  }
