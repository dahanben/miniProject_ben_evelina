var urlNotif = {};

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

    uploadToServer(url_str);
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


buttonOrLinkCallback = function(buttonIndex, url_obj) {
    switch (buttonIndex) {

        case (0):
            url_str = url_obj.srcUrl;
            break;

        case (1):
            url_str = url_obj.linkUrl;
            break;
    }
    uploadToServer(url_str);
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
    contexts: ["link", "editable", "image", "video", "audio", "all"], // TODO: check good stuff
    onclick: safeDownload
});

chrome.notifications.onButtonClicked.addListener(downloadNotifClick);
chrome.notifications.onClosed.addListener(clearNotifInfo);