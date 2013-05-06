function $(id) { return document.getElementById(id); }
var computerName = localStorage.computerName;
if (computerName!=null) $("computerName").value=computerName;

function saveComputerName() {
if ($("computerName").value!="") {
	setTimeout(function() {
		try {
			localStorage.computerName=$("computerName").value;	
			var req = {};
			req.cmd="newComputer";
			chrome.extension.sendRequest(req,function(response) {
			});
			$("content").innerHTML="From now your computer should be visible in other Chrome2Chrome as <b>"+localStorage.computerName+"</b>";
		} catch (e) {
			alert(e);
		}
	},0);
}
}
$("saveComputerName").onclick=saveComputerName;
$("computerName").focus();