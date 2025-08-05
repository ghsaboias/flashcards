import subprocess
import re
from colorama import Fore, Style, init

# Initialize colorama for cross-platform color support
init()

class AudioHandler:
    RED = Fore.RED
    GREEN = Fore.GREEN
    RESET = Style.RESET_ALL

    @staticmethod
    def play_audio(text):
        """Play audio using macOS say command with Chinese voice"""
        try:
            subprocess.run([
                "say", "-v", "Eddy (Chinese (China mainland))", text
            ], check=False, capture_output=True)
        except (subprocess.SubprocessError, FileNotFoundError):
            # Silently fail if say command is not available
            pass

    @staticmethod
    def is_chinese_set(set_name):
        """Check if the set name indicates Chinese language content"""
        return "Chinese" in set_name or "English" in set_name

    @staticmethod
    def play_success_sound():
        """Play a pleasant blip sound for correct answers"""
        try:
            subprocess.Popen([
                "afplay", "/System/Library/Sounds/Glass.aiff"
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

    @staticmethod
    def get_chinese_text(question, answer):
        """Extract Chinese text from question or answer"""
        # Check if question contains Chinese characters (Unicode range for CJK)
        if re.search(r'[\u4e00-\u9fff]', question):
            return question
        else:
            return answer