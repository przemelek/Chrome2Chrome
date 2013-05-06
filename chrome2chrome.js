//var bgPage = chrome.extension.getBackgroundPage();

function $(id) { return document.getElementById(id); }

function showCred() {
	$("credButton").style.display="none";
	$("credentials").style.display="block";
}

function saveComputerName() {
setTimeout(function() {
	try {
		localStorage.computerName=$("computerName").value;	
		var req = {};
		req.cmd="newComputer";
		chrome.extension.sendRequest(req,function(response) {});
		$("credButton").style.display="block";
		$("credentials").style.display="none";	
	} catch (e) {
		alert(e);
	}
},0);
}
function send(e) {
	var targetComputer = e.value;
	$("content").innerHTML="&nbsp;&nbsp;&nbsp;Sending....&nbsp;&nbsp;&nbsp;";
	setTimeout(function() {
		var req = {};
		req.cmd="req";
		req.computerName=targetComputer;
		chrome.extension.sendRequest(req,function(response) { $("content").innerHTML="&nbsp;&nbsp;&nbsp;Sent :-)&nbsp;&nbsp;&nbsp;"; });
	},0);
}

function init() {
	var computerName = localStorage.computerName;	
	if (computerName!==undefined) {
		$("computerName").value=computerName;
	}
	
	var zam = "Send to:<select onChange=\"send(this);\"><option value=\"\"></option>";

	var s = localStorage.listOfComputers;
	if (s) {
		var elems = s.split(",");	
		elems.sort();
		for (var i=0; i<elems.length; i++) {
			if (elems[i]!="" && elems[i]!=null) {
				zam+=("<option value='"+elems[i]+"'>"+elems[i]+"</option>");
			}
		}
	}
	zam+="</select>";
	$("sendTo").innerHTML=zam;
	
	var opened=localStorage.opened;
	var openedArray = new Array();
	if (opened) {
		openedArray = opened.split("\n");
	}
	var zaw = "";
	for (var i=0; i<openedArray.length; i++) {
	   var toDisplay = openedArray[i];
	   if (toDisplay.indexOf("://")!=-1) {
		toDisplay=toDisplay.substring(toDisplay.indexOf("://")+3);
	   }
	   if (toDisplay.length>30) toDisplay=toDisplay.substring(0,14)+"...."+toDisplay.substring(toDisplay.length-15);
	   zaw+="<font size=\"-1\"><a href=\"#\" onclick=\"chrome.tabs.create({url:'"+openedArray[i]+"'})\">"+toDisplay+"</a></font><br />";
	}
	if (zaw.length>0) {
	  zaw="Last open:<br />"+zaw+"<hr width=\"50%\" />";
	}
	$("lastOpened").innerHTML=zaw;
}

try {
	//$("buttonShowCred").onclick=function() { showCred(); };
	//$("buttonSaveComputerName").onclick=function() { saveComputerName(); };
	init();
} catch (e) {
   console.log(e);
   alert(e); 
}