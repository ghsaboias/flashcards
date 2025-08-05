require "csv"

module SetManager
  include AudioHandler
  def display_set_name(set_name)
    if set_name.include?("Ruby/")
      "Ruby: " + set_name.gsub("Ruby/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
    elsif set_name.include?("Chinese->English/Foundation/")
      "Chinese→English Foundation: " + set_name.gsub("Chinese->English/Foundation/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
    elsif set_name.include?("Chinese->English/Vocabulary/")
      "Chinese→English Vocabulary: " + set_name.gsub("Chinese->English/Vocabulary/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
    elsif set_name.include?("English->Chinese/Foundation/")
      "English→Chinese Foundation: " + set_name.gsub("English->Chinese/Foundation/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
    elsif set_name.include?("English->Chinese/Vocabulary/")
      "English→Chinese Vocabulary: " + set_name.gsub("English->Chinese/Vocabulary/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
    else
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

  def get_csv_filename(set_name)
    if set_name.include?("/")
      "#{set_name}_flashcards.csv"
    else
      "#{set_name}_flashcards.csv"
    end
  end

  def count_questions_in_set(set_name)
    filename = get_csv_filename(set_name)
    return 0 unless File.exist?(filename)
    
    begin
      flashcards = CSV.read(filename)
      flashcards.length
    rescue
      0
    end
  end

  def get_set_progress_stats(set_name)
    filename = get_csv_filename(set_name)
    return { correct: 0, incorrect: 0, total: 0, percentage: 0 } unless File.exist?(filename)
    
    begin
      flashcards = CSV.read(filename)
      total_correct = flashcards.sum { |row| row[2].to_i }
      total_incorrect = flashcards.sum { |row| row[3].to_i }
      total_reviewed = flashcards.sum { |row| row[4].to_i }
      
      percentage = (total_correct + total_incorrect) > 0 ? ((total_correct.to_f / (total_correct + total_incorrect)) * 100).round(1) : 0
      
      { correct: total_correct, incorrect: total_incorrect, total: total_reviewed, percentage: percentage }
    rescue
      { correct: 0, incorrect: 0, total: 0, percentage: 0 }
    end
  end

  def list_available_sets
    main_csv_files = Dir.glob("*_flashcards.csv")
    main_sets = main_csv_files.map { |file| file.gsub("_flashcards.csv", "") }
    
    ruby_csv_files = Dir.glob("Ruby/*_flashcards.csv")
    ruby_sets = ruby_csv_files.map { |file| file.gsub("_flashcards.csv", "").gsub("Ruby/", "Ruby/") }
    
    chinese_to_english_foundation_files = Dir.glob("Chinese->English/Foundation/*_flashcards.csv")
    chinese_to_english_foundation_sets = chinese_to_english_foundation_files.map { |file| file.gsub("_flashcards.csv", "") }
    
    chinese_to_english_vocabulary_files = Dir.glob("Chinese->English/Vocabulary/*_flashcards.csv")
    chinese_to_english_vocabulary_sets = chinese_to_english_vocabulary_files.map { |file| file.gsub("_flashcards.csv", "") }
    
    english_to_chinese_foundation_files = Dir.glob("English->Chinese/Foundation/*_flashcards.csv")
    english_to_chinese_foundation_sets = english_to_chinese_foundation_files.map { |file| file.gsub("_flashcards.csv", "") }
    
    english_to_chinese_vocabulary_files = Dir.glob("English->Chinese/Vocabulary/*_flashcards.csv")
    english_to_chinese_vocabulary_sets = english_to_chinese_vocabulary_files.map { |file| file.gsub("_flashcards.csv", "") }
    
    all_sets = main_sets + ruby_sets + chinese_to_english_foundation_sets + chinese_to_english_vocabulary_sets + english_to_chinese_foundation_sets + english_to_chinese_vocabulary_sets
    all_sets.empty? ? ["ruby"] : all_sets.sort
  end

  def select_card_set
    available_sets = list_available_sets
    
    puts "\n--- Available Card Sets ---"
    
    main_sets = available_sets.select { |set| !set.include?("/") }
    current_index = 0
    
    if !main_sets.empty?
      puts "Main Sets:"
      main_sets.each_with_index do |set, index|
        current_indicator = set == $current_set ? " (current)" : ""
        question_count = count_questions_in_set(set)
        progress = get_set_progress_stats(set)
        progress_display = progress[:total] > 0 ? " [#{GREEN}✓#{progress[:correct]}#{RESET} #{RED}✗#{progress[:incorrect]}#{RESET} T#{progress[:total]} #{progress[:percentage]}%]" : ""
        puts "  #{current_index + 1}. #{display_set_name(set)} (#{question_count} questions)#{progress_display}#{current_indicator}"
        current_index += 1
      end
    end
    
    chinese_to_english_foundation_sets = available_sets.select { |set| set.include?("Chinese->English/Foundation/") }
    if !chinese_to_english_foundation_sets.empty?
      puts "\nChinese→English Foundation (Recognition):"
      chinese_to_english_foundation_sets.each do |set|
        current_indicator = set == $current_set ? " (current)" : ""
        display_name = set.gsub("Chinese->English/Foundation/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
        question_count = count_questions_in_set(set)
        progress = get_set_progress_stats(set)
        progress_display = progress[:total] > 0 ? " [#{GREEN}✓#{progress[:correct]}#{RESET} #{RED}✗#{progress[:incorrect]}#{RESET} T#{progress[:total]} #{progress[:percentage]}%]" : ""
        puts "  #{current_index + 1}. #{display_name} (#{question_count} questions)#{progress_display}#{current_indicator}"
        current_index += 1
      end
    end
    
    chinese_to_english_vocabulary_sets = available_sets.select { |set| set.include?("Chinese->English/Vocabulary/") }
    if !chinese_to_english_vocabulary_sets.empty?
      puts "\nChinese→English Vocabulary (Recognition):"
      chinese_to_english_vocabulary_sets.each do |set|
        current_indicator = set == $current_set ? " (current)" : ""
        display_name = set.gsub("Chinese->English/Vocabulary/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
        question_count = count_questions_in_set(set)
        progress = get_set_progress_stats(set)
        progress_display = progress[:total] > 0 ? " [#{GREEN}✓#{progress[:correct]}#{RESET} #{RED}✗#{progress[:incorrect]}#{RESET} T#{progress[:total]} #{progress[:percentage]}%]" : ""
        puts "  #{current_index + 1}. #{display_name} (#{question_count} questions)#{progress_display}#{current_indicator}"
        current_index += 1
      end
    end
    
    english_to_chinese_foundation_sets = available_sets.select { |set| set.include?("English->Chinese/Foundation/") }
    if !english_to_chinese_foundation_sets.empty?
      puts "\nEnglish→Chinese Foundation (Production):"
      english_to_chinese_foundation_sets.each do |set|
        current_indicator = set == $current_set ? " (current)" : ""
        display_name = set.gsub("English->Chinese/Foundation/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
        question_count = count_questions_in_set(set)
        progress = get_set_progress_stats(set)
        progress_display = progress[:total] > 0 ? " [#{GREEN}✓#{progress[:correct]}#{RESET} #{RED}✗#{progress[:incorrect]}#{RESET} T#{progress[:total]} #{progress[:percentage]}%]" : ""
        puts "  #{current_index + 1}. #{display_name} (#{question_count} questions)#{progress_display}#{current_indicator}"
        current_index += 1
      end
    end
    
    english_to_chinese_vocabulary_sets = available_sets.select { |set| set.include?("English->Chinese/Vocabulary/") }
    if !english_to_chinese_vocabulary_sets.empty?
      puts "\nEnglish→Chinese Vocabulary (Production):"
      english_to_chinese_vocabulary_sets.each do |set|
        current_indicator = set == $current_set ? " (current)" : ""
        display_name = set.gsub("English->Chinese/Vocabulary/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
        question_count = count_questions_in_set(set)
        progress = get_set_progress_stats(set)
        progress_display = progress[:total] > 0 ? " [#{GREEN}✓#{progress[:correct]}#{RESET} #{RED}✗#{progress[:incorrect]}#{RESET} T#{progress[:total]} #{progress[:percentage]}%]" : ""
        puts "  #{current_index + 1}. #{display_name} (#{question_count} questions)#{progress_display}#{current_indicator}"
        current_index += 1
      end
    end
    
    ruby_sets = available_sets.select { |set| set.include?("Ruby/") }
    if !ruby_sets.empty?
      puts "\nRuby Topic Sets:"
      ruby_sets.each do |set|
        current_indicator = set == $current_set ? " (current)" : ""
        display_name = set.gsub("Ruby/", "").gsub("_", " ").split.map(&:capitalize).join(" ")
        question_count = count_questions_in_set(set)
        progress = get_set_progress_stats(set)
        progress_display = progress[:total] > 0 ? " [#{GREEN}✓#{progress[:correct]}#{RESET} #{RED}✗#{progress[:incorrect]}#{RESET} T#{progress[:total]} #{progress[:percentage]}%]" : ""
        puts "  #{current_index + 1}. #{display_name} (#{question_count} questions)#{progress_display}#{current_indicator}"
        current_index += 1
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
    
    CSV.open(filename, "w") { |csv| }
    $current_set = set_name
    puts "Created new set '#{set_name}' and switched to it."
  end

  def get_category_sets(category)
    available_sets = list_available_sets
    case category
    when "foundation"
      available_sets.select { |set| set.include?("Chinese->English/Foundation/") }
    when "vocabulary"
      available_sets.select { |set| set.include?("Chinese->English/Vocabulary/") }
    when "production_foundation"
      available_sets.select { |set| set.include?("English->Chinese/Foundation/") }
    when "production_vocabulary"
      available_sets.select { |set| set.include?("English->Chinese/Vocabulary/") }
    when "ruby"
      available_sets.select { |set| set.include?("Ruby/") }
    else
      []
    end
  end

  def get_category_display_name(category)
    case category
    when "foundation"
      "Chinese→English Foundation (Recognition)"
    when "vocabulary"
      "Chinese→English Vocabulary (Recognition)"
    when "production_foundation"
      "English→Chinese Foundation (Production)"
    when "production_vocabulary"
      "English→Chinese Vocabulary (Production)"
    when "ruby"
      "Ruby Topic Sets"
    else
      "Unknown Category"
    end
  end

  def load_combined_flashcards(category)
    sets = get_category_sets(category)
    return [] if sets.empty?
    
    combined_flashcards = []
    set_source_map = []
    seen_questions = {}
    
    sets.each do |set_name|
      filename = get_csv_filename(set_name)
      next unless File.exist?(filename)
      
      begin
        flashcards = CSV.read(filename)
        flashcards.each_with_index do |card, index|
          question = card[0]
          
          if seen_questions[question]
            # Merge statistics: add counts from duplicate to first occurrence
            first_occurrence_index = seen_questions[question][:combined_index]
            combined_flashcards[first_occurrence_index][2] = (combined_flashcards[first_occurrence_index][2].to_i + card[2].to_i).to_s
            combined_flashcards[first_occurrence_index][3] = (combined_flashcards[first_occurrence_index][3].to_i + card[3].to_i).to_s
            combined_flashcards[first_occurrence_index][4] = (combined_flashcards[first_occurrence_index][4].to_i + card[4].to_i).to_s
            # Store reference to merge back later
            seen_questions[question][:duplicates] << { set: set_name, original_index: index }
          else
            # First occurrence of this question
            combined_flashcards << card
            combined_index = combined_flashcards.length - 1
            set_source_map << { set: set_name, original_index: index }
            seen_questions[question] = { 
              combined_index: combined_index,
              duplicates: []
            }
          end
        end
      rescue
        puts "Warning: Could not load #{set_name}"
      end
    end
    
    { flashcards: combined_flashcards, source_map: set_source_map, question_map: seen_questions }
  end

  def save_combined_flashcards(combined_data, updated_flashcards)
    return unless combined_data[:source_map] && combined_data[:question_map]
    
    set_updates = {}
    
    updated_flashcards.each_with_index do |card, index|
      source_info = combined_data[:source_map][index]
      set_name = source_info[:set]
      original_index = source_info[:original_index]
      question = card[0]
      
      set_updates[set_name] ||= []
      set_updates[set_name][original_index] = card
      
      # Also update all duplicate occurrences with the same statistics
      if combined_data[:question_map][question] && combined_data[:question_map][question][:duplicates]
        combined_data[:question_map][question][:duplicates].each do |duplicate|
          duplicate_set = duplicate[:set]
          duplicate_index = duplicate[:original_index]
          
          set_updates[duplicate_set] ||= []
          # Create a copy of the card for the duplicate location
          duplicate_card = card.dup
          set_updates[duplicate_set][duplicate_index] = duplicate_card
        end
      end
    end
    
    set_updates.each do |set_name, cards|
      filename = get_csv_filename(set_name)
      
      begin
        existing_cards = CSV.read(filename)
        cards.each_with_index do |updated_card, index|
          existing_cards[index] = updated_card if updated_card
        end
        
        CSV.open(filename, "w") do |csv|
          existing_cards.each { |row| csv << row }
        end
      rescue => e
        puts "Warning: Could not save updates to #{set_name}: #{e.message}"
      end
    end
  end

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
end