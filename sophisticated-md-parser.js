// Sophisticated Markdown Parser for Educational Content
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
            // Match from "Sol." until next question (line starting with number followed by dot)
            // Example: captures from "Sol." until it sees "3." at the start of a line
            solution: /Sol\.\s*([\s\S]*?)(?=\n\d+\.\s|\n\d+\.|$)/m,
            // Alternative: Solution: followed by content
            solutionColon: /Solution:\s*([\s\S]*?)(?=\n\d+\.\s|\n\d+\.|$)/m,
            // Alternative: Explanation: followed by content
            explanation: /Explanation:\s*([\s\S]*?)(?=\n\d+\.\s|\n\d+\.|$)/m
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
        
        // Split content by lines and process each line
        const lines = content.split('\n');
        let currentQuestion = null;
        let currentSection = 'Mixed'; // Default section
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for section headers (only subject sections, not subsection headers)
            const sectionMatch = line.match(/\\section\*\{([^}]+)\}/);
            if (sectionMatch) {
                const sectionName = sectionMatch[1].toUpperCase();
                console.log(`Found section header: "${sectionName}" on line ${i+1}`);
                
                // Only process main subject sections, not subsection headers like "SECTION-A"
                if (sectionName === 'MATHEMATICS' || sectionName === 'MATH') {
                    currentSection = 'Mathematics';
                    console.log(`Set section to: ${currentSection}`);
                } else if (sectionName === 'PHYSICS') {
                    currentSection = 'Physics';
                    console.log(`Set section to: ${currentSection}`);
                } else if (sectionName === 'CHEMISTRY') {
                    currentSection = 'Chemistry';
                    console.log(`Set section to: ${currentSection}`);
                } else {
                    console.log(`Unknown section: ${sectionName}`);
                }
                // Skip processing this line as a question
                continue;
            }
            
            // Check if this line starts with a number followed by a dot (new question)
            const questionMatch = line.match(/^(\d+)\.\s*(.*)/);
            
            if (questionMatch) {
                console.log(`Found question ${questionMatch[1]} in section: ${currentSection}`);
                
                // Save previous question if it exists
                if (currentQuestion) {
                    const questionContent = currentQuestion.content.trim();
                    console.log(`Saving previous question ${currentQuestion.number} with section: ${currentQuestion.section}`);
                    
                    // Only include if it looks like a real question
                    if (/\([1-4]\)|Ans\.|Sol\.|Given\s*:|Assume\s*:|The\s+\w+\s+is|Find\s+the|Calculate\s+the|Determine\s+the|What\s+is|How\s+many|Which\s+of\s+the|Consider\s+the/.test(questionContent)) {
                        matches.push({
                            number: currentQuestion.number,
                            content: questionContent,
                            section: currentQuestion.section,
                            type: 'numbered'
                        });
                        console.log(`Added question ${currentQuestion.number} to ${currentQuestion.section} section`);
                    }
                }
                
                // Start new question with the CURRENT section
                currentQuestion = {
                    number: questionMatch[1],
                    content: questionMatch[2] + '\n',
                    section: currentSection
                };
                console.log(`Started new question ${questionMatch[1]} in section: ${currentSection}`);
            } else if (currentQuestion) {
                // Add this line to current question content
                currentQuestion.content += line + '\n';
            }
        }
        
        // Don't forget the last question
        if (currentQuestion) {
            const questionContent = currentQuestion.content.trim();
            console.log(`Processing final question ${currentQuestion.number} with section: ${currentQuestion.section}`);
            
            // Only include if it looks like a real question
            if (/\([1-4]\)|Ans\.|Sol\.|Given\s*:|Assume\s*:|The\s+\w+\s+is|Find\s+the|Calculate\s+the|Determine\s+the|What\s+is|How\s+many|Which\s+of\s+the|Consider\s+the/.test(questionContent)) {
                matches.push({
                    number: currentQuestion.number,
                    content: questionContent,
                    section: currentQuestion.section,
                    type: 'numbered'
                });
                console.log(`Added final question ${currentQuestion.number} to ${currentQuestion.section} section`);
            }
        }
        
        // Sort by question number
        return matches.sort((a, b) => {
            const numA = parseInt(a.number);
            const numB = parseInt(b.number);
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
            
            // Use section from match if available, otherwise fall back to number-based or keyword-based classification
            let subject;
            if (match.section && match.section !== 'Mixed') {
                subject = match.section;
            } else {
                subject = this.determineSubject(questionText, match.number);
            }
            
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
        
        // Remove answer and solution sections first
        questionText = questionText.replace(/Ans\.\s*[\(]?[A-D1-4][\)]?[\s\S]*$/i, '');
        questionText = questionText.replace(/Answer:\s*[A-D1-4][\s\S]*$/i, '');
        questionText = questionText.replace(/Sol\.[\s\S]*$/i, '');
        questionText = questionText.replace(/Solution:[\s\S]*$/i, '');
        
        // Now remove the options more carefully - stop at the first option
        // Look for patterns like (1), (2), (3), (4) or A), B), C), D)
        // But be careful not to match math expressions
        const optionMatch = questionText.match(/\n\s*(\([1-4]\)|[A-D]\))/);
        if (optionMatch) {
            questionText = questionText.substring(0, optionMatch.index);
        }
        
        // Clean up markdown formatting
        questionText = this.cleanMarkdown(questionText);
        
        return questionText.trim();
    }

    extractOptions(content) {
        const options = {};
        
        // Check if this is a numerical answer question (no traditional options)
        if (!/\([1-4]\)|\([A-D]\)|\([A-D]\)|\([A-D]\.|^\d+\.\s*[^0-9]/.test(content)) {
            // This might be a numerical answer question, return empty options
            return options;
        }
        
        // Try different option patterns in order of specificity
        const patterns = [
            // Pattern 1: (1) option text (2) option text (3) option text (4) option text
            { 
                regex: /\((\d+)\)\s*([^\n]*?)(?=\n\s*\(\d+\)|\n\s*Ans\.|\n\s*Sol\.|$)/g, 
                letterMap: (n) => String.fromCharCode(64 + parseInt(n)),
                validate: (n) => parseInt(n) >= 1 && parseInt(n) <= 4
            },
            // Pattern 2: A) option text B) option text C) option text D) option text
            { 
                regex: /([A-D])\)\s*([^\n]*?)(?=\n\s*[A-D]\)|\n\s*Ans\.|\n\s*Sol\.|$)/g, 
                letterMap: (n) => n,
                validate: (n) => ['A', 'B', 'C', 'D'].includes(n)
            },
            // Pattern 3: (A) option text (B) option text (C) option text (D) option text
            { 
                regex: /\(([A-D])\)\s*([^\n]*?)(?=\n\s*\([A-D]\)|\n\s*Ans\.|\n\s*Sol\.|$)/g, 
                letterMap: (n) => n,
                validate: (n) => ['A', 'B', 'C', 'D'].includes(n)
            },
            // Pattern 4: A. option text B. option text C. option text D. option text
            { 
                regex: /([A-D])\.\s*([^\n]*?)(?=\n\s*[A-D]\.|\n\s*Ans\.|\n\s*Sol\.|$)/g, 
                letterMap: (n) => n,
                validate: (n) => ['A', 'B', 'C', 'D'].includes(n)
            },
            // Pattern 5: 1. option text 2. option text 3. option text 4. option text
            { 
                regex: /(\d+)\.\s*([^\n]*?)(?=\n\s*\d+\.|\n\s*Ans\.|\n\s*Sol\.|$)/g, 
                letterMap: (n) => String.fromCharCode(64 + parseInt(n)),
                validate: (n) => parseInt(n) >= 1 && parseInt(n) <= 4
            },
            // Pattern 6: Same line options (1) text (2) text (3) text (4) text
            { 
                regex: /\((\d+)\)\s*([^(]*?)(?=\(\d+\)|$)/g, 
                letterMap: (n) => String.fromCharCode(64 + parseInt(n)),
                validate: (n) => parseInt(n) >= 1 && parseInt(n) <= 4
            },
            // Pattern 7: Same line A) text B) text C) text D) text
            { 
                regex: /([A-D])\)\s*([^A-D)]*?)(?=[A-D]\)|$)/g, 
                letterMap: (n) => n,
                validate: (n) => ['A', 'B', 'C', 'D'].includes(n)
            }
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
                const optionNumber = match[1];
                let optionText = match[2].trim();
                
                // Validate option number/letter
                if (!pattern.validate(optionNumber)) {
                    continue;
                }
                
                // Clean up markdown in option text
                optionText = this.cleanMarkdown(optionText);
                
                // Remove any trailing "Ans." or "Sol." that might have been captured
                optionText = optionText.replace(/\s+(Ans\.|Sol\.).*$/, '').trim();
                
                // Additional validation: option text should not be too long (likely question text)
                if (optionText && optionText.length > 0 && optionText.length < 200) {
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
                
                // Remove any markdown headers or unwanted text that might have slipped through
                solution = solution.split('\n')
                    .filter(line => {
                        const trimmedLine = line.trim();
                        // Skip lines with "TEST PAPER WITH SOLUTION"
                        if (/TEST\s+PAPER\s+WITH\s+SOLUTION/i.test(trimmedLine)) return false;
                        // Skip markdown headers
                        if (/^#{1,6}\s/.test(trimmedLine)) return false;
                        return true;
                    })
                    .join('\n');
                
                // Clean up whitespace
                solution = solution.replace(/\n{3,}/g, '\n\n').trim();
                
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

    determineSubject(questionText, questionNumber) {
        // Use question number for classification if available
        if (questionNumber) {
            const num = parseInt(questionNumber);
            if (num >= 1 && num <= 25) return 'Physics';
            if (num >= 26 && num <= 50) return 'Chemistry';
            if (num >= 51 && num <= 75) return 'Mathematics';
        }
        
        // Fallback to keyword-based classification
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
        // Preserve MathJax notation - don't convert math delimiters
        // Keep $...$ and $$...$$ as they are for MathJax rendering
        
        // Split by math delimiters to preserve them
        const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/);
        
        for (let i = 0; i < parts.length; i += 2) {
            // Only clean non-math parts (even indices)
            // Preserve line breaks but clean up excessive whitespace
            parts[i] = parts[i]
                .replace(/[ \t]+/g, ' ')  // Replace multiple spaces/tabs with single space
                .replace(/\n\s+/g, '\n')  // Remove leading spaces from lines
                .replace(/\s+\n/g, '\n')  // Remove trailing spaces from lines
                .replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2
        }
        
        return parts.join('').trim();
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

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SophisticatedMarkdownParser;
}
