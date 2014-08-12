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
    zipW : null,
    
    exec : function()
    {
        // Get selected entry.
        var selectEntry = sbMafCommon.lang("overlay", "selectEntry");
        var aRes = sbMafTree.resource;
        if (aRes === null) {
            alert(selectEntry);
            return false;
        }

        this.entryTitle = (sbMafData.getProperty(aRes, "title"));

        var id = sbMafData.getProperty(aRes, "id");
        this.contentDir = sbMafCommon.getContentDir(id, true);

        var bMulti = sbMafCommon.getBoolPref("multitoone", false);
        var pathOutput = sbMafCommon.copyUnicharPref("outputpath", "");
        
        // If user output path not set, prompt.
        if (pathOutput == "") {
            var errorPathEmpty = sbMafCommon.lang("overlay", "errorPathEmpty");
            alert(errorPathEmpty);
            return false;
        }
        if (!sbMafData.isContainer(aRes)) {
            // Create the MAF.
            if (!this.IsNewFileOrCanOverwrite(pathOutput, sbMafCommon.validateFileName(this.entryTitle + ".maff"))) {
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
        else {
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
        // Get datetime.
        var id = sbMafData.getProperty(aRes, "id");
        id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        var dateTime = new Date(
            parseInt(RegExp.$1, 10), parseInt(RegExp.$2, 10) - 1, parseInt(RegExp.$3, 10),
            parseInt(RegExp.$4, 10), parseInt(RegExp.$5, 10), parseInt(RegExp.$6, 10)
        );

        var txtContent = "";
        txtContent += "<?xml version=\"1.0\"?>\n";
        txtContent += "<RDF:RDF xmlns:MAF=\"http://maf.mozdev.org/metadata/rdf#\"\n";
        txtContent += "         xmlns:NC=\"http://home.netscape.com/NC-rdf#\"\n";
        txtContent += "         xmlns:RDF=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n";
        txtContent += "  <RDF:Description RDF:about=\"urn:root\">\n";
        txtContent += "    <MAF:originalurl RDF:resource=\"" + sbMafData.getProperty(aRes, "source") + "\"/>\n";
        txtContent += "    <MAF:title RDF:resource=\"" + this.entryTitle + "\"/>\n";
        txtContent += "    <MAF:archivetime RDF:resource=\"" + dateTime + "\"/>\n";
        txtContent += "    <MAF:indexfilename RDF:resource=\"index.html\"/>\n";
        txtContent += "    <MAF:charset RDF:resource=\"UTF-8\"/>\n";
        txtContent += "  </RDF:Description>\n";
        txtContent += "</RDF:RDF>\n";
    
        this.fileRDF = this.contentDir.clone();
        this.fileRDF.append("index.rdf");

        sbMafCommon.writeFile(this.fileRDF, txtContent, "UTF-8");
    },
    
    CreateZip : function(pathOutput)
    {
        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
        this.zipW = new zipWriter();
        
        var zipFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        zipFile.initWithPath(pathOutput);
        zipFile.append(sbMafCommon.validateFileName(this.entryTitle) + ".maff");
        
        this.zipW.open(zipFile, this.PR_RDWR | this.PR_CREATE_FILE | this.PR_TRUNCATE);
    },

    CloseZip : function()
    {
        this.zipW.close();
    },
    
    ZipEntry : function()
    {
        var base = this.contentDir.leafName;
        this.zipW.addEntryDirectory(base, 0, false);
        var dirArr = [this.contentDir]; //adds dirs to this as it finds it
        for (var i=0; i<dirArr.length; i++) {
            var dirEntries = dirArr[i].directoryEntries;
            while (dirEntries.hasMoreElements()) {
                var entry = dirEntries.getNext().QueryInterface(Components.interfaces.nsIFile);
                if (entry.isDirectory()) {
                   dirArr.push(entry);
                   continue;
                }
                var relPath = entry.path.replace(dirArr[0].path, ''); //need relative because we need to use this for telling addEntryFile where in the zip it should create it, and because zip is a copy of the directory
                var saveInZipAs = relPath.substr(1); //need to get ride of the first '\' forward slash at start otherwise it puts every file added in a folder of its own.
                saveInZipAs = saveInZipAs.replace(/\\/g, '/'); //remember MUST use forward slash (/)
                saveInZipAs = base + "/" + saveInZipAs;
                this.zipW.addEntryFile(saveInZipAs, Components.interfaces.nsIZipWriter.COMPRESSION_BEST, entry, false);
            }
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
            var errorAccess = sbMafCommon.lang("overlay", "errorAccess");
            alert(errorAccess);
        }catch(e){
            this.HandleError(e);
        }
    },

    ReportCompletion : function()
    {
        var alertLabel = sbMafCommon.lang("overlay", "alertLabel");
        var alertMessage = sbMafCommon.lang("overlay", "alertMessage");
        var alerts = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
        alerts.showAlertNotification("chrome://sbmaf/content/sbmaf.png", alertLabel, alertMessage, false, "", null);
    },

    processFolderRecursively : function(aRes, pathOutput, bMulti, aRecursive, bRecurring)
    {
        sbMafCommon.RDFC.Init(sbMafData.data, aRes);
        var resEnum = sbMafCommon.RDFC.GetElements();

        this.entryTitle = (sbMafData.getProperty(aRes, "title"));
        try {
            // Store multiple stored sites in one archive.
            // Prevent zip writing during recursion.
            if(bMulti && typeof(bRecurring) == 'undefined'){
                this.CreateZip(pathOutput);
            }
            while ( resEnum.hasMoreElements() )
            {
                var res = resEnum.getNext();
                if ( sbMafData.isContainer(res) ) {
                    if ( aRecursive ){
                        this.processFolderRecursively(res, pathOutput, bMulti, aRecursive, true);
                    }
                }
                else {
                    this.entryTitle = (sbMafData.getProperty(res, "title"));
                    var id = sbMafData.getProperty(res, "id");
                    this.contentDir = sbMafCommon.getContentDir(id, true);
                    if (!this.contentDir) continue;
      
                    if(!this.IsNewFileOrCanOverwrite(pathOutput, sbMafCommon.validateFileName(this.entryTitle + ".maff"))){
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
        alert(sbMafCommon.lang("overlay", "errorText", [e.name, e.message]));
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
            if(!confirm(sbMafCommon.lang("overlay", "promptOverwrite", [fileOutput.path]))){
                return false;
            }
        }
        return true;
    },
};
