require "csv"
require_relative "lib/audio_handler"
require_relative "lib/set_manager"
require_relative "lib/session_tracker"
require_relative "lib/review_engine"

include AudioHandler
include SetManager
include SessionTracker
include ReviewEngine

$current_set = "ruby"

def bring_terminal_to_front
  if system("which osascript > /dev/null 2>&1")
    system("osascript -e 'tell application \"Terminal\" to activate'")
  end
end

def start_collaborative_mode(session_type, set_name)
  if system("which osascript > /dev/null 2>&1")
    system("osascript -e 'tell application \"System Events\" to keystroke \"d\" using {command down}'")
    sleep(1)
    system("osascript -e 'tell application \"System Events\" to keystroke \"claude\"'")
    sleep(0.5)
    system("osascript -e 'tell application \"System Events\" to keystroke return'")
    sleep(2)
    
    # Send initial message to Claude with session context
    message = "I'm starting a #{session_type} session with #{set_name}. Please monitor my learning progress and provide insights only when you notice important patterns or have specific tips. Just observe for now."
    system("osascript -e 'tell application \"System Events\" to keystroke \"#{message}\"'")
    sleep(0.3)
    system("osascript -e 'tell application \"System Events\" to keystroke return'")
    
    # Switch back to the original terminal pane using Cmd+[
    sleep(0.5)
    system("osascript -e 'tell application \"System Events\" to keystroke \"[\" using {command down}'")
  end
end

def send_session_summary_to_claude(session_type, set_name, score, duration)
  return unless system("which osascript > /dev/null 2>&1")
  
  # Get the most recent session from logs
  recent_session = get_last_session_results
  
  summary = "Session completed: #{session_type} - #{set_name}. Score: #{score}, Duration: #{duration}s."
  
  if recent_session && !recent_session[:questions].empty?
    correct_count = recent_session[:questions].count("✓")
    incorrect_count = recent_session[:questions].count("✗")
    summary += " Correct: #{correct_count}, Incorrect: #{incorrect_count}."
    
    # Add pattern info if there were mistakes
    if incorrect_count > 0
      summary += " Check latest session_log.txt entries for mistake patterns."
    end
  end
  
  summary += " Only respond if you have specific learning tips or notice important patterns."
  
  system("osascript -e 'tell application \"System Events\" to keystroke \"#{summary}\"'")
  sleep(0.3)
  system("osascript -e 'tell application \"System Events\" to keystroke return'")
  
  # Switch back to the flashcard script pane using Cmd+Ctrl+Left Arrow
  sleep(0.5)
  system("osascript -e 'tell application \"System Events\" to keystroke (ASCII character 28) using {command down, control down}'")
end

loop do
  puts "
Current set: #{display_set_name($current_set)}
What would you like to do?"
  puts "1. Practice Set"
  puts "2. Practice Category"
  puts "3. Practice Difficult Cards"
  puts "4. View Scores"
  puts "5. Delete Set"
  puts "6. Exit"
  print "Enter your choice: "
  choice = gets.chomp

  case choice
  when "1"
    # Practice Set in Collaborative Mode
    select_card_set
    
    filename = get_csv_filename($current_set)
    if !File.exist?(filename)
      puts "No cards found for #{display_set_name($current_set)} set."
      next
    end
    
    # Start collaborative mode after set selection
    start_collaborative_mode("Practice Set", display_set_name($current_set))
    
    flashcards = CSV.read(filename)
    if flashcards.empty?
      puts "No cards in #{display_set_name($current_set)} set."
      next
    end
    
    all_indices = (0...flashcards.length).to_a
    result = run_review_session(flashcards, all_indices, "Review All")
    
    CSV.open(filename, "w") do |csv|
      result[:flashcards].each { |row| csv << row }
    end
    
    # Send session summary to Claude
    send_session_summary_to_claude(
      result[:session_data][:session_type],
      display_set_name($current_set),
      result[:session_data][:score],
      result[:session_data][:duration]
    )
  when "2"
    # Practice Category in Collaborative Mode
    puts "\n--- Category Review (Collaborative Mode) ---"
    puts "Select a category to review all sets:"
    puts "1. Chinese→English Foundation (Recognition)"  
    puts "2. Chinese→English Vocabulary (Recognition)"
    puts "3. English→Chinese Foundation (Production)"
    puts "4. English→Chinese Vocabulary (Production)"
    puts "5. Ruby Topic Sets"
    puts "6. Back to main menu"
    print "Select category: "
    
    category_choice = gets.chomp
    
    category_map = {
      "1" => "foundation",
      "2" => "vocabulary", 
      "3" => "production_foundation",
      "4" => "production_vocabulary",
      "5" => "ruby"
    }
    
    if category_map[category_choice]
      category = category_map[category_choice]
      sets_in_category = get_category_sets(category)
      
      if sets_in_category.empty?
        puts "No sets found in #{get_category_display_name(category)} category."
        next
      end
      
      # Start collaborative mode after category selection
      start_collaborative_mode("Practice Category", get_category_display_name(category))
      
      total_questions = sets_in_category.sum { |set| count_questions_in_set(set) }
      puts "\nReviewing #{get_category_display_name(category)}"
      puts "Total questions: #{total_questions} (from #{sets_in_category.length} sets)"
      puts "Sets included: #{sets_in_category.map { |s| display_set_name(s) }.join(', ')}"
      puts "Press Enter to continue or 'q' to cancel..."
      confirm = gets.chomp
      
      if confirm.downcase != 'q'
        combined_data = load_combined_flashcards(category)
        
        if combined_data[:flashcards].empty?
          puts "No flashcards found in category."
          next
        end
        
        all_indices = (0...combined_data[:flashcards].length).to_a
        result = run_review_session(combined_data[:flashcards], all_indices, "Category Review: #{get_category_display_name(category)}")
        
        save_combined_flashcards(combined_data, result[:flashcards])
        puts "Category review completed! Statistics updated for all sets."
        
        # Send session summary to Claude
        send_session_summary_to_claude(
          result[:session_data][:session_type],
          get_category_display_name(category),
          result[:session_data][:score],
          result[:session_data][:duration]
        )
      end
    elsif category_choice == "6"
      next
    else
      puts "Invalid choice."
    end
  when "3"
    filename = get_csv_filename($current_set)
    if !File.exist?(filename)
      puts "No cards found for #{display_set_name($current_set)} set."
      next
    end
    
    flashcards = CSV.read(filename)
    if flashcards.empty?
      puts "No cards in #{display_set_name($current_set)} set."
      next
    end
    
    difficult_cards_indices = flashcards.each_index.select { |i| flashcards[i][3].to_i >= flashcards[i][2].to_i }

    if difficult_cards_indices.empty?
      puts "
