#!/usr/bin/env ruby
require 'time'

# Disposable script to convert session_log.txt to new compact format
# Usage: ruby convert_logs.rb

input_file = "session_log.txt"
output_file = "session_log_converted.txt"
backup_file = "session_log_backup.txt"

puts "Converting #{input_file} to compact format..."

# Create backup
if File.exist?(input_file)
  File.write(backup_file, File.read(input_file))
  puts "Backup created: #{backup_file}"
end

# Read and convert
converted_lines = []

File.readlines(input_file).each do |line|
  line = line.chomp
  
  # Skip empty lines
  if line.strip.empty?
    converted_lines << ""
    next
  end
  
  # Convert SESSION START
  if line.match(/^--- SESSION START: (.+?) \| Set: (.+?) \| Type: (.+?) ---$/)
    timestamp = $1
    set_name = $2
    session_type = $3
    converted_lines << "> #{timestamp} | #{set_name} | #{session_type}"
    
  # Convert SESSION END
  elsif line.match(/^--- SESSION END: (.+?) \| Duration: (.+?)s \| Score: (.+?) correct ---$/)
    timestamp = $1
    duration = $2
    score = $3
    # Extract just the time part from timestamp
    time_only = Time.parse(timestamp).strftime('%H:%M:%S')
    converted_lines << "< #{time_only} #{duration}s #{score}"
    
  # Convert CORRECT entries
  elsif line.match(/^\[CORRECT\] Q: (.+?) \((.+?)s\)$/)
    question = $1
    duration = $2
    converted_lines << "✓ #{question} (#{duration}s)"
    
  # Convert INCORRECT entries
  elsif line.match(/^\[INCORRECT\] Q: (.+?) \(Your Answer: (.+?)\) \((.+?)s\)$/)
    question = $1
    answer = $2
    duration = $3
    converted_lines << "✗ #{question} A:#{answer} (#{duration}s)"
    
  # Keep any other lines as-is
  else
    converted_lines << line
  end
end

# Write converted file
File.write(output_file, converted_lines.join("\n") + "\n")

puts "Conversion complete!"
puts "Original lines: #{File.readlines(input_file).count}"
puts "Converted lines: #{converted_lines.count}"

# Calculate token savings
original_content = File.read(input_file)
converted_content = File.read(output_file)
original_size = original_content.length
converted_size = converted_content.length
savings = ((original_size - converted_size).to_f / original_size * 100).round(1)

puts "File size: #{original_size} → #{converted_size} bytes (#{savings}% reduction)"

puts "\nTo apply changes:"
puts "  mv #{output_file} #{input_file}"
puts "\nTo restore backup:"
puts "  mv #{backup_file} #{input_file}"