# VirusTotal api implementation

import requests


class Virustotal():

    def __init__(self):
        self.host = "www.virustotal.com"
        self.url = "https://www.virustotal.com/vtapi/v2/"
        self.apikey = "4b13ee29ac4496c75b148c0508f327a9f7b8154fb30da0b7dfb116674cc79234"

    def get_report(self, path):
        # get report associated with this resource
        url = self.url + 'file/report'
        params = {"resource": path, "apikey": self.apikey}
        r = requests.post(url, data=params)
        json_response = r.json()
        result = parse_resp(json_response)
        return result

    def submit_for_scan(self, resource):
        # Submit potential malicious file to virustotal for analyzing
        url = self.url + 'file/scan'
        f = open(resource, 'rb')
        params = {"apikey": self.apikey}
        r = requests.post(url, data=params, files={'file': f})
        json_response = r.json()
        result = parse_resp(json_response)
        return result


def parse_resp(json_response):
    buf = {}
    for item in json_response:
        buf[item] = json_response[item]

    return buf
