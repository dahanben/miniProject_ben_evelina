from flask import Flask, request
import json
import os
import mimeToExt
import requests
import time

app = Flask(__name__)
app.debug = True

mime_to_ext = mimeToExt.MimeToExt()


@app.route("/")
def main():
    return 'Hi , Welcome to the Safe Download Manager Server'


@app.route('/upload', methods=['POST'])
def upload():
    app.logger.debug("New file has been uploaded!")
    app.logger.debug(dir(request.files['file']))
    app.logger.debug(request.files['file'].mimetype)
    app.logger.debug(mime_to_ext.get_ext(request.files['file'].mimetype))
    filename = "file." + mime_to_ext.get_ext(request.files['file'].mimetype)
    request.files['file'].save(filename)

    params = {'apikey': '4b13ee29ac4496c75b148c0508f327a9f7b8154fb30da0b7dfb116674cc79234'}
    files = {'file': (filename, open(filename, 'rb'))}
    response = requests.post('https://www.virustotal.com/vtapi/v2/file/scan', files=files, params=params)
    json_response = response.json()
    app.logger.debug(json_response)
    resource = json_response.get('resource')

    if 'verbose_msg' in json_response and json_response.get(
            'verbose_msg') == 'Scan request successfully queued, come back later for the report':

        time.sleep(16)
        headers = {
            'Accept-Encoding': "gzip, deflate"
        }
        params = {'apikey': '4b13ee29ac4496c75b148c0508f327a9f7b8154fb30da0b7dfb116674cc79234',
                  'resource': resource}
        app.logger.debug(resource)
        response = requests.get('https://www.virustotal.com/vtapi/v2/url/report',
                                params=params, headers=headers)
        json_second_response = response.json()

        while json_second_response is not None and ('verbose_msg' in json_second_response and json_second_response.get(
                'verbose_msg') == "Resource does not exist in the dataset"):
            app.logger.debug(json_second_response)
            time.sleep(16)
            headers = {
                'Accept-Encoding': "gzip, deflate"
            }
            params = {'apikey': '4b13ee29ac4496c75b148c0508f327a9f7b8154fb30da0b7dfb116674cc79234',
                      'resource': resource}
            app.logger.debug(resource)
            app.logger.debug(params)
            response = requests.get('https://www.virustotal.com/vtapi/v2/file/report',
                                    params=params, headers=headers)
            json_second_response = response.json()
        if 'positives' in json_second_response:
            a = json_second_response.get('positives')
            if int(a) > 0:
                app.logger.debug(json_second_response)
                return json.dumps({"status": False})
            else:
                return json.dumps({"status": True})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=8080)
