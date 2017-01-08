/*
* authors - Ben , Evelina
* this is a Chrome extension used to safe Download files.
* this application will get the files from the requested page thret an Xml http request
* and will eather download or block to file according to the Servers Response
*
*/

var urlNotif = {};          // db to pop the correct notification
var p=0;                    // represents the progress bar 
var timer;                  // to set the progress bar advancment
var ScanOutput;             // the url of the file scan report
var url_to_download;		// the current url

/*
* this function is trigered from the click in the extension
* url_obj - is the url of the requested file
* calls popupUrlOrSrc if it has both url_obj and url_src
* transfers the url to the uploadToServer function
*/
safeDownload = function(url_obj) {
    p=0;
    console.log(url_obj)
    if ('srcUrl' in url_obj && 'linkUrl' in url_obj) {
        popupUrlOrSrc(url_obj);
        return;
    }

    if ('linkUrl' in url_obj)
        url_str = url_obj.linkUrl;
    else
        url_str = url_obj.srcUrl;

    url_to_download = url_str;
    uploadToServer();
}

/*
* this function sends XMLHttpRequest to get the file from the url
* url_to_download - is the correct url of the requested file
* calls sendToCheck with the XMLHttpRequest response
*/
uploadToServer = function() {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
        	if (xhr.readyState == 4 && xhr.status == 200)
            	sendToCheck(xhr.response);
        	else if (xhr.status == 0 && xhr.readyState == 4) {
            	alert("Error :  SDM could not resolve this link");
        	}
        	else if(xhr.readyState == 0){
            	alert("Server is Unavailable");
        	}
    }
    xhr.open('GET', url_to_download);	
    xhr.responseType = 'blob';
    xhr.send();
}


/*
* this is a popup used to get the user's choice wether he wants to downliad the url_obj or the src
* 
*/
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

/*
* the progerss bar is depending on the var p which indicates when the server scan is done
* it will be update by a timer
* 
*/
progress_bar = function() {
    chrome.notifications.create("progress_bar", {
          type: "progress",
          title: "Please wait",
          message: "scanning",
          iconUrl: "assets/search.png",
          progress: p,
          requireInteraction: false,
          isClickable: true
    });
    timer = setInterval(myTimer, 1000);
}

function myTimer() {               // timer to set the progress bar
    if(p<99)
        p++;
   finishAwaitingResponse(null,p); 
}

finishAwaitingResponse = function(url_str,prog) {   // update the progress bar
    if(prog < 100){
        chrome.notifications.update("progress_bar", {
         progress: prog,
        }, function(id) {
    
        });
    }else{
        chrome.notifications.update("progress_bar", {
         title: "File scan completed successfully",
         progress: prog,
         message: "Scan summary can be found at:",
         contextMessage: "",
         buttons: [{
            title: "Go to scan",
         }],
        }, function(id) {
             urlNotif["progress_bar"] = {
            "data": url_str,
            "type": "Go to scan"
        };
        });
    }

}

/*
* this update will notify if there is a problem on the server side
* 
*/
failureUpdate = function(){
    chrome.notifications.update("progress_bar", {
         title: "File scan could not be completed",
         progress: 0,
         message: "please try again later",
         contextMessage: "",
        }, function(id) {
    
        });
}


// just to set indication for each button meaning 
buttonOrLinkCallback = function(buttonIndex, url_obj) {
    switch (buttonIndex) {

        case (0):
            url_str = url_obj.srcUrl;
            break;

        case (1):
            url_str = url_obj.linkUrl;
            break;
    }
    url_to_download = url_str;
    uploadToServer();
}

/*
* Here is where we differ between the callbacks of the button clicks
* notificationId - is the unique if for each notification
* buttonIndex - for popups with more than one button
*/
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
        case ("Go to scan"):
            chrome.windows.create({ url: notifData["data"] });
            break;
    }

    chrome.notifications.clear(notificationId)

}

clearNotifInfo = function(notificationId) {
    delete urlNotif[notificationId];
}

/*
* this function produce a ajax request to post to the Server 
* blob - is the object to be uploaded
* url_to_download - is the url that the file will be downloaded from in case of server authorization
* cathes all of the server side connection errors
* call filePostSuccessCallback with the return status
*/
sendToCheck = function(blob) {
    progress_bar();
    var fd = new FormData();
    fd.append('file', blob);
    $.ajax({
        type: 'POST',
        url: 'https://sdm-server.herokuapp.com/upload',
        //url: 'http://127.0.0.1:8080/upload',
        data: fd,
        processData: false,
        contentType: false,
        statusCode: {
            200: function() {
                console.log('OK');
            },
            201: function() {
                console.log('OK');
            },
            400: function() {
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            404: function() {
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            500: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            502: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },            
            503: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            504: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
        }
    }).success(function(data, status, xhr) {
        filePostSuccessCallback(data, status);
    });
}

/*
* this function gets the scan result from the server in case the POST request was sucessfull
*		it will be activated every 15 seconds due to server limitations
* cathes all of the server side connection errors
* call fileGetSuccessCallback with the return status
*/
get = function(){
    $.ajax({
        type: 'GET',
        url: 'https://sdm-server.herokuapp.com/upload',
        //url: 'http://127.0.0.1:8080/upload',
        processData: false,
        contentType: false,
        statusCode: {
            200: function() {
                console.log('OK');
            },
            201: function() {
                console.log('OK');
            },
            400: function() {
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            404: function() {
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            500: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            502: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },            
            503: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
            504: function(){
                p=0;
                failureUpdate();
                window.clearInterval(timer);
            },
        }
    }).success(function(data,status) {
        fileGetSuccessCallback(data,status);
    });

}

/*
* this function will finish the action according to the server response assuming no connection problems had accured
* url_to_download - is the correct url of the requested file
* data - the data sent from the server
* status - True if file scan was clean, False otherwise
*/
fileGetSuccessCallback = function(data,status){
    if(data != null){
    obj = JSON.parse(data);
    console.log(obj);
    if(obj["Message"] == "no files are in inspection" || obj["Message"]=="something went wrong.."){
        p=0;
        failureUpdate();
        window.clearInterval(timer);
    }
    else if(obj["status"]){

        if(obj["message"]=="still awaiting response")
             setTimeout(get,15000);
        else{
            ScanOutput = obj["Message"];
            p=100;
            finishAwaitingResponse(ScanOutput,p);
            window.clearInterval(timer);
            chrome.downloads.download({
            url: url_to_download
            });
        }
    }
    else{
        ScanOutput = obj["Message"];
        p=100;
        finishAwaitingResponse(ScanOutput,p);
        window.clearInterval(timer);
        chrome.notifications.create("", {
            type: "basic",
            iconUrl: "assets/slap.png",
            title: "Blocked!",
            message: "The file you tried to download is not safe! ",
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
    ScanOutput = null;
    }
}

/*
* this function will get the status of the POST request drom the server
* url_to_download - is the correct url of the requested file
* data - the data sent from the server
* status - True if file POST was sucessfull, False otherwise
* call get() in case of success
*/
filePostSuccessCallback = function( data,status) {
    obj = JSON.parse(data);
    console.log(obj);
    if (obj["status"])
        setTimeout(get,15000);
    else {
        p=0;
        failureUpdate();
        window.clearInterval(timer);
    }
}


// to display the safe download option in the chrome menu
chrome.contextMenus.create({
    title: "Safe Download",
    contexts: [  "all"], 
    onclick: safeDownload
});

chrome.notifications.onButtonClicked.addListener(downloadNotifClick);
chrome.notifications.onClosed.addListener(clearNotifInfo);