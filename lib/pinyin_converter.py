import re

class PinyinConverter:
    def __init__(self):
        try:
            from pypinyin import pinyin, Style
            self.pinyin = pinyin
            self.Style = Style
            self.available = True
        except ImportError:
            self.available = False
            print("Warning: pypinyin library not found. Install with: pip install pypinyin")
    
    def has_chinese_characters(self, text):
        """Check if text contains Chinese characters"""
        chinese_pattern = re.compile(r'[\u4e00-\u9fff]+')
        return bool(chinese_pattern.search(text))
    
    def get_pinyin_for_text(self, text):
        """Convert Chinese characters to pinyin with tones"""
        if not self.available or not self.has_chinese_characters(text):
            return ""
        
        try:
            # Extract only Chinese characters for pinyin conversion
            chinese_chars = re.findall(r'[\u4e00-\u9fff]+', text)
            if not chinese_chars:
                return ""
            
            pinyin_parts = []
            for char_group in chinese_chars:
                pinyin_result = self.pinyin(char_group, style=self.Style.TONE)
                pinyin_group = ''.join([p[0] for p in pinyin_result])
                pinyin_parts.append(pinyin_group)
            
            return ' '.join(pinyin_parts)
        except Exception as e:
            print(f"Warning: Could not convert to pinyin: {e}")
            return ""
    
    def format_question_with_pinyin(self, question):
        """Format question text to include pinyin in parentheses"""
        if not self.available or not self.has_chinese_characters(question):
            return question
        
        pinyin_text = self.get_pinyin_for_text(question)
        if pinyin_text:
            return f"{question} ({pinyin_text})"
        return question