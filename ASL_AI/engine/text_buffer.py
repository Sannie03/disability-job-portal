class TextBuffer:
    """Manage accumulated text from recognized letters and words."""

    def __init__(self):
        self.text = ""

    def add_letter(self, letter):
        if letter == "nothing":
            return
        elif letter == "space":
            self.add_space()
        elif letter == "del":
            self.backspace()
        elif len(letter) > 1:
            # This is a word — add with spacing
            if self.text and not self.text.endswith(" "):
                self.text += " "
            self.text += letter + " "
        else:
            self.text += letter

    def add_word(self, word):
        """Add a recognized word with proper spacing."""
        if self.text and not self.text.endswith(" "):
            self.text += " "
        self.text += word + " "

    def add_space(self):
        if self.text and not self.text.endswith(" "):
            self.text += " "

    def backspace(self):
        if self.text:
            self.text = self.text[:-1]

    def clear(self):
        self.text = ""

    def get_text(self):
        return self.text
