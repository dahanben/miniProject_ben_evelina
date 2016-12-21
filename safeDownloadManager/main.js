var urlNotif = {};
var timer;
var Globalprog=0;

safeDownload = function(url_obj) {
    console.log(url_obj)
    if ('srcUrl' in url_obj && 'linkUrl' in url_obj) {
        popupUrlOrSrc(url_obj);
        return;
    }

    if ('linkUrl' in url_obj)
        url_str = url_obj.linkUrl;
    else
        url_str = url_obj.srcUrl;

    awaitingResponse(url_str,0);
}

uploadToServer = function(url_to_upload) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        console.log(this.getResponseHeader("Content-Disposition"));
        console.log(url_to_upload.toString().match(/.*\/(.*)$/)[1]);
        if (this.readyState == 4 && this.status == 200)
            sendToCheck(this.response, url_to_upload);
        else if (this.status == 0 && this.readyState == 4) {
            alert("Error :  SDM could not resolve this link");
        }
    }

    xhr.open('GET', url_to_upload);
    xhr.responseType = 'blob';
    xhr.send();
}


popupUrlOrSrc = function(url_obj) {
    chrome.notifications.create("", {
        type: "basic",
        iconUrl: "assets/search.png",
        title: "Item or link?",
        message: "Would you like to download the item you have selected or the link attached to it?",
        contextMessage: "Choose or die while trying...",
        requireInteraction: true,
        buttons: [{
            title: "Item",
        }, {
            title: "Link",
        }]
    }, function(id) {
        urlNotif[id] = {
            "data": url_obj,
            "type": "itemOrLink"
        };
    });
}

awaitingResponse = function(url_str,prog) {
    chrome.notifications.create("1", {
        type: "progress",
        iconUrl: "assets/search.png",
        title: "Awaiting Response",
        message: "",
        progress: prog,
        contextMessage: "please wait for SDM's response",
        requireInteraction: false,
    }, function(id) {
    uploadToServer(url_str);
    //updateAwaitingResponse(null,Globalprog);
    timer = setInterval(myTimer, 1000);

    });
}
function myTimer() {
    if(Globalprog<=99)
        Globalprog++;
   finishAwaitingResponse(null,Globalprog); 
}

finishAwaitingResponse = function(url_str,prog) {
	if(prog < 100){
    	chrome.notifications.update("1", {
       	 progress: prog,
    	}, function(id) {
   	
    	});
	}else{
		chrome.notifications.update("1", {
       	 title: "File scan completed successfully",
       	 progress: prog,
       	 contextMessage: "Scan summary can be found at:",
    	}, function(id) {
   	
    	});
	}

}

buttonOrLinkCallback = function(buttonIndex, url_obj) {
    switch (buttonIndex) {

        case (0):
            url_str = url_obj.srcUrl;
            break;

        case (1):
            url_str = url_obj.linkUrl;
            break;
    }
    awaitingResponse(url_str,0);
}

downloadNotifClick = function(notificationId, buttonIndex) {
    var notifData = urlNotif[notificationId];
    clearNotifInfo(notificationId);
    switch (notifData["type"]) {
        case ("downloadAnyway"):
            chrome.downloads.download({
                "url": notifData["data"]
            });
            break;
        case ("itemOrLink"):
            buttonOrLinkCallback(buttonIndex, notifData["data"]);
            break;
    }

    chrome.notifications.clear(notificationId)

}

clearNotifInfo = function(notificationId) {
    delete urlNotif[notificationId];
}


sendToCheck = function(blob, url_to_download) {

    var fd = new FormData();
    fd.append('file', blob);
    $.ajax({
        type: 'POST',
        //url: 'https://sdm-server.herokuapp.com/upload',
            url: 'http://127.0.0.1:8080/upload',
        data: fd,
        processData: false,
        contentType: false
    }).success(function(data, status, xhr) {
        fileDownloadSuccessCallback(url_to_download, data, status);
    });

}

fileDownloadSuccessCallback = function(url_to_download, data, status) {
    var alertMsg = undefined;
    obj = JSON.parse(data);
    console.log(obj);
    Globalprog =100;
    window.clearInterval(timer);
    finishAwaitingResponse(null,Globalprog); 
    if (obj["status"])
        chrome.downloads.download({
            url: url_to_download
        });
    else {
        if ("message" in obj)
            alertMsg = obj["message"];
        else
            alertMsg = "SDM couldn't confirm the file. No message received";

        chrome.notifications.create("", {
            type: "basic",
            iconUrl: "assets/slap.png",
            title: "Blocked!",
            message: "The file you tried to download is not safe! " + alertMsg,
            contextMessage: "Choose or die while trying...",
            requireInteraction: false,
            buttons: [{
                title: "Download anyway",
            }]
        }, function(id) {
            urlNotif[id] = {
                "data": url_to_download,
                "type": "downloadAnyway"
            };

        });
    }
}

chrome.contextMenus.create({
    title: "Safe Download",
    contexts: [  "all"], // TODO: check good stuff
    onclick: safeDownload
});

chrome.notifications.onButtonClicked.addListener(downloadNotifClick);
chrome.notifications.onClosed.addListener(clearNotifInfo);