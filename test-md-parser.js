// Test script for the sophisticated markdown parser
const fs = require('fs');
const path = require('path');

// Import the parser (we'll need to modify it for Node.js)
class SophisticatedMarkdownParser {
    constructor() {
        this.mathPatterns = {
            // Math delimiters
            displayMath: /\$\$([\s\S]*?)\$\$/g,
            inlineMath: /\$([^$]+)\$/g,
            // LaTeX commands
            commands: /\\[a-zA-Z]+\{[^}]*\}/g,
            // Fractions
            fractions: /\\frac\{([^}]+)\}\{([^}]+)\}/g,
            // Superscripts and subscripts
            superscript: /\^([^{}\s]+)/g,
            subscript: /_([^{}\s]+)/g,
            // Greek letters
            greek: /\\[a-zA-Z]+/g,
            // Matrices
            matrix: /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g
        };
        
        this.questionPatterns = {
            // Various question number formats
            numbered: /^(\d+)\.\s*(.+?)(?=\n\d+\.|$)/gms,
            // Lettered questions
            lettered: /^([A-Z])\.\s*(.+?)(?=\n[A-Z]\.|$)/gms,
            // Parenthesized
            parenthesized: /^\((\d+)\)\s*(.+?)(?=\n\(\d+\)|$)/gms
        };
        
        this.optionPatterns = {
            // (1) to (4) format
            numbered: /\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|$)/g,
            // A) to D) format
            lettered: /([A-D])\)\s*([^A-D\)]*?)(?=[A-D]\)|Ans\.|$)/g,
            // 1. to 4. format
            dotted: /(\d+)\.\s*([^0-9]*?)(?=\d+\.|Ans\.|$)/g
        };
        
        this.answerPatterns = {
            // Ans. (1), Ans. (A), etc.
            answer: /Ans\.\s*[\(]?([A-D1-4])[\)]?/i,
            // Answer: 1, Answer: A, etc.
            answerColon: /Answer:\s*([A-D1-4])/i,
            // Correct answer is 1, etc.
            correctAnswer: /Correct\s+answer\s+is\s+([A-D1-4])/i
        };
        
        this.solutionPatterns = {
            // Sol., Solution:, Explanation:
            solution: /(?:Sol\.|Solution:|Explanation:)\s*([\s\S]*?)(?=\n\d+\.|$)/i,
            // Detailed solution
            detailedSolution: /(?:Detailed\s+)?Solution:?\s*([\s\S]*?)(?=\n\d+\.|$)/i
        };
    }

    parseMarkdownContent(content) {
        const examInfo = this.extractExamInfo(content);
        const questions = this.extractQuestions(content);
        
        return {
            examInfo,
            questions,
            totalQuestions: questions.length
        };
    }

    extractExamInfo(content) {
        const titleMatch = content.match(/^#+\s*(.+?)(?:\n|$)/m);
        const yearMatch = content.match(/(\d{4})/);
        const subjectMatch = content.match(/(?:MATHEMATICS|PHYSICS|CHEMISTRY|Mathematics|Physics|Chemistry)/i);
        const timeMatch = content.match(/Time:\s*([^\n]+)/i);
        const marksMatch = content.match(/M\.M\s*:\s*(\d+)/i);
        
        let subject = 'Mixed';
        if (content.includes('MATHEMATICS') || content.includes('Mathematics')) subject = 'Mathematics';
        else if (content.includes('PHYSICS') || content.includes('Physics')) subject = 'Physics';
        else if (content.includes('CHEMISTRY') || content.includes('Chemistry')) subject = 'Chemistry';
        
        return {
            title: titleMatch ? titleMatch[1].trim() : 'Exam Paper',
            year: yearMatch ? yearMatch[1] : new Date().getFullYear().toString(),
            subject: subject,
            time: timeMatch ? timeMatch[1].trim() : '3 hours',
            maxMarks: marksMatch ? marksMatch[1] : '300',
            totalQuestions: this.countQuestions(content)
        };
    }

    countQuestions(content) {
        // Count various question number patterns
        const patterns = [
            /^\d+\.\s/gm,
            /^\((\d+)\)\s/gm,
            /^[A-Z]\.\s/gm
        ];
        
        let maxCount = 0;
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches && matches.length > maxCount) {
                maxCount = matches.length;
            }
        });
        
        return maxCount;
    }

    extractQuestions(content) {
        const questions = [];
        
        // Try different question patterns
        const questionMatches = this.findQuestionMatches(content);
        
        questionMatches.forEach((match, index) => {
            const question = this.parseQuestion(match, index + 1);
            if (question) {
                questions.push(question);
            }
        });
        
        return questions;
    }

    findQuestionMatches(content) {
        const matches = [];
        
        // Pattern 1: Numbered questions (1. 2. 3.)
        const numberedMatches = [...content.matchAll(/^(\d+)\.\s*([\s\S]*?)(?=^\d+\.|$)/gm)];
        numberedMatches.forEach(match => {
            matches.push({
                number: match[1],
                content: match[2].trim(),
                type: 'numbered'
            });
        });
        
        // Pattern 2: Parenthesized questions ((1) (2) (3))
        const parenthesizedMatches = [...content.matchAll(/^\((\d+)\)\s*([\s\S]*?)(?=^\(\d+\)|$)/gm)];
        parenthesizedMatches.forEach(match => {
            matches.push({
                number: match[1],
                content: match[2].trim(),
                type: 'parenthesized'
            });
        });
        
        // Pattern 3: Lettered questions (A. B. C.)
        const letteredMatches = [...content.matchAll(/^([A-Z])\.\s*([\s\S]*?)(?=^[A-Z]\.|$)/gm)];
        letteredMatches.forEach(match => {
            matches.push({
                number: match[1],
                content: match[2].trim(),
                type: 'lettered'
            });
        });
        
        // Sort by question number
        return matches.sort((a, b) => {
            const numA = parseInt(a.number) || a.number.charCodeAt(0);
            const numB = parseInt(b.number) || b.number.charCodeAt(0);
            return numA - numB;
        });
    }

    parseQuestion(match, questionIndex) {
        try {
            const questionText = this.extractQuestionText(match.content);
            const options = this.extractOptions(match.content);
            const correctAnswer = this.extractCorrectAnswer(match.content);
            const solution = this.extractSolution(match.content);
            const images = this.extractImages(match.content);
            const subject = this.determineSubject(questionText);
            const marks = this.extractMarks(match.content);
            
            return {
                questionIndex: questionIndex.toString(),
                questionId: `Q${questionIndex}`,
                questionDetails: [{
                    text: questionText,
                    textImages: images,
                    possibleAnswers: options,
                    correctAnswer: correctAnswer,
                    correctAnswerText: options[correctAnswer]?.text || ''
                }],
                subject: subject,
                solution: solution,
                marks: marks
            };
        } catch (error) {
            console.error(`Error parsing question ${questionIndex}:`, error);
            return null;
        }
    }

    extractQuestionText(content) {
        let questionText = content;
        
        // Remove answer options
        questionText = questionText.replace(/\([1-4]\)[\s\S]*?(?=Ans\.|$)/g, '');
        questionText = questionText.replace(/[A-D]\)[\s\S]*?(?=Ans\.|$)/g, '');
        questionText = questionText.replace(/\d+\.\s*[^0-9][\s\S]*?(?=Ans\.|$)/g, '');
        
        // Remove answer and solution
        questionText = questionText.replace(/Ans\.\s*[\(]?[A-D1-4][\)]?[\s\S]*$/i, '');
        questionText = questionText.replace(/Answer:\s*[A-D1-4][\s\S]*$/i, '');
        questionText = questionText.replace(/Sol\.[\s\S]*$/i, '');
        questionText = questionText.replace(/Solution:[\s\S]*$/i, '');
        
        // Clean up markdown formatting
        questionText = this.cleanMarkdown(questionText);
        
        return questionText.trim();
    }

    extractOptions(content) {
        const options = {};
        
        // Try different option patterns
        const patterns = [
            { regex: /\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|$)/g, letterMap: (n) => String.fromCharCode(64 + parseInt(n)) },
            { regex: /([A-D])\)\s*([^A-D\)]*?)(?=[A-D]\)|Ans\.|$)/g, letterMap: (n) => n },
            { regex: /(\d+)\.\s*([^0-9]*?)(?=\d+\.|Ans\.|$)/g, letterMap: (n) => String.fromCharCode(64 + parseInt(n)) }
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
                const optionNumber = match[1];
                let optionText = match[2].trim();
                
                // Clean up markdown in option text
                optionText = this.cleanMarkdown(optionText);
                
                if (optionText && optionText.length > 0) {
                    const optionLetter = pattern.letterMap(optionNumber);
                    options[optionLetter] = {
                        text: optionText,
                        image: null
                    };
                }
            }
        });
        
        return options;
    }

    extractCorrectAnswer(content) {
        for (const pattern of Object.values(this.answerPatterns)) {
            const match = content.match(pattern);
            if (match) {
                let answer = match[1].toUpperCase();
                // Convert number to letter if needed
                if (answer >= '1' && answer <= '4') {
                    answer = String.fromCharCode(64 + parseInt(answer));
                }
                return answer;
            }
        }
        return 'A';
    }

    extractSolution(content) {
        for (const pattern of Object.values(this.solutionPatterns)) {
            const match = content.match(pattern);
            if (match) {
                let solution = match[1].trim();
                solution = this.cleanMarkdown(solution);
                return solution;
            }
        }
        return '';
    }

    extractMarks(content) {
        // Look for marks pattern like "4 / -1", "+4", "4 marks"
        const marksPatterns = [
            /(\d+)\s*\/\s*-?\d+/,
            /\+(\d+)/,
            /(\d+)\s*marks?/i
        ];
        
        for (const pattern of marksPatterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return '4';
    }

    extractImages(content) {
        const images = [];
        
        // Markdown image syntax: ![alt](src)
        const markdownImages = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        markdownImages.forEach(match => {
            images.push({
                src: match[2],
                alt: match[1] || 'Question image',
                type: 'markdown'
            });
        });
        
        // HTML img tags: <img src="..." alt="...">
        const htmlImages = [...content.matchAll(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi)];
        htmlImages.forEach(match => {
            images.push({
                src: match[1],
                alt: match[2] || 'Question image',
                type: 'html'
            });
        });
        
        // LaTeX includegraphics: \includegraphics{...}
        const latexImages = [...content.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g)];
        latexImages.forEach(match => {
            images.push({
                src: match[1],
                alt: 'Question image',
                type: 'latex'
            });
        });
        
        return images;
    }

    determineSubject(questionText) {
        const lowerText = questionText.toLowerCase();
        
        // Mathematics keywords
        const mathKeywords = [
            'mathematics', 'math', 'algebra', 'calculus', 'geometry', 'trigonometry',
            'function', 'derivative', 'integral', 'limit', 'matrix', 'vector',
            'equation', 'polynomial', 'quadratic', 'logarithm', 'exponential',
            'triangle', 'circle', 'parabola', 'hyperbola', 'ellipse', 'coordinate',
            'probability', 'statistics', 'permutation', 'combination', 'binomial'
        ];
        
        // Physics keywords
        const physicsKeywords = [
            'physics', 'force', 'energy', 'wave', 'electric', 'magnetic', 'optics',
            'mechanics', 'thermodynamics', 'quantum', 'atom', 'electron', 'proton',
            'neutron', 'nucleus', 'radioactive', 'circuit', 'current', 'voltage',
            'resistance', 'capacitor', 'inductor', 'momentum', 'acceleration',
            'velocity', 'displacement', 'frequency', 'wavelength', 'amplitude',
            'reflection', 'refraction', 'lens', 'mirror', 'prism', 'interference'
        ];
        
        // Chemistry keywords
        const chemistryKeywords = [
            'chemistry', 'molecule', 'atom', 'reaction', 'compound', 'element',
            'acid', 'base', 'salt', 'bond', 'organic', 'inorganic', 'carbon',
            'hydrogen', 'oxygen', 'nitrogen', 'sulfur', 'chlorine', 'bromine',
            'iodine', 'alkali', 'metal', 'non-metal', 'catalyst', 'equilibrium',
            'oxidation', 'reduction', 'electrolysis', 'polymer', 'isomer',
            'functional group', 'alcohol', 'ketone', 'aldehyde', 'ester'
        ];
        
        const mathCount = mathKeywords.filter(keyword => lowerText.includes(keyword)).length;
        const physicsCount = physicsKeywords.filter(keyword => lowerText.includes(keyword)).length;
        const chemistryCount = chemistryKeywords.filter(keyword => lowerText.includes(keyword)).length;
        
        if (mathCount > physicsCount && mathCount > chemistryCount) return 'Mathematics';
        if (physicsCount > mathCount && physicsCount > chemistryCount) return 'Physics';
        if (chemistryCount > mathCount && chemistryCount > physicsCount) return 'Chemistry';
        
        return 'Mixed';
    }

    cleanMarkdown(text) {
        // Convert math delimiters to MathJax format
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$$$$1$$');
        text = text.replace(/\$([^$]+)\$/g, '$$1$');
        
        // Convert LaTeX fractions to readable format
        text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
        
        // Convert superscripts and subscripts
        text = text.replace(/\^([^{}\s]+)/g, '^$1');
        text = text.replace(/_([^{}\s]+)/g, '_$1');
        
        // Convert LaTeX symbols
        text = this.convertLatexSymbols(text);
        
        // Remove excessive whitespace
        text = text.replace(/\s+/g, ' ');
        
        return text.trim();
    }

    convertLatexSymbols(text) {
        const conversions = {
            '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
            '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
            '\\pi': 'π', '\\sigma': 'σ', '\\tau': 'τ', '\\phi': 'φ', '\\omega': 'ω',
            '\\infty': '∞', '\\sum': 'Σ', '\\int': '∫', '\\sqrt': '√',
            '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
            '\\pm': '±', '\\times': '×', '\\div': '÷', '\\rightarrow': '→',
            '\\leftarrow': '←', '\\Rightarrow': '⇒', '\\Leftarrow': '⇐',
            '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
            '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\forall': '∀',
            '\\exists': '∃', '\\rightarrow': '→', '\\leftrightarrow': '↔'
        };
        
        let result = text;
        Object.entries(conversions).forEach(([latex, symbol]) => {
            result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), symbol);
        });
        
        return result;
    }

    generateJSON(examInfo, questions) {
        return {
            tutorialId: `${examInfo.subject}_${examInfo.year}_${Date.now()}`,
            tutorialTitle: examInfo.title,
            tutorialDescription: `${examInfo.subject} ${examInfo.year} Question Paper with Solutions`,
            authorityExamId: "custom_exam",
            state: "All India",
            board: examInfo.subject,
            conductedBy: "Custom Authority",
            year: examInfo.year,
            subject: examInfo.subject,
            totalQuestions: questions.length,
            time: examInfo.time,
            maxMarks: examInfo.maxMarks,
            questions: questions
        };
    }
}

