# authors Ben , Evelina
# This is the Safe Download Manager server working accordingly with the SDM chrome extension
# This server will get files to '/upload' directory than it will scan them om virus total and
# will send a status and a scan report, if exist to the SDM extension.
#

from flask import Flask, request
import json
import os
import mimeToExt
import virustotal

app = Flask(__name__)
app.debug = True

mime_to_ext = mimeToExt.MimeToExt()
V_scanner = virustotal.Virustotal()             # our virusTotal api implementation
pending = False                                 # indicates if a file was submitted for scan
resource = None                                 # to get the report
File_under_inspection = str                     # file path for the file currently under inspection


# main page of the server
@app.route("/")
def main():
    return 'Hi , Welcome to the Safe Download Manager Server'


# the upload directory on the server
# all the files uploded from the download manager are directed to /upload
@app.route('/upload', methods=['POST', 'GET'])
def upload():
    if request.method == 'POST':
        app.logger.debug("New file has been uploaded!")
        app.logger.debug(dir(request.files['file']))
        app.logger.debug(request.files['file'].mimetype)
        app.logger.debug(mime_to_ext.get_ext(request.files['file'].mimetype))
        filename = "file." + mime_to_ext.get_ext(request.files['file'].mimetype)
        request.files['file'].save(filename)
        global File_under_inspection
        File_under_inspection = filename

        # after saving the file we use the VirusTotal api to upload it for scan
        # filename - is the path to the file that we want to scan
        # resource - in the json_response we get from VirusTotal there is a unique resource number in order to get
        #            the file scan
        res = V_scanner.submit_for_scan(filename)
        if res is not None and 'verbose_msg' in res and res.get(
             'verbose_msg') == 'Scan request successfully queued, come back later for the report':
            global pending
            pending = True
            global resource
            resource = res.get('resource')
            return json.dumps({"status": True})
        else:
            return json.dumps({"status": False})

    # after the user got a response from the POST method he would than use the GET method to get the scan response
    #
    else:
        # pending is meant to indicate if there is a file the was submitted for scan and a response hasn't been given
        if not pending:
            return json.dumps({"status": False, "Message": "no files are in inspection"})
        else:
            res = V_scanner.get_report(resource)

            if res is not None and 'verbose_msg' in res and res.get(
                    'verbose_msg') == 'Resource does not exist in the dataset':
                return json.dumps({"status": True, "Message": 'still awaiting response'})

            # after getting the response from VirusTotal we check if any of the AV returned detected
            # we want to block the file even if one AV suggested so
            if res is not None and 'positives' in res:
                pending = False
                try:
                    os.remove(File_under_inspection)            # remove the file from the server
                except Exception as error:
                    app.logger.error("Error removing or closing downloaded file handle", error)
                a = res.get('positives')
                if int(a) > 0:
                    app.logger.debug(res)
                    return json.dumps({"status": False, "Message": res.get('permalink')})
                else:
                    return json.dumps({"status": True,  "Message": res.get('permalink')})
            else:
                return json.dumps({"status": False, "Message": 'something went wrong..'})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=8080)
