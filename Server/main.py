from flask import Flask, request
import json
import os
import mimeToExt


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
    request.files['file'].save("file." + mime_to_ext.get_ext(request.files['file'].mimetype))
    return json.dumps({"status": False})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
