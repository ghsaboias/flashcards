module AudioHandler
  RED = "\033[31m"
  GREEN = "\033[32m"
  RESET = "\033[0m"

  def play_audio(text)
    system("say -v 'Eddy (Chinese (China mainland))' '#{text}' 2>/dev/null")
  end
  
  def is_chinese_set?(set_name)
    set_name.include?("Chinese") || set_name.include?("English")
  end
  
  def get_chinese_text(question, answer)
    question.match?(/[\u4e00-\u9fff]/) ? question : answer
  end
end