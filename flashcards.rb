require "csv"
require "time" # For timestamps

# Global variable to track current card set
$current_set = "ruby"

# Method to display set name nicely
def display_set_name(set_name)
  if set_name.include?("Ruby/")
    set_name.gsub("Ruby/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
  else
    # Handle special cases for proper capitalization
    case set_name.downcase
    when "javascript"
      "JavaScript"
    when "ruby"
      "Ruby"
    else
      set_name.gsub("_", " ").split.map(&:capitalize).join(" ")
    end
  end
end

# Method to get CSV filename for a card set
def get_csv_filename(set_name)
  # Check if it's a set in a subdirectory (contains /)
  if set_name.include?("/")
    "#{set_name}_flashcards.csv"
  else
    "#{set_name}_flashcards.csv"
  end
end

# Method to list available card sets
def list_available_sets
  # Get files from main directory
  main_csv_files = Dir.glob("*_flashcards.csv")
  main_sets = main_csv_files.map { |file| file.gsub("_flashcards.csv", "") }
  
  # Get files from Ruby subdirectory
  ruby_csv_files = Dir.glob("Ruby/*_flashcards.csv")
  ruby_sets = ruby_csv_files.map { |file| file.gsub("_flashcards.csv", "").gsub("Ruby/", "Ruby/") }
  
  all_sets = main_sets + ruby_sets
  all_sets.empty? ? ["ruby"] : all_sets.sort
end

# Method to select a card set
def select_card_set
  available_sets = list_available_sets
  
  puts "\n--- Available Card Sets ---"
  puts "Main Sets:"
  main_sets = available_sets.select { |set| !set.include?("/") }
  main_sets.each_with_index do |set, index|
    current_indicator = set == $current_set ? " (current)" : ""
    puts "  #{index + 1}. #{display_set_name(set)}#{current_indicator}"
  end
  
  ruby_sets = available_sets.select { |set| set.include?("Ruby/") }
  if !ruby_sets.empty?
    puts "\nRuby Topic Sets:"
    ruby_sets.each_with_index do |set, index|
      current_indicator = set == $current_set ? " (current)" : ""
      display_name = set.gsub("Ruby/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
      puts "  #{main_sets.length + index + 1}. #{display_name}#{current_indicator}"
    end
  end
  puts "#{available_sets.length + 1}. Create new set"
  puts "#{available_sets.length + 2}. Back to main menu"
  
  print "Select a set: "
  choice = gets.chomp.to_i
  
  if choice >= 1 && choice <= available_sets.length
    $current_set = available_sets[choice - 1]
    puts "Switched to #{display_set_name($current_set)} cards."
  elsif choice == available_sets.length + 1
    create_new_set
  elsif choice == available_sets.length + 2
    return
  else
    puts "Invalid choice."
  end
end

# Method to create a new card set
def create_new_set
  print "Enter name for new card set: "
  set_name = gets.chomp.downcase.gsub(/\s+/, "_")
  
  if set_name.empty?
    puts "Invalid set name."
    return
  end
  
  filename = get_csv_filename(set_name)
  if File.exist?(filename)
    puts "Set '#{set_name}' already exists."
    return
  end
  
  # Create empty CSV file
  CSV.open(filename, "w") { |csv| }
  $current_set = set_name
  puts "Created new set '#{set_name}' and switched to it."
end

# Method to delete a card set
def delete_set
  available_sets = list_available_sets
  
  if available_sets.length <= 1
    puts "Cannot delete the only remaining set."
    return
  end
  
  puts "\n--- Delete Card Set ---"
  puts "Available sets to delete:"
  available_sets.each_with_index do |set, index|
    puts "  #{index + 1}. #{display_set_name(set)}"
  end
  puts "#{available_sets.length + 1}. Cancel"
  
  print "Select set to delete: "
  choice = gets.chomp.to_i
  
  if choice >= 1 && choice <= available_sets.length
    set_to_delete = available_sets[choice - 1]
    
    puts "\nAre you sure you want to delete '#{display_set_name(set_to_delete)}'?"
    puts "This will permanently remove all cards and progress data."
    print "Type 'yes' to confirm: "
    confirmation = gets.chomp.downcase
    
    if confirmation == "yes"
      filename = get_csv_filename(set_to_delete)
      if File.exist?(filename)
        File.delete(filename)
        puts "Deleted set '#{display_set_name(set_to_delete)}'."
        
        # If we deleted the current set, switch to another available set
        if set_to_delete == $current_set
          remaining_sets = list_available_sets
          $current_set = remaining_sets.first unless remaining_sets.empty?
          puts "Switched to '#{display_set_name($current_set)}' set."
        end
      else
        puts "Set file not found."
      end
    else
      puts "Delete cancelled."
    end
  elsif choice == available_sets.length + 1
    puts "Delete cancelled."
  else
    puts "Invalid choice."
  end
end

# Method to get all session results for current set
def get_all_session_results
  return [] unless File.exist?("session_log.txt")
  
  lines = File.readlines("session_log.txt")
  all_sessions = []
  current_session = nil
  
  lines.each do |line|
    if line.include?("--- SESSION START:") && line.include?("Set: #{display_set_name($current_set)}")
      current_session = { questions: [], score: nil }
    elsif current_session && line.include?("--- SESSION END:")
      if match = line.match(/(\d+)\/(\d+) correct/)
        current_session[:score] = "#{match[1]}/#{match[2]}"
        all_sessions << current_session
      end
      current_session = nil
    elsif current_session && line.include?("[CORRECT]")
      current_session[:questions] << "✓"
    elsif current_session && line.include?("[INCORRECT]")
      current_session[:questions] << "✗"
    end
  end
  
  all_sessions
end

# Method to get last session results for current set
def get_last_session_results
  all_sessions = get_all_session_results
  return nil if all_sessions.empty?
  all_sessions.last
end

# Method to run a review session for a given set of cards
def run_review_session(flashcards, indices_to_review, session_type)
  if indices_to_review.empty?
    puts "
No cards to review in this category."
    return flashcards
  end

  session_start_time = Time.now.strftime("%Y-%m-%d %H:%M:%S")
  session_correct_count = 0
  session_results = []

  # Randomize the order of questions
  randomized_indices = indices_to_review.shuffle
  # Create mapping from randomized position to original CSV position
  position_to_csv_index = {}
  randomized_indices.each_with_index do |csv_index, position|
    position_to_csv_index[position] = csv_index
  end

  # Show last session results if available
  last_session = get_last_session_results
  if last_session
    puts "\nLast Session: #{last_session[:score]} correct"
    puts "Q#  | Result"
    puts "----|-------"
    last_session[:questions].each_with_index do |result, index|
      puts "#{(index + 1).to_s.rjust(2)}  | #{result}"
    end
  end

  puts "
--- Starting Session: #{session_type} ---"

  File.open("session_log.txt", "a") do |log_file|
    log_file.puts "--- SESSION START: #{session_start_time} | Set: #{display_set_name($current_set)} | Type: #{session_type} ---"

    randomized_indices.each_with_index do |index, question_number|
      row = flashcards[index]
      question = row[0]
      answer = row[1]
      correct_count = row[2].to_i
      incorrect_count = row[3].to_i
      reviewed_count = row[4].to_i

      puts "Question #{question_number + 1}: #{question}"
      print "Your answer: "
      user_answer = gets.chomp

      correct_parts = answer.downcase.split(" or ").map(&:strip).sort
      user_parts = user_answer.downcase.split(" or ").map(&:strip).sort

      if user_parts == correct_parts
        puts "Correct!"
        flashcards[index][2] = correct_count + 1
        session_correct_count += 1
        session_results << { number: question_number + 1, result: "✓" }
        log_file.puts "[CORRECT] Q: #{question}"
      else
        puts "Sorry, the correct answer is: #{answer}"
        flashcards[index][3] = incorrect_count + 1
        session_results << { number: question_number + 1, result: "✗" }
        log_file.puts "[INCORRECT] Q: #{question} (Your Answer: #{user_answer})"
      end
      flashcards[index][4] = reviewed_count + 1
    end

    session_summary = "--- SESSION END: #{session_correct_count}/#{indices_to_review.length} correct ---"
    log_file.puts session_summary
    log_file.puts "" # Add a blank line for spacing
    
    puts "\n--- Session Complete ---"
    
    # Convert session results back to CSV order for display
    current_session_by_csv_order = Array.new(indices_to_review.length, " ")
    session_results.each do |result|
      csv_index = position_to_csv_index[result[:number] - 1]
      csv_position = indices_to_review.index(csv_index)
      current_session_by_csv_order[csv_position] = result[:result] if csv_position
    end
    
    # Get all previous sessions plus current session
    all_sessions = get_all_session_results
    all_sessions << { questions: current_session_by_csv_order, score: "#{session_correct_count}/#{indices_to_review.length}" }
    
    # Show only last 10 sessions in summary (but keep all data)
    recent_sessions = all_sessions.last(10)
    
    # Show multi-column score table
    puts "Score Summary (Last 10 Sessions):"
    
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
        row += " #{result}  |"
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

  # Return the modified flashcards array
  flashcards
end


loop do
  puts "
Current set: #{display_set_name($current_set)}
What would you like to do?"
  puts "1. Select/Switch Card Set"
  puts "2. Add a new flashcard"
  puts "3. Review all flashcards"
  puts "4. Practice difficult cards"
  puts "5. View Scores"
  puts "6. Delete a card set"
  puts "7. Exit"
  print "Enter your choice: "
  choice = gets.chomp

  case choice
  when "1"
    select_card_set
  when "2"
    # Add a new flashcard
    print "Enter the question: "
    question = gets.chomp
    print "Enter the answer: "
    answer = gets.chomp

    CSV.open(get_csv_filename($current_set), "a") do |csv|
      csv << [question, answer, 0, 0, 0]
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
    
    all_indices = (0...flashcards.length).to_a
    flashcards = run_review_session(flashcards, all_indices, "Review All")

    # Save the updated flashcards back to the CSV
    CSV.open(filename, "w") do |csv|
      flashcards.each { |row| csv << row }
    end
  when "4"
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
    
    flashcards = run_review_session(flashcards, difficult_cards_indices, "Practice Difficult")

    # Save the updated flashcards back to the CSV
    CSV.open(filename, "w") do |csv|
      flashcards.each { |row| csv << row }
    end
  when "5"
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
      correct = row[2]
      incorrect = row[3]
      reviewed = row[4]
      puts "#{index + 1}. #{question}"
      puts "   Correct: #{correct}, Incorrect: #{incorrect}, Reviewed: #{reviewed}"
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
          row += " #{result}  |"
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
  when "6"
    delete_set
  when "7"
    break
  else
    puts "Invalid choice. Please try again."
  end
end