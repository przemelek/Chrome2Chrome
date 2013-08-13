var auth = null;
var folderID = null;
var lastEtag = null;
var currentComputerName = "";
var markerFile = null;
var oldContent = null;
var appName="Chrome2Chrome";
var appVersion="0.7.0";
var tryNo = 0;
var clientID = "<insertYourSecret>.apps.googleusercontent.com";

var oauth = ChromeExOAuth.initBackgroundPage({
  'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
  'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
  'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
  'consumer_key': 'anonymous',
  'consumer_secret': 'anonymous',
  'scope': 'https://docs.google.com/feeds/',
  'app_name': 'Chrome2Chrome'
});

try {
    if (localStorage.computerName==null) {
		chrome.tabs.create({url:"options.html"});
	} else {
		var auth = oauth.getAuthorizationHeader();
	}
} catch (e) {
    console.log(e);
	oauth.authorize(function() {
		console.log("toster");
	});
}

function Document(name,id,contentLink,editLink,etag,selfLink) {
	this.name = name;
	this.id = id;
	this.contentLink = contentLink;
	this.editLink = editLink;
	this.etag = etag;
	this.selfLink = selfLink;
}

function getCallbackFunc(auth, fileToDelete) {
	return function(tab) {
		deleteFile(auth,fileToDelete);
	}
}

function loop() {
	tryNo++;
    var computerNameObj = localStorage.computerName;
	var computerName = null;
	if (computerNameObj!=null) {
		computerName = computerNameObj.toUpperCase();	
	}
	if (computerName!==null) {
		try {
			if (auth===null) {
				auth = oauth.getAuthorizationHeader();
				if (auth===null) {
					setTimeout(loop,2500);
					return;
				}
			}
			if (folderID===null || (tryNo%24==0)) {				           
				folderID = getChrome2ChromeFolderID(auth);
				markerFile = null;
			}
			if (markerFile===null) {
				var map = {};
				var listOfComputerFiles = new Array();
				var list = getListOfDocumentsInFolder(auth,folderID,lastEtag);
				var listOfComputers = "";
				var meOnTheList = false;
				for (var i=0; i<list.length; i++) {
					if (list[i].name.toUpperCase().indexOf("_"+computerName+"_")===0) {
						var content = getContent(auth,list[i].contentLink);
						chrome.tabs.create({url:content}, getCallbackFunc(auth,list[i].contentLink.split("=")[1]));
						var opened = localStorage.opened;
						var elems = new Array();
						if (opened) {
							elems = opened.split("\n");
						}
						while (elems.length>9) elems.shift();
						elems.push(content);
						localStorage.opened=elems.join("\n");
						// deleteFile(auth,list[i].contentLink.split("=")[1]);
					} else if (list[i].name==="markerFile") {
						if (markerFile===null) {
							markerFile = new Document("markerFile",list[i].id,list[i].contentLink,list[i].editLink,list[i].etag,list[i].selfLink);
						} else {
							deleteFile(auth,list[i].contentLink.split("=")[1]);
						}
					} else if (list[i].name.indexOf("__")===0) {							
							var remoteComputerName = list[i].name.split("__")[1];
							if (!map[remoteComputerName]) {
								map[remoteComputerName]=true;
								listOfComputerFiles.push(remoteComputerName);
							} else {
								deleteFile(auth,list[i].contentLink.split("=")[1]);
							}
							if (remoteComputerName.toUpperCase()==computerName.toUpperCase()) {
								meOnTheList = true;
							}
					}
				}
				for (var i=0; i<listOfComputerFiles.length; i++) {
					listOfComputers+=listOfComputerFiles[i]+",";
				}
				if (!meOnTheList) {
					upload(auth,folderID,"__"+localStorage.computerName+"__",localStorage.computerName);
					listOfComputers+=localStorage.computerName;
				}
				if (listOfComputers!=="") {
					localStorage.listOfComputers=listOfComputers;
				}
			}	else {
				var content = getContent(auth,markerFile.contentLink,markerFile.etag);
				if (content!==oldContent) {
					oldContent = content;
					var list = getListOfDocumentsInFolder(auth,folderID,lastEtag);
					var listOfComputers = "";
					for (var i=0; i<list.length; i++) {
						if (list[i].name.toUpperCase().indexOf("_"+computerName+"_")===0) {
							var content = getContent(auth,list[i].contentLink);
							chrome.tabs.create({url:content}, getCallbackFunc(auth,list[i].contentLink.split("=")[1]));
							var opened = localStorage.opened;
							var elems = new Array();
							if (opened) {
								elems = opened.split("\n");
							}
							while (elems.length>9) elems.shift();
							elems.push(content);
							localStorage.opened=elems.join("\n");							
							//chrome.tabs.create({url:content});
							//deleteFile(auth,list[i].contentLink.split("=")[1]);
						} else if (list[i].name.indexOf("__")===0) {
							var remoteComputerName = list[i].name.split("__")[1];
							listOfComputers+=remoteComputerName+",";
						}
					}
					if (listOfComputers!=="") {
						localStorage.listOfComputers=listOfComputers;
					}
				}			
			}
		} catch (e) {
			folderID = null;
			// empty
		}
		if (folderID!==null && markerFile===null) {
			upload(auth,folderID,"markerFile","0");
		}
	}
	setTimeout(loop,2500);
}

chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {	
	//console.log(request.cmd);
	if ("req"===request.cmd) {
		var computerName = request.computerName.toLowerCase();

		chrome.tabs.getSelected(null, function(tab) {			
			if (auth===null) {
				auth = oauth.getAuthorizationHeader();
			}
			if (folderID===null) {
				folderID = getChrome2ChromeFolderID(auth);
			}
			var fileName = ("_"+computerName+"_"+Math.random()%1000);
			//alert(fileName);
			upload(auth,folderID,fileName,tab.url);
			if (folderID!==null && markerFile===null) {
				upload(auth,folderID,"markerFile","0");
			}
			if (markerFile!==null) {
				var content = getContent(auth,markerFile.contentLink);
				var number = new Number(content);
				if (!isNaN(number)) {
					number++;
				} else {
					number=0;
				}
				update(auth,markerFile.editLink,markerFile.name,""+number);
			}
			sendResponse({resp:"OK"});
		});
	} else if ("newComputer"===request.cmd) {
		oauth.authorize(function() {
			//	console.log("toster");
		});
		//console.log("toster2");
		if (auth===null) {
			auth = oauth.getAuthorizationHeader();
		}
		if (folderID===null) {
			folderID = getChrome2ChromeFolderID(auth);
		}
		var fileName = "__"+localStorage.computerName+"__";
		var s = localStorage.listOfComputers;
		var newComputer = true;
		if (s && s!=="") {
			var elems = s.split(",");
			for (var i=0; i<elems.length; i++) {
				newComputer&=elems[i]!==localStorage.computerName;
			}
		}
		if (newComputer) {
			upload(auth,folderID,fileName,localStorage.computerName);
		}
		if (folderID!==null && markerFile===null) {
			upload(auth,folderID,"markerFile","0");
		}
		if (markerFile!==null) {
			var content = getContent(auth,markerFile.contentLink);
			var number = new Number(content);
			if (!isNaN(number)) {
				number++;
			} else {
				number=0;
			}
			update(auth,markerFile.editLink,markerFile.name,""+number);
		}		
	}
  }
  )
  

      function fetch(url,method,headers,body,callback,async,returnAsXML) {
	  	    
        var xhr = new XMLHttpRequest();
		if (async) {
			xhr.onreadystatechange = function() {
			  if (xhr.readyState === 4) {
				if (xhr.status === 200) {
				  callback(xhr.responseText);
				} else {
				  callback(null);
				}
			  }
			}
		}
		xhr.open(method, url, async);
		if (headers!==null) {
			for (var i=0; i<headers.length; i++) {
				xhr.setRequestHeader(headers[i].name,headers[i].value);
			}
		}
		if (body!==null) {
			xhr.send(body);
		} else {
			xhr.send();
		}
		if (!async) {
			if (returnAsXML) {
			    //alert(xhr.responseText);
				return xhr.responseXML;
			} else {
				return xhr.responseText;
			}
		}
      };


	function getContent(auth,exportURL,etag) {
	// &exportFormat=pdf&format=pdf
		var req = {};
		req.method="GET";
		req.url=exportURL+"&exportFormat=txt&format=txt";
		var headers = [];
		headers.push({"name":"Content-Type","value":"text/plain"});
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, null)});
		headers.push({"name":"GData-Version","value":"3.0"});
		if (etag!==null) {
			headers.push({"name":"If-None-Match","value":etag});
		}
		req.headers=headers;
		var retVal = fetch(req.url, req.method, req.headers, null, null,false,false);
		return retVal;
	}
	
	function deleteFile(auth,docID) {
		var req = {};
		req.method="DELETE";
		req.url="https://docs.google.com/feeds/default/private/full/document%3A"+docID;
		var headers = [];
		var params = {"delete":"true"};
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, params)});
		headers.push({"name":"GData-Version","value":"3.0"});
		headers.push({"name":"If-Match","value":"*"});
		req.headers=headers;
		var retVal = fetch(req.url+"?delete=true", req.method, req.headers, null, null,false,false);		
		return retVal;	
	}

	function deleteFolder(auth,folderID) {
		var req = {};
		req.method="DELETE";
		req.url="https://docs.google.com/feeds/default/private/full/"+folderID.substring(folderID.indexOf("/id/")+4);
		var headers = [];
		var params = {"delete":"true"};
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, params)});
		headers.push({"name":"GData-Version","value":"3.0"});
		headers.push({"name":"If-Match","value":"*"});
		req.headers=headers;
		var retVal = fetch(req.url+"?delete=true", req.method, req.headers, null, null,false,false);		
		return retVal;	
	}
	  
	function update(auth, editLink, name, body) {
		return updateOrUpload(auth,"PUT", "PUT", editLink, name,body)
	}


    function updateOrUpload(auth,firstCmd, secondCmd, url, name,body) {
		var req = {};
		req.method=firstCmd;
        req.url=url;
		req.body=body;
		var headers = [];
		headers.push({"name":"Content-Length","value":0});
		headers.push({"name":"X-Upload-Content-Type","value":"text/plain"});
        headers.push({"name":"Content-Type","value":"text/plain"});
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, null)});
		headers.push({"name":"Slug","value":name});
		headers.push({"name":"GData-Version","value":"3.0"});
        headers.push({"name":"X-Upload-Content-Length","value":""+body.length});
		if (firstCmd=="PUT") {
			headers.push({"name":"If-Match","value":"*"});
		}
		req.headers=headers;

        var url = req.url;
        var method = req.method;
        var headers = req.headers;
        var async = false;
        var xhr = new XMLHttpRequest();
		xhr.open(method, url, async);
		xhr.contentLength=0;
		if (headers!==null) {
			for (var i=0; i<headers.length; i++) {
				xhr.setRequestHeader(headers[i].name,headers[i].value);
			}
		}        
		xhr.send();
        var location = xhr.getResponseHeader("Location");
        headers = [];
        var contentLength = body.length;
        headers.push({"name":"Content-Length","value":""+body.length});
        headers.push({"name":"Content-Range","value":"bytes 0-" + (contentLength - 1) + "/" + contentLength});
		headers.push({"name":"GData-Version","value":"3.0"});
        req = {};
    	req.method=secondCmd;
        req.url = location;
        req.headers = headers;
        req.body = body;
        var retXML = fetch(req.url, req.method, req.headers, req.body, null,false,true);
		return retXML;
	}	   
  
	function upload(auth, folder, name, body) {
		folder = folder.split("%3A")[1];
		folder = "https://docs.google.com/feeds/upload/create-session/default/private/full/folder%3A"+folder+"/contents"
		return updateOrUpload(auth,"POST", "PUT", folder, name,body)
	}
	
	function createChrome2ChromeFolder(auth) {
		var title = "Chrome2Chrome";
		return createFolder(auth,null,title);
	}

	function createFolder(auth,folder,title) {
		var entry="<?xml version='1.0' encoding='UTF-8'?>\n";
		entry+="<entry xmlns=\"http://www.w3.org/2005/Atom\">\n";
		entry+="<category scheme=\"http://schemas.google.com/g/2005#kind\"\n";
		entry+="term=\"http://schemas.google.com/docs/2007#folder\"/>\n";
		entry+="<title>"+title+"</title>\n";
		entry+="</entry>\n";
		var req = {};
		req.method="POST";
		req.url="https://docs.google.com/feeds/default/private/full";
		if (folder!==null) {
			var elems = folder.split("%");
			req.url+="/folder%"+elems[1]+"/contents";
		}		
		req.body=entry;
		var headers = [];
		headers.push({"name":"Content-Type","value":"application/atom+xml"});
		//headers.push({"name":"Authorization","value":("GoogleLogin auth="+auth)});
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, null)});
		headers.push({"name":"GData-Version","value":"3.0"});
		req.headers=headers;
		var retXML = fetch(req.url, req.method, req.headers, req.body, null,false,true);
		//return retXML;
		var l = retXML.documentElement.getElementsByTagName("title");
		var id = l[0].parentNode.getElementsByTagName("id")[0].textContent;
		return id;
	}

	function getChrome2ChromeFolderID(auth) {
		var r = getListOfFolders(auth);
		var l = r.getElementsByTagName("title");
		var id = null;
		for (var i=0; i<l.length; i++) {
			if (l[i].textContent==="Chrome2Chrome") {
				if (id!=null) {
					// Here we should handle existence of more than 1 Chrome2Chrome
					var wrongId = l[i].parentNode.getElementsByTagName("id")[0].textContent;
					// var list = getListOfDocumentsInFolder(auth,wrongId,lastEtag);
					var list = getListOfDocumentsInFolder(auth,wrongId,null);
					for (var i=0; i<list.length; i++) {
						var content = getContent(auth,list[i].contentLink);
						//chrome.tabs.create({url:content});
						deleteFile(auth,list[i].contentLink.split("=")[1]);					
						upload(auth,id,list[i].name,content);
					}
					deleteFolder(auth,wrongId);
				} else {					
					id = l[i].parentNode.getElementsByTagName("id")[0].textContent;
				}
			}
		}
		if (id===null) {
			id = createFolder(auth,null,"Chrome2Chrome");
		}
		return id;
	}
	
	function getListOfFolders(auth) {
		var req = {};
		req.method="GET";		
		req.url="https://docs.google.com/feeds/default/private/full/-/folder";
/*		if (folder!==null) {
			var elems = folder.split("%");
			req.url+="/folder%"+elems[1]+"/contents";
		}*/
		//req.body=body;
		var headers = [];
		headers.push({"name":"Content-Type","value":"text/plain"});
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, null)});
		headers.push({"name":"GData-Version","value":"3.0"});
		req.headers=headers;
		var retXML = fetch(req.url, req.method, req.headers, null, null,false,true);
		return retXML;

	}
	
	function getListOfDocumentsInFolder(auth,folder,etag) {
		var req = {};
		req.method="GET";                 
		req.url="https://docs.google.com/feeds/default/private/full";
		if (folder!==null) {
			var elems = folder.split("%");
			//req.url+="/folder%"+elems[1]+"/contents";
			req.url+="/folder%"+elems[1]+"/contents";
		} else {
			req.url+="/folder%3Aroot/contents";
		}
		var headers = [];
		headers.push({"name":"Content-Type","value":"text/plain"});
		headers.push({"name":"Authorization","value":oauth.getAuthorizationHeader(req.url, req.method, null)});
		headers.push({"name":"GData-Version","value":"3.0"});
		if (etag!==null) {
			// it looks for me that this isn't working
			headers.push({"name":"If-None-Match","value":etag});
		}
		req.headers=headers;
		var retXML = fetch(req.url, req.method, req.headers, null, null,false,true);
		var l = retXML.documentElement.getElementsByTagName("entry");
		lastEtag=retXML.getElementsByTagName("feed")[0].getAttribute("gd:etag");
		var documents = [];
		for (var i=0; i<l.length; i++) {
			var node = l[i];
			var title = node.getElementsByTagName("title")[0].textContent;
			var id = node.getElementsByTagName("id")[0].textContent;
			var content = node.getElementsByTagName("content")[0].getAttribute("src");
			var links = node.getElementsByTagName("link");
			var editLink = null;
			for (var j=0; j<links.length; j++) {
				var link = links[j];
				if (link.getAttribute("rel")==="http://schemas.google.com/g/2005#resumable-edit-media") {
					editLink = link.getAttribute("href");					
				} else if (link.getAttribute("rel")==="self") {
					selfLink = link.getAttribute("href");
				}
			}
			var etag = node.getAttribute("gd:etag");
			documents.push(new Document(title,id,content,editLink,etag,selfLink));
		}
		return documents;
	}
	
// clean old credentials
localStorage.removeItem("login");
localStorage.removeItem("pass");
	
loop();