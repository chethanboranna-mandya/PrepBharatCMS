// Enhanced LaTeX Parser for JEE Questions
class EnhancedLaTeXParser {
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
    }

    parseLaTeXContent(content) {
        const questions = [];
        
        // Extract exam information
        const examInfo = this.extractExamInfo(content);
        
        // Parse different sections
        const sections = this.extractSections(content);
        
        let questionIndex = 1;
        
        sections.forEach(section => {
            const sectionQuestions = this.parseSection(section, questionIndex, examInfo);
            questions.push(...sectionQuestions);
            questionIndex += sectionQuestions.length;
        });
        
        return { examInfo, questions };
    }

    extractExamInfo(content) {
        const titleMatch = content.match(/\\section\*\{([^}]+)\}/);
        const yearMatch = content.match(/(\d{4})/);
        const subjectMatch = content.match(/\\section\*\{([^}]+)\}/g);
        
        let subject = 'Mixed';
        if (content.includes('MATHEMATICS')) subject = 'Mathematics';
        else if (content.includes('PHYSICS')) subject = 'Physics';
        else if (content.includes('CHEMISTRY')) subject = 'Chemistry';
        
        return {
            title: titleMatch ? titleMatch[1] : 'JEE (Main)-2025',
            year: yearMatch ? yearMatch[1] : '2025',
            subject: subject,
            totalQuestions: this.countQuestions(content)
        };
    }

    countQuestions(content) {
        const questionMatches = content.match(/\d+\.\s/g);
        return questionMatches ? questionMatches.length : 0;
    }

    extractSections(content) {
        const sectionPattern = /\\section\*\{SECTION-[AB]\}[\s\S]*?(?=\\section\*\{SECTION-[AB]\}|$)/g;
        return content.match(sectionPattern) || [];
    }

    parseSection(section, startIndex, examInfo) {
        const questions = [];
        
        // Split by question numbers
        const questionPattern = /(\d+)\.\s*([\s\S]*?)(?=\d+\.\s|$)/g;
        let match;
        let questionNumber = startIndex;
        
        while ((match = questionPattern.exec(section)) !== null) {
            const questionText = match[2].trim();
            
            if (questionText.length > 20) { // More strict validation
                const question = this.parseQuestion(questionNumber, questionText, examInfo);
                if (question) {
                    questions.push(question);
                    questionNumber++;
                }
            }
        }
        
        return questions;
    }

    parseQuestion(number, text, examInfo) {
        try {
            // Extract question text
            const questionText = this.extractQuestionText(text);
            
            // Extract options
            const options = this.extractOptions(text);
            
            // Extract correct answer
            const correctAnswer = this.extractCorrectAnswer(text);
            
            // Extract solution
            const solution = this.extractSolution(text);
            
            // Determine subject
            const subject = this.determineSubject(questionText, examInfo.subject);
            
            // Extract images if any
            const images = this.extractImages(text);
            
            return {
                questionIndex: number.toString(),
                questionId: `${examInfo.year}Q${number}`,
                questionDetails: [{
                    text: questionText,
                    textImages: images,
                    possibleAnswers: options,
                    correctAnswer: correctAnswer,
                    correctAnswerText: options[correctAnswer]?.text || ''
                }],
                subject: subject,
                solution: solution,
                marks: this.extractMarks(text)
            };
        } catch (error) {
            console.error(`Error parsing question ${number}:`, error);
            return null;
        }
    }

    extractQuestionText(text) {
        // Remove answer options
        let questionText = text.replace(/\(1\)[\s\S]*?\(4\)[^\\]*/g, '');
        
        // Remove answer and solution
        questionText = questionText.replace(/Ans\.\s*\(\d+\)[\s\S]*$/g, '');
        questionText = questionText.replace(/Sol\.[\s\S]*$/g, '');
        
        // Clean up LaTeX
        questionText = this.cleanLaTeX(questionText);
        
        return questionText.trim();
    }

    extractOptions(text) {
        const options = {};
        
        // Pattern to match options (1) to (4)
        const optionPattern = /\((\d+)\)\s*([^\(]*?)(?=\(\d+\)|Ans\.|$)/g;
        let match;
        
        while ((match = optionPattern.exec(text)) !== null) {
            const optionNumber = parseInt(match[1]);
            let optionText = match[2].trim();
            
            // Clean up LaTeX in option text
            optionText = this.cleanLaTeX(optionText);
            
            if (optionText && optionNumber >= 1 && optionNumber <= 4) {
                const optionLetter = String.fromCharCode(64 + optionNumber); // A, B, C, D
                options[optionLetter] = {
                    text: optionText,
                    image: null
                };
            }
        }
        
        return options;
    }

    extractCorrectAnswer(text) {
        const match = text.match(/Ans\.\s*\((\d+)\)/);
        if (match) {
            const optionNumber = parseInt(match[1]);
            if (optionNumber >= 1 && optionNumber <= 4) {
                return String.fromCharCode(64 + optionNumber); // A, B, C, D
            }
        }
        return 'A';
    }

    extractSolution(text) {
        const solutionMatch = text.match(/Sol\.[\s\S]*$/);
        if (solutionMatch) {
            let solution = solutionMatch[0].replace('Sol.', '').trim();
            solution = this.cleanLaTeX(solution);
            return solution;
        }
        return '';
    }

    extractMarks(text) {
        // Look for marks pattern like "4 / -1"
        const marksMatch = text.match(/(\d+)\s*\/\s*-?\d+/);
        return marksMatch ? marksMatch[1] : '4';
    }

    extractImages(text) {
        // Look for image references in LaTeX
        const imagePattern = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
        const images = [];
        let match;
        
        while ((match = imagePattern.exec(text)) !== null) {
            images.push({
                src: match[1],
                alt: `Question image ${images.length + 1}`
            });
        }
        
        return images;
    }

    determineSubject(questionText, defaultSubject) {
        const lowerText = questionText.toLowerCase();
        
        // Mathematics keywords
        const mathKeywords = [
            'mathematics', 'math', 'algebra', 'calculus', 'geometry', 'trigonometry',
            'function', 'derivative', 'integral', 'limit', 'matrix', 'vector',
            'equation', 'polynomial', 'quadratic', 'logarithm', 'exponential'
        ];
        
        // Physics keywords
        const physicsKeywords = [
            'physics', 'force', 'energy', 'wave', 'electric', 'magnetic', 'optics',
            'mechanics', 'thermodynamics', 'quantum', 'atom', 'electron', 'proton',
            'neutron', 'nucleus', 'radioactive', 'circuit', 'current', 'voltage',
            'resistance', 'capacitor', 'inductor', 'momentum', 'acceleration'
        ];
        
        // Chemistry keywords
        const chemistryKeywords = [
            'chemistry', 'molecule', 'atom', 'reaction', 'compound', 'element',
            'acid', 'base', 'salt', 'bond', 'organic', 'inorganic', 'carbon',
            'hydrogen', 'oxygen', 'nitrogen', 'sulfur', 'chlorine', 'bromine',
            'iodine', 'alkali', 'metal', 'non-metal', 'catalyst', 'equilibrium'
        ];
        
        const mathCount = mathKeywords.filter(keyword => lowerText.includes(keyword)).length;
        const physicsCount = physicsKeywords.filter(keyword => lowerText.includes(keyword)).length;
        const chemistryCount = chemistryKeywords.filter(keyword => lowerText.includes(keyword)).length;
        
        if (mathCount > physicsCount && mathCount > chemistryCount) return 'Mathematics';
        if (physicsCount > mathCount && physicsCount > chemistryCount) return 'Physics';
        if (chemistryCount > mathCount && chemistryCount > physicsCount) return 'Chemistry';
        
        return defaultSubject;
    }

    cleanLaTeX(text) {
        // Convert LaTeX math to readable format
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
            return this.convertMathToReadable(math);
        });
        
        text = text.replace(/\$([^$]+)\$/g, (match, math) => {
            return this.convertMathToReadable(math);
        });
        
        // Convert fractions
        text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
        
        // Convert superscripts
        text = text.replace(/\^([^{}\s]+)/g, '^$1');
        
        // Convert subscripts
        text = text.replace(/_([^{}\s]+)/g, '_$1');
        
        // Remove LaTeX commands
        text = text.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
        text = text.replace(/\\[a-zA-Z]+/g, '');
        
        // Clean up special characters
        text = text.replace(/\\[^a-zA-Z]/g, '');
        text = text.replace(/\s+/g, ' ');
        
        return text.trim();
    }

    convertMathToReadable(math) {
        // Convert common LaTeX math symbols to readable format
        const conversions = {
            '\\alpha': 'α',
            '\\beta': 'β',
            '\\gamma': 'γ',
            '\\delta': 'δ',
            '\\epsilon': 'ε',
            '\\theta': 'θ',
            '\\lambda': 'λ',
            '\\mu': 'μ',
            '\\pi': 'π',
            '\\sigma': 'σ',
            '\\tau': 'τ',
            '\\phi': 'φ',
            '\\omega': 'ω',
            '\\infty': '∞',
            '\\sum': 'Σ',
            '\\int': '∫',
            '\\sqrt': '√',
            '\\leq': '≤',
            '\\geq': '≥',
            '\\neq': '≠',
            '\\approx': '≈',
            '\\pm': '±',
            '\\times': '×',
            '\\div': '÷',
            '\\rightarrow': '→',
            '\\leftarrow': '←',
            '\\Rightarrow': '⇒',
            '\\Leftarrow': '⇐'
        };
        
        let result = math;
        Object.entries(conversions).forEach(([latex, symbol]) => {
            result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), symbol);
        });
        
        return result;
    }

    generateJSON(examInfo, questions) {
        return {
            tutorialId: `JEE_${examInfo.year}_${examInfo.subject}`,
            tutorialTitle: examInfo.title,
            tutorialDescription: `JEE ${examInfo.year} ${examInfo.subject} Question Paper with Solutions`,
            authorityExamId: "nta_jee",
            state: "All India",
            board: "JEE",
            conductedBy: "NTA (National Testing Agency)",
            year: examInfo.year,
            subject: examInfo.subject,
            totalQuestions: questions.length,
            questions: questions
        };
    }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedLaTeXParser;
}
