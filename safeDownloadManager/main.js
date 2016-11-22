var bkg = chrome.extension.getBackgroundPage();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

afterDownload = function(downloadItem){
	console.log(downloadItem);
	console.log(chrome.downloads.open(downloadItemId));
}

 function downloadedItemCreated(downloadedItem)
{
	if(downloadedItem.state.current == "in_progress")
		return;
	
	afterDownload(downloadedItem)

}

//chrome.downloads.onChanged.addListener(downloadedItemCreated)

fileDownloadSuccessCallback = function(data, status)
{

}

sendToCheck = function(blob)
{

var fd = new FormData();
console.log(blob.filename);
//console.log(blob)
fd.append('file', blob);
fd.append("type", blob.type)
$.ajax({
    type: 'POST',
    url: 'http://127.0.0.1:8080/upload',
    data: fd,
    processData: false,
    contentType: false
}).done(function(data) {
       console.log(data);
});

}

safeDownload = function(url_obj){
	url_str = url_obj.linkUrl;
	//$.get(url_str, function(data, status, xhr){
		//console.log(xhr);
	 	//console.log(url_str.substring(url_str.lastIndexOf("/") + 1).split("?")[0]);
    //});
	//console.log(url_obj)
	//chrome.downloads.download({url:url_str,filename:"unsafe/tmp/x.x"})
    //console.log(url_str);

    var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
        sendToCheck(this.response);
    }
}
xhr.open('GET', url_str);
xhr.responseType = 'blob';
xhr.send();  


  	

};

chrome.contextMenus.create({
  title: "Safe Download",
  contexts:["link"],
  onclick: safeDownload
});