// Test the parser
async function testParser() {
    try {
        const parser = new SophisticatedMarkdownParser();
        
        // Read the markdown file
        const markdownPath = '/Users/chethanhulivanaboranna/Downloads/eadfb6e8-b01b-46c3-b613-9599221ed8de.md';
        const content = fs.readFileSync(markdownPath, 'utf8');
        
        console.log('📄 Testing markdown parser...');
        console.log(`📏 File size: ${(content.length / 1024).toFixed(2)} KB`);
        
        // Parse the content
        const result = parser.parseMarkdownContent(content);
        
        console.log('\n📊 Parsing Results:');
        console.log(`📚 Title: ${result.examInfo.title}`);
        console.log(`📅 Year: ${result.examInfo.year}`);
        console.log(`🔬 Subject: ${result.examInfo.subject}`);
        console.log(`⏰ Time: ${result.examInfo.time}`);
        console.log(`📝 Max Marks: ${result.examInfo.maxMarks}`);
        console.log(`❓ Total Questions: ${result.questions.length}`);
        
        // Show first few questions
        console.log('\n🔍 Sample Questions:');
        result.questions.slice(0, 3).forEach((question, index) => {
            console.log(`\nQ${index + 1}: ${question.questionDetails[0].text.substring(0, 100)}...`);
            console.log(`   Subject: ${question.subject}`);
            console.log(`   Options: ${Object.keys(question.questionDetails[0].possibleAnswers).length}`);
            console.log(`   Correct: ${question.questionDetails[0].correctAnswer}`);
            console.log(`   Images: ${question.questionDetails[0].textImages.length}`);
        });
        
        // Generate JSON
        const jsonOutput = parser.generateJSON(result.examInfo, result.questions);
        
        // Save JSON to file
        const jsonPath = '/Volumes/Data/PrepBharatWeb/test_output.json';
        fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
        console.log(`\n💾 JSON saved to: ${jsonPath}`);
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testParser();


