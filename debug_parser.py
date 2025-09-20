#!/usr/bin/env python3
"""
Debug script to test option extraction
"""

import re

def test_option_extraction():
    # Sample content from the markdown file
    sample_content = """1. The largest $\\mathrm{n} \\in \\mathrm{N}$ such that $3^{\\mathrm{n}}$ divides 50 ! is:
(1) 21
(2) 22
(3) 20
(4) 23

Ans. (2)
Sol. $\\quad 2^{\\alpha} \\cdot 3^{\\beta} \\cdot 5^{\\gamma}$"""

    print("Testing option extraction patterns...")
    print("Sample content:")
    print(sample_content)
    print("\n" + "="*50 + "\n")
    
    # Test different patterns
    patterns = [
        # Pattern 1: (1) option text (2) option text (3) option text (4) option text
        {'name': 'Parenthesized numbers', 'regex': re.compile(r'\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|$)', re.MULTILINE)},
        # Pattern 2: A) option text B) option text C) option text D) option text
        {'name': 'Lettered options', 'regex': re.compile(r'([A-D])\)\s*([^A-D\)]*?)(?=[A-D]\)|Ans\.|$)', re.MULTILINE)},
        # Pattern 3: 1. option text 2. option text 3. option text 4. option text
        {'name': 'Numbered options', 'regex': re.compile(r'(\d+)\.\s*([^0-9]*?)(?=\d+\.|Ans\.|$)', re.MULTILINE)}
    ]
    
    for pattern in patterns:
        print(f"Testing {pattern['name']}:")
        matches = pattern['regex'].findall(sample_content)
        print(f"  Found {len(matches)} matches:")
        for i, match in enumerate(matches):
            print(f"    {i+1}. Number: '{match[0]}', Text: '{match[1].strip()}'")
        print()
    
    # Test the specific pattern that should work
    print("Testing specific pattern for (1) (2) (3) (4) format:")
    specific_pattern = re.compile(r'\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|$)', re.MULTILINE)
    matches = specific_pattern.findall(sample_content)
    print(f"Found {len(matches)} matches:")
    for i, match in enumerate(matches):
        print(f"  {i+1}. Number: '{match[0]}', Text: '{match[1].strip()}'")
    
    # Test with a simpler pattern
    print("\nTesting simpler pattern:")
    simple_pattern = re.compile(r'\((\d+)\)\s*([^\n]+)', re.MULTILINE)
    matches = simple_pattern.findall(sample_content)
    print(f"Found {len(matches)} matches:")
    for i, match in enumerate(matches):
        print(f"  {i+1}. Number: '{match[0]}', Text: '{match[1].strip()}'")

if __name__ == '__main__':
    test_option_extraction()


