from deep_translator import GoogleTranslator


class Translator:
    """Translate English text to Vietnamese using Google Translate."""

    def __init__(self, source='en', target='vi'):
        self.translator = GoogleTranslator(source=source, target=target)

    def translate(self, text):
        text = text.strip()
        if not text:
            return ""
        try:
            return self.translator.translate(text)
        except Exception:
            return ""
