#!/usr/bin/env python3
import re

def find_question_matches(content):
    """Test question detection logic"""
    matches = []
    
    # Split content by question numbers and process each section
    # Look for patterns like "1. question text" followed by options and answer
    question_sections = re.split(r'^(\d+)\.\s*', content, flags=re.MULTILINE)
    
    # Process pairs of (number, content)
    for i in range(1, len(question_sections), 2):
        if i + 1 < len(question_sections):
            question_number = question_sections[i]
            question_content = question_sections[i + 1]
            
            # Find the end of this question (next question number or end of content)
            next_question_match = re.search(r'^(\d+)\.\s*', question_content, re.MULTILINE)
            if next_question_match:
                # Cut off at the next question
                question_content = question_content[:next_question_match.start()]
            
            question_content = question_content.strip()
            
            # Only include if it looks like a real question (has options or answer)
            if re.search(r'\([1-4]\)|Ans\.|Sol\.', question_content):
                matches.append({
                    'number': question_number,
                    'content': question_content,
                    'type': 'numbered'
                })
    
    # Sort by question number
    return sorted(matches, key=lambda x: int(x['number']))

def test_question_detection():
    """Test different question formats"""
    
    test_content = """8. What is the value of x in the equation 2x + 3 = 7?
(1) 1
(2) 2
(3) 3
(4) 4
Ans. (2)

9. If the function $f(x)=2 x^{3}-9 a x^{2}+12 a^{2} x+1$, where a $>0$, attains its local maximum and local minimum values at p and q , respectively, such that $\\mathrm{p}^{2}=\\mathrm{q}$, then $f(3)$ is equal to:
(1) 55
(2) 10
(3) 23
(4) 37
Ans. (4)

10. Solve the equation: x² - 5x + 6 = 0
A) x = 1, x = 6
B) x = 2, x = 3
C) x = -2, x = -3
D) x = 0, x = 5
Ans. B"""

    print("Test content:")
    print(test_content)
    print("\n" + "="*60 + "\n")
    
    matches = find_question_matches(test_content)
    
    print(f"Found {len(matches)} questions:")
    for i, match in enumerate(matches, 1):
        print(f"\nQuestion {i}:")
        print(f"  Number: {match['number']}")
        print(f"  Content preview: {match['content'][:100]}...")
        print(f"  Has options: {'Yes' if re.search(r'\([1-4]\)|Ans\.|Sol\.', match['content']) else 'No'}")

if __name__ == "__main__":
    test_question_detection()
