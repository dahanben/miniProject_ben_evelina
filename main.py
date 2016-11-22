from flask import Flask, request
import json


app = Flask(__name__)
app.debug = True

@app.route('/')
def main():
    return 'Hi , Welcome to the Safe Download Manager Server'

@app.route('/upload', methods=['POST'])
def upload():
    app.logger.debug(request.files['file'].filename) 
    app.logger.debug(request.files['file'])
    request.files['file'].save("x.pdf")
    return json.dumps({"status":True})

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=8080)