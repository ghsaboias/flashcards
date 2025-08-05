module SessionTracker
  include SetManager
  
  def get_all_session_results
    return [] unless File.exist?("session_log.txt")
    
    lines = File.readlines("session_log.txt")
    all_sessions = []
    current_session = nil
    
    lines.each do |line|
      if line.start_with?(">") && line.include?("#{display_set_name($current_set)}")
        current_session = { questions: [], score: nil }
      elsif current_session && line.start_with?("<")
        if match = line.match(/(\d+)\/(\d+)$/)
          current_session[:score] = "#{match[1]}/#{match[2]}"
          all_sessions << current_session
        end
        current_session = nil
      elsif current_session && line.start_with?("✓")
        current_session[:questions] << "✓"
      elsif current_session && line.start_with?("✗")
        current_session[:questions] << "✗"
      end
    end
    
    all_sessions
  end

  def get_last_session_results
    all_sessions = get_all_session_results
    return nil if all_sessions.empty?
    all_sessions.last
  end
end