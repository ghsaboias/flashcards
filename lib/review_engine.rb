require "time"
require "csv"

module ReviewEngine
  include AudioHandler
  include SessionTracker
  include SetManager

  def run_review_session(flashcards, indices_to_review, session_type)
    if indices_to_review.empty?
      puts "
No cards to review in this category."
      return {
        flashcards: flashcards,
        session_data: {
          score: "0/0",
          duration: 0,
          session_type: session_type
        }
      }
    end

    session_start_time = Time.now
    session_start_time_str = session_start_time.strftime("%Y-%m-%d %H:%M:%S")
    session_correct_count = 0
    session_results = []

    randomized_indices = indices_to_review.shuffle
    position_to_csv_index = {}
    randomized_indices.each_with_index do |csv_index, position|
      position_to_csv_index[position] = csv_index
    end

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
      log_file.puts "> #{session_start_time_str} | #{display_set_name($current_set)} | #{session_type}"

      randomized_indices.each_with_index do |index, question_number|
        question_start_time = Time.now
        row = flashcards[index]
        question = row[0]
        answer = row[1]
        correct_count = row[2].to_i
        incorrect_count = row[3].to_i
        reviewed_count = row[4].to_i

        is_chinese_set = is_chinese_set?($current_set)
        if is_chinese_set
          question_line = "Question #{question_number + 1}: #{question}"
          audio_hint = "(press 'p' for audio)"
          total_width = 80
          padding = total_width - question_line.length - audio_hint.length
          padding = [0, padding].max
          puts "#{question_line}#{' ' * padding}#{audio_hint}"
          
          chinese_text = get_chinese_text(question, answer)
          play_audio(chinese_text)
        else
          puts "Question #{question_number + 1}: #{question}"
        end
        
        print "Your answer: "
        user_answer = gets.chomp
        
        if is_chinese_set
          while user_answer.downcase == 'p'
            chinese_text = get_chinese_text(question, answer)
            play_audio(chinese_text)
            print "Your answer: "
            user_answer = gets.chomp
          end
        end

        if answer.include?(";") || answer.include?(" or ")
          correct_parts = answer.downcase.split(/[;]| or /).map(&:strip).sort
          user_parts = user_answer.downcase.split(" or ").map(&:strip).sort
          is_correct = user_parts.any? { |part| correct_parts.include?(part) }
        else
          is_correct = user_answer.downcase.strip == answer.downcase.strip
        end

        question_end_time = Time.now
        question_duration = (question_end_time - question_start_time).round(1)
        
        if is_correct
          puts "#{GREEN}Correct! The answer is: #{answer}#{RESET}"
          flashcards[index][2] = correct_count + 1
          session_correct_count += 1
          session_results << { number: question_number + 1, result: "✓" }
          log_file.puts "✓ #{question} (#{question_duration}s)"
        else
          puts "#{RED}Sorry, the correct answer is: #{answer}#{RESET}"
          flashcards[index][3] = incorrect_count + 1
          session_results << { number: question_number + 1, result: "✗" }
          log_file.puts "✗ #{question} A:#{user_answer} (#{question_duration}s)"
        end
        flashcards[index][4] = reviewed_count + 1
      end

      session_end_time = Time.now
      session_end_time_str = session_end_time.strftime("%Y-%m-%d %H:%M:%S")
      session_duration = (session_end_time - session_start_time).round(1)
      
      session_summary = "< #{session_end_time.strftime('%H:%M:%S')} #{session_duration}s #{session_correct_count}/#{indices_to_review.length}"
      log_file.puts session_summary
      log_file.puts ""
    end
    
    session_percentage = indices_to_review.length > 0 ? ((session_correct_count.to_f / indices_to_review.length) * 100).round(1) : 0
      puts "\n--- Session Complete ---"
      puts "Score: #{session_correct_count}/#{indices_to_review.length} (#{session_percentage}%)"
      
      current_session_by_csv_order = Array.new(indices_to_review.length, " ")
      session_results.each do |result|
        csv_index = position_to_csv_index[result[:number] - 1]
        csv_position = indices_to_review.index(csv_index)
        current_session_by_csv_order[csv_position] = result[:result] if csv_position
      end
      
      all_sessions = get_all_session_results
      all_sessions << { questions: current_session_by_csv_order, score: "#{session_correct_count}/#{indices_to_review.length}" }
      
      recent_sessions = all_sessions.last(10)
      
      puts "Score Summary (Last 10 Sessions):"
      
      header = "Q# |"
      recent_sessions.each_with_index do |_, index|
        header += " ##{index + 1} |"
      end
      puts header
      
      separator = "---|"
      recent_sessions.each do |_|
        separator += "----|"
      end
      puts separator
      
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
      
      puts separator
      
      correct_row = " ✓ |"
      recent_sessions.each do |session|
        score = session[:score] || "0/0"
        correct = score.split('/')[0]
        correct_row += " #{correct.rjust(2)} |"
      end
      puts correct_row
      
      incorrect_row = " ✗ |"
      recent_sessions.each do |session|
        score = session[:score] || "0/0"
        correct, total = score.split('/').map(&:to_i)
        incorrect = total - correct
        incorrect_row += " #{incorrect.to_s.rjust(2)} |"
      end
      puts incorrect_row
      
      total_row = " T |"
      recent_sessions.each do |session|
        score = session[:score] || "0/0"
        total = score.split('/')[1]
        total_row += " #{total.rjust(2)} |"
      end
      puts total_row

    # Return both flashcards and session data
    {
      flashcards: flashcards,
      session_data: {
        score: "#{session_correct_count}/#{indices_to_review.length}",
        duration: session_duration,
        session_type: session_type
      }
    }
  end
end