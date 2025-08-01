#!/usr/bin/env ruby

# Simple test script to verify the reorganized flashcard system works

require_relative 'flashcards'

puts "=== Testing Flashcard System Reorganization ==="
puts

# Test 1: Check if consolidated ruby set is accessible
puts "Test 1: Checking consolidated Ruby set..."
$current_set = "ruby"
filename = get_csv_filename($current_set)
if File.exist?(filename)
  cards = CSV.read(filename)
  puts "✓ Consolidated ruby_flashcards.csv exists with #{cards.length} cards"
else
  puts "✗ Consolidated ruby_flashcards.csv not found"
end
puts

# Test 2: Check if Ruby topic sets are accessible
puts "Test 2: Checking Ruby topic sets in subdirectory..."
$current_set = "Ruby/ruby_core_variables_constants"
filename = get_csv_filename($current_set)
if File.exist?(filename)
  cards = CSV.read(filename)
  puts "✓ Ruby topic set exists with #{cards.length} cards"
  puts "  Display name: #{display_set_name($current_set)}"
else
  puts "✗ Ruby topic set not accessible"
end
puts

# Test 3: Check if set listing works
puts "Test 3: Checking set listing functionality..."
sets = list_available_sets
main_sets = sets.select { |set| !set.include?("/") }
ruby_sets = sets.select { |set| set.include?("Ruby/") }

puts "✓ Found #{main_sets.length} main sets: #{main_sets.join(', ')}"
puts "✓ Found #{ruby_sets.length} Ruby topic sets"
puts

# Test 4: Display names
puts "Test 4: Testing display name formatting..."
test_names = ["ruby", "javascript", "Ruby/ruby_core_variables_constants", "Ruby/ruby_oop_inheritance"]
test_names.each do |name|
  puts "  #{name} → #{display_set_name(name)}"
end
puts

puts "=== All tests completed ==="