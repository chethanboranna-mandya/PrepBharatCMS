#!/usr/bin/env python3
"""
Debug script to understand question structure
"""

import re

def debug_questions():
    # Read the markdown file
    with open('/Users/chethanhulivanaboranna/Downloads/eadfb6e8-b01b-46c3-b613-9599221ed8de.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("Analyzing question structure...")
    print("="*50)
    
    # Find all numbered questions
    question_pattern = re.compile(r'^(\d+)\.\s*([\s\S]*?)(?=^\d+\.|$)', re.MULTILINE)
    matches = list(question_pattern.finditer(content))
    
    print(f"Found {len(matches)} potential questions")
    print()
    
    # Show first 5 questions
    for i, match in enumerate(matches[:5]):
        question_number = match.group(1)
        question_content = match.group(2).strip()
        
        print(f"Question {question_number}:")
        print(f"Content length: {len(question_content)} characters")
        has_options = 'Yes' if re.search(r'\([1-4]\)', question_content) else 'No'
        has_answer = 'Yes' if re.search(r'Ans\.', question_content) else 'No'
        has_solution = 'Yes' if re.search(r'Sol\.', question_content) else 'No'
        
        print(f"Has options: {has_options}")
        print(f"Has answer: {has_answer}")
        print(f"Has solution: {has_solution}")
        print(f"First 200 chars: {question_content[:200]}...")
        print("-" * 30)
    
    # Look for specific patterns
    print("\nLooking for specific patterns:")
    
    # Count questions with options
    questions_with_options = 0
    for match in matches:
        if re.search(r'\([1-4]\)', match.group(2)):
            questions_with_options += 1
    
    print(f"Questions with (1) (2) (3) (4) options: {questions_with_options}")
    
    # Count questions with answers
    questions_with_answers = 0
    for match in matches:
        if re.search(r'Ans\.', match.group(2)):
            questions_with_answers += 1
    
    print(f"Questions with Ans.: {questions_with_answers}")
    
    # Look for the first few complete questions
    print("\nFirst complete question:")
    if matches:
        first_question = matches[0].group(2)
        print(first_question[:500] + "..." if len(first_question) > 500 else first_question)

if __name__ == '__main__':
    debug_questions()
