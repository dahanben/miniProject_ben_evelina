import json


class MimeToExt:
    MIME_JSON_FILENAME = "mimeToExt.json"
    def __init__(self):
        with open(MimeToExt.MIME_JSON_FILENAME) as f:
            self.__conversion_dict = json.load(f)

    def get_ext(self, mime_type):
        info = self.__conversion_dict.get(mime_type, {})
        if ("extensions" in info):
            return info.get("extensions", [""])[0]
        return ""
