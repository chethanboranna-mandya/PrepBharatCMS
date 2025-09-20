#!/usr/bin/env python3
"""
Test script for the sophisticated markdown parser
"""

import re
import json
from datetime import datetime

class SophisticatedMarkdownParser:
    def __init__(self):
        self.math_patterns = {
            'display_math': re.compile(r'\$\$([\s\S]*?)\$\$'),
            'inline_math': re.compile(r'\$([^$]+)\$'),
            'commands': re.compile(r'\\[a-zA-Z]+\{[^}]*\}'),
            'fractions': re.compile(r'\\frac\{([^}]+)\}\{([^}]+)\}'),
            'superscript': re.compile(r'\^([^{}\s]+)'),
            'subscript': re.compile(r'_([^{}\s]+)'),
            'greek': re.compile(r'\\[a-zA-Z]+'),
            'matrix': re.compile(r'\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}')
        }
        
        self.question_patterns = {
            'numbered': re.compile(r'^(\d+)\.\s*(.+?)(?=\n\d+\.|$)', re.MULTILINE | re.DOTALL),
            'lettered': re.compile(r'^([A-Z])\.\s*(.+?)(?=\n[A-Z]\.|$)', re.MULTILINE | re.DOTALL),
            'parenthesized': re.compile(r'^\((\d+)\)\s*(.+?)(?=\n\(\d+\)|$)', re.MULTILINE | re.DOTALL)
        }
        
        self.option_patterns = {
            'numbered': re.compile(r'\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|$)', re.MULTILINE),
            'lettered': re.compile(r'([A-D])\)\s*([^A-D\)]*?)(?=[A-D]\)|Ans\.|$)', re.MULTILINE),
            'dotted': re.compile(r'(\d+)\.\s*([^0-9]*?)(?=\d+\.|Ans\.|$)', re.MULTILINE)
        }
        
        self.answer_patterns = {
            'answer': re.compile(r'Ans\.\s*[\(]?([A-D1-4])[\)]?', re.IGNORECASE),
            'answer_colon': re.compile(r'Answer:\s*([A-D1-4])', re.IGNORECASE),
            'correct_answer': re.compile(r'Correct\s+answer\s+is\s+([A-D1-4])', re.IGNORECASE)
        }
        
        self.solution_patterns = {
            'solution': re.compile(r'(?:Sol\.|Solution:|Explanation:)\s*([\s\S]*?)(?=\n\d+\.|$)', re.IGNORECASE),
            'detailed_solution': re.compile(r'(?:Detailed\s+)?Solution:?\s*([\s\S]*?)(?=\n\d+\.|$)', re.IGNORECASE)
        }

    def parse_markdown_content(self, content):
        exam_info = self.extract_exam_info(content)
        questions = self.extract_questions(content)
        
        return {
            'examInfo': exam_info,
            'questions': questions,
            'totalQuestions': len(questions)
        }

    def extract_exam_info(self, content):
        title_match = re.search(r'^#+\s*(.+?)(?:\n|$)', content, re.MULTILINE)
        year_match = re.search(r'(\d{4})', content)
        subject_match = re.search(r'(?:MATHEMATICS|PHYSICS|CHEMISTRY|Mathematics|Physics|Chemistry)', content, re.IGNORECASE)
        time_match = re.search(r'Time:\s*([^\n]+)', content, re.IGNORECASE)
        marks_match = re.search(r'M\.M\s*:\s*(\d+)', content, re.IGNORECASE)
        
        subject = 'Mixed'
        if 'MATHEMATICS' in content.upper() or 'Mathematics' in content:
            subject = 'Mathematics'
        elif 'PHYSICS' in content.upper() or 'Physics' in content:
            subject = 'Physics'
        elif 'CHEMISTRY' in content.upper() or 'Chemistry' in content:
            subject = 'Chemistry'
        
        return {
            'title': title_match.group(1).strip() if title_match else 'Exam Paper',
            'year': year_match.group(1) if year_match else str(datetime.now().year),
            'subject': subject,
            'time': time_match.group(1).strip() if time_match else '3 hours',
            'maxMarks': marks_match.group(1) if marks_match else '300',
            'totalQuestions': self.count_questions(content)
        }

    def count_questions(self, content):
        patterns = [
            re.compile(r'^\d+\.\s', re.MULTILINE),
            re.compile(r'^\((\d+)\)\s', re.MULTILINE),
            re.compile(r'^[A-Z]\.\s', re.MULTILINE)
        ]
        
        max_count = 0
        for pattern in patterns:
            matches = pattern.findall(content)
            if len(matches) > max_count:
                max_count = len(matches)
        
        return max_count

    def extract_questions(self, content):
        questions = []
        question_matches = self.find_question_matches(content)
        
        for index, match in enumerate(question_matches):
            question = self.parse_question(match, index + 1)
            if question:
                questions.append(question)
        
        return questions

    def find_question_matches(self, content):
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
        matches.sort(key=lambda x: int(x['number']))
        return matches

    def parse_question(self, match, question_index):
        try:
            question_text = self.extract_question_text(match['content'])
            options = self.extract_options(match['content'])
            correct_answer = self.extract_correct_answer(match['content'])
            solution = self.extract_solution(match['content'])
            images = self.extract_images(match['content'])
            subject = self.determine_subject(question_text)
            marks = self.extract_marks(match['content'])
            
            return {
                'questionIndex': str(question_index),
                'questionId': f'Q{question_index}',
                'questionDetails': [{
                    'text': question_text,
                    'textImages': images,
                    'possibleAnswers': options,
                    'correctAnswer': correct_answer,
                    'correctAnswerText': options.get(correct_answer, {}).get('text', '')
                }],
                'subject': subject,
                'solution': solution,
                'marks': marks
            }
        except Exception as error:
            print(f"Error parsing question {question_index}: {error}")
            return None

    def extract_question_text(self, content):
        question_text = content
        
        # Remove answer and solution sections (but keep options for now)
        question_text = re.sub(r'Ans\.\s*[\(]?[A-D1-4][\)]?[\s\S]*$', '', question_text, flags=re.IGNORECASE)
        question_text = re.sub(r'Answer:\s*[A-D1-4][\s\S]*$', '', question_text, flags=re.IGNORECASE)
        question_text = re.sub(r'Sol\.[\s\S]*$', '', question_text, flags=re.IGNORECASE)
        question_text = re.sub(r'Solution:[\s\S]*$', '', question_text, flags=re.IGNORECASE)
        
        # Now remove the options to get just the question text
        question_text = re.sub(r'\([1-4]\)[\s\S]*?(?=Ans\.|$)', '', question_text)
        question_text = re.sub(r'[A-D]\)[\s\S]*?(?=Ans\.|$)', '', question_text)
        question_text = re.sub(r'\d+\.\s*[^0-9][\s\S]*?(?=Ans\.|$)', '', question_text)
        
        # Clean up markdown formatting
        question_text = self.clean_markdown(question_text)
        
        return question_text.strip()

    def extract_options(self, content):
        options = {}
        
        # Try different option patterns
        patterns = [
            # Pattern 1: (1) option text (2) option text (3) option text (4) option text
            {'regex': re.compile(r'\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|Sol\.|$)', re.MULTILINE), 'letter_map': lambda n: chr(64 + int(n))},
            # Pattern 2: A) option text B) option text C) option text D) option text
            {'regex': re.compile(r'([A-D])\)\s*([^A-D\)]*?)(?=[A-D]\)|Ans\.|Sol\.|$)', re.MULTILINE), 'letter_map': lambda n: n},
            # Pattern 3: 1. option text 2. option text 3. option text 4. option text
            {'regex': re.compile(r'(\d+)\.\s*([^0-9]*?)(?=\d+\.|Ans\.|Sol\.|$)', re.MULTILINE), 'letter_map': lambda n: chr(64 + int(n))}
        ]
        
        for pattern in patterns:
            for match in pattern['regex'].finditer(content):
                option_number = match.group(1)
                option_text = match.group(2).strip()
                
                # Clean up markdown in option text
                option_text = self.clean_markdown(option_text)
                
                if option_text and len(option_text) > 0:
                    option_letter = pattern['letter_map'](option_number)
                    options[option_letter] = {
                        'text': option_text,
                        'image': None
                    }
        
        return options

    def extract_correct_answer(self, content):
        for pattern in self.answer_patterns.values():
            match = pattern.search(content)
            if match:
                answer = match.group(1).upper()
                # Convert number to letter if needed
                if answer >= '1' and answer <= '4':
                    answer = chr(64 + int(answer))
                return answer
        return 'A'

    def extract_solution(self, content):
        for pattern in self.solution_patterns.values():
            match = pattern.search(content)
            if match:
                solution = match.group(1).strip()
                solution = self.clean_markdown(solution)
                return solution
        return ''

    def extract_marks(self, content):
        marks_patterns = [
            re.compile(r'(\d+)\s*\/\s*-?\d+'),
            re.compile(r'\+(\d+)'),
            re.compile(r'(\d+)\s*marks?', re.IGNORECASE)
        ]
        
        for pattern in marks_patterns:
            match = pattern.search(content)
            if match:
                return match.group(1)
        return '4'

    def extract_images(self, content):
        images = []
        
        # Markdown image syntax: ![alt](src)
        markdown_images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', content)
        for match in markdown_images:
            images.append({
                'src': match[1],
                'alt': match[0] or 'Question image',
                'type': 'markdown'
            })
        
        # HTML img tags: <img src="..." alt="...">
        html_images = re.findall(r'<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>', content, re.IGNORECASE)
        for match in html_images:
            images.append({
                'src': match[0],
                'alt': match[1] or 'Question image',
                'type': 'html'
            })
        
        # LaTeX includegraphics: \includegraphics{...}
        latex_images = re.findall(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}', content)
        for match in latex_images:
            images.append({
                'src': match,
                'alt': 'Question image',
                'type': 'latex'
            })
        
        return images

    def determine_subject(self, question_text):
        lower_text = question_text.lower()
        
        # Mathematics keywords
        math_keywords = [
            'mathematics', 'math', 'algebra', 'calculus', 'geometry', 'trigonometry',
            'function', 'derivative', 'integral', 'limit', 'matrix', 'vector',
            'equation', 'polynomial', 'quadratic', 'logarithm', 'exponential',
            'triangle', 'circle', 'parabola', 'hyperbola', 'ellipse', 'coordinate',
            'probability', 'statistics', 'permutation', 'combination', 'binomial'
        ]
        
        # Physics keywords
        physics_keywords = [
            'physics', 'force', 'energy', 'wave', 'electric', 'magnetic', 'optics',
            'mechanics', 'thermodynamics', 'quantum', 'atom', 'electron', 'proton',
            'neutron', 'nucleus', 'radioactive', 'circuit', 'current', 'voltage',
            'resistance', 'capacitor', 'inductor', 'momentum', 'acceleration',
            'velocity', 'displacement', 'frequency', 'wavelength', 'amplitude',
            'reflection', 'refraction', 'lens', 'mirror', 'prism', 'interference'
        ]
        
        # Chemistry keywords
        chemistry_keywords = [
            'chemistry', 'molecule', 'atom', 'reaction', 'compound', 'element',
            'acid', 'base', 'salt', 'bond', 'organic', 'inorganic', 'carbon',
            'hydrogen', 'oxygen', 'nitrogen', 'sulfur', 'chlorine', 'bromine',
            'iodine', 'alkali', 'metal', 'non-metal', 'catalyst', 'equilibrium',
            'oxidation', 'reduction', 'electrolysis', 'polymer', 'isomer',
            'functional group', 'alcohol', 'ketone', 'aldehyde', 'ester'
        ]
        
        math_count = sum(1 for keyword in math_keywords if keyword in lower_text)
        physics_count = sum(1 for keyword in physics_keywords if keyword in lower_text)
        chemistry_count = sum(1 for keyword in chemistry_keywords if keyword in lower_text)
        
        if math_count > physics_count and math_count > chemistry_count:
            return 'Mathematics'
        if physics_count > math_count and physics_count > chemistry_count:
            return 'Physics'
        if chemistry_count > math_count and chemistry_count > physics_count:
            return 'Chemistry'
        
        return 'Mixed'

    def clean_markdown(self, text):
        # Convert math delimiters to MathJax format
        text = re.sub(r'\$\$([\s\S]*?)\$\$', r'$$\1$$', text)
        text = re.sub(r'\$([^$]+)\$', r'$\1$', text)
        
        # Convert LaTeX fractions to readable format
        text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', text)
        
        # Convert superscripts and subscripts
        text = re.sub(r'\^([^{}\s]+)', r'^\1', text)
        text = re.sub(r'_([^{}\s]+)', r'_\1', text)
        
        # Convert LaTeX symbols
        text = self.convert_latex_symbols(text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()

    def convert_latex_symbols(self, text):
        conversions = {
            '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
            '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
            '\\pi': 'π', '\\sigma': 'σ', '\\tau': 'τ', '\\phi': 'φ', '\\omega': 'ω',
            '\\infty': '∞', '\\sum': 'Σ', '\\int': '∫', '\\sqrt': '√',
            '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
            '\\pm': '±', '\\times': '×', '\\div': '÷', '\\rightarrow': '→',
            '\\leftarrow': '←', '\\Rightarrow': '⇒', '\\Leftarrow': '⇐',
            '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
            '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\forall': '∀',
            '\\exists': '∃', '\\leftrightarrow': '↔'
        }
        
        result = text
        for latex, symbol in conversions.items():
            result = result.replace(latex, symbol)
        
        return result

    def generate_json(self, exam_info, questions):
        return {
            'tutorialId': f"{exam_info['subject']}_{exam_info['year']}_{int(datetime.now().timestamp())}",
            'tutorialTitle': exam_info['title'],
            'tutorialDescription': f"{exam_info['subject']} {exam_info['year']} Question Paper with Solutions",
            'authorityExamId': "custom_exam",
            'state': "All India",
            'board': exam_info['subject'],
            'conductedBy': "Custom Authority",
            'year': exam_info['year'],
            'subject': exam_info['subject'],
            'totalQuestions': len(questions),
            'time': exam_info['time'],
            'maxMarks': exam_info['maxMarks'],
            'questions': questions
        }

def test_parser():
    try:
        parser = SophisticatedMarkdownParser()
        
        # Read the markdown file
        markdown_path = '/Users/chethanhulivanaboranna/Downloads/eadfb6e8-b01b-46c3-b613-9599221ed8de.md'
        with open(markdown_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print('📄 Testing markdown parser...')
        print(f'📏 File size: {len(content) / 1024:.2f} KB')
        
        # Parse the content
        result = parser.parse_markdown_content(content)
        
        print('\n📊 Parsing Results:')
        print(f'📚 Title: {result["examInfo"]["title"]}')
        print(f'📅 Year: {result["examInfo"]["year"]}')
        print(f'🔬 Subject: {result["examInfo"]["subject"]}')
        print(f'⏰ Time: {result["examInfo"]["time"]}')
        print(f'📝 Max Marks: {result["examInfo"]["maxMarks"]}')
        print(f'❓ Total Questions: {len(result["questions"])}')
        
        # Show first few questions
        print('\n🔍 Sample Questions:')
        for i, question in enumerate(result["questions"][:3]):
            print(f'\nQ{i + 1}: {question["questionDetails"][0]["text"][:100]}...')
            print(f'   Subject: {question["subject"]}')
            print(f'   Options: {len(question["questionDetails"][0]["possibleAnswers"])}')
            print(f'   Correct: {question["questionDetails"][0]["correctAnswer"]}')
            print(f'   Images: {len(question["questionDetails"][0]["textImages"])}')
        
        # Generate JSON
        json_output = parser.generate_json(result["examInfo"], result["questions"])
        
        # Save JSON to file
        json_path = '/Volumes/Data/PrepBharatWeb/test_output.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_output, f, indent=2, ensure_ascii=False)
        print(f'\n💾 JSON saved to: {json_path}')
        
        print('\n✅ Test completed successfully!')
        
    except Exception as error:
        print(f'❌ Test failed: {error}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_parser()