No difficult cards to practice right now. Keep reviewing!"
      next
    end
    
    result = run_review_session(flashcards, difficult_cards_indices, "Practice Difficult")

    # Save the updated flashcards back to the CSV
    CSV.open(filename, "w") do |csv|
      result[:flashcards].each { |row| csv << row }
    end
  when "4"
    # View Scores
    filename = get_csv_filename($current_set)
    if !File.exist?(filename)
      puts "No cards found for #{display_set_name($current_set)} set."
      next
    end
    
    flashcards = CSV.read(filename)  
    if flashcards.empty?
      puts "No cards in #{display_set_name($current_set)} set."
      next
    end
    
    puts "
--- #{display_set_name($current_set)} Flashcard Scores ---"
    flashcards.each_with_index do |row, index|
      question = row[0]
      correct = row[2].to_i
      incorrect = row[3].to_i
      reviewed = row[4].to_i
      percentage = (correct + incorrect) > 0 ? ((correct.to_f / (correct + incorrect)) * 100).round(1) : 0
      puts "#{index + 1}. #{question}"
      puts "   #{GREEN}Correct: #{correct}#{RESET}, #{RED}Incorrect: #{incorrect}#{RESET}, Reviewed: #{reviewed} (#{percentage}%)"
    end
    puts "------------------------"
    
    # Show session history table
    all_sessions = get_all_session_results
    if !all_sessions.empty?
      # Show only last 10 sessions in summary (but keep all data)
      recent_sessions = all_sessions.last(10)
      puts "\nSession History (Last 10 Sessions):"
      
      # Header
      header = "Q# |"
      recent_sessions.each_with_index do |_, index|
        header += " ##{index + 1} |"
      end
      puts header
      
      # Separator
      separator = "---|"
      recent_sessions.each do |_|
        separator += "----|"
      end
      puts separator
      
      # Question rows
      max_questions = recent_sessions.map { |s| s[:questions].length }.max || 0
      (0...max_questions).each do |q_index|
        row = "#{(q_index + 1).to_s.rjust(2)} |"
        recent_sessions.each do |session|
          result = session[:questions][q_index] || " "
          colored_result = case result
                          when "✓"
                            "#{GREEN}#{result}#{RESET}"
                          when "✗"
                            "#{RED}#{result}#{RESET}"
                          else
                            result
                          end
          row += " #{colored_result}  |"
        end
        puts row
      end
      
      # Totals
      puts separator
      
      # Correct counts row
      correct_row = " ✓ |"
      recent_sessions.each do |session|
        score = session[:score] || "0/0"
        correct = score.split('/')[0]
        correct_row += " #{correct.rjust(2)} |"
      end
      puts correct_row
      
      # Incorrect counts row
      incorrect_row = " ✗ |"
      recent_sessions.each do |session|
        score = session[:score] || "0/0"
        correct, total = score.split('/').map(&:to_i)
        incorrect = total - correct
        incorrect_row += " #{incorrect.to_s.rjust(2)} |"
      end
      puts incorrect_row
      
      # Total counts row
      total_row = " T |"
      recent_sessions.each do |session|
        score = session[:score] || "0/0"
        total = score.split('/')[1]
        total_row += " #{total.rjust(2)} |"
      end
      puts total_row
    end
    puts ""
  when "5"
    delete_set
  when "6"
    break
  else
    puts "Invalid choice. Please try again."
  end
end