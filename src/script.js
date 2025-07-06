const boardSelect = document.getElementById("boardSelect");
const subjectSelect = document.getElementById("subjectSelect");
const yearSelect = document.getElementById("yearSelect");
const tutorialIdField = document.getElementById("tutorialId");
const questionList = document.getElementById("questionList");
const questionEditor = document.getElementById("questionEditor");
const questions = [];

let activeIndex = -1;

// Populate boards and years
Object.keys(boards).forEach(board => {
    const opt = document.createElement("option");
    opt.value = board;
    opt.textContent = board;
    boardSelect.appendChild(opt);
});
for (let y = 2004; y <= 2025; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
}

boardSelect.addEventListener("change", updateSubjects);
yearSelect.addEventListener("change", updateTutorialId);
subjectSelect.addEventListener("change", updateTutorialId);

function updateSubjects() {
    subjectSelect.innerHTML = "<option value=''>Select Subject</option>";
    const selectedBoard = boardSelect.value;
    if (boards[selectedBoard]) {
        boards[selectedBoard].forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub;
            opt.textContent = sub;
            subjectSelect.appendChild(opt);
        });
    }
    updateTutorialId();
}

function updateTutorialId() {
    const board = boardSelect.value;
    const year = yearSelect.value;
    const subject = subjectSelect.value;
    if (board && year && subject) {
        tutorialIdField.value = `${board}_${year}_${subject}`;
    }
}

function addQuestion() {
    const index = questions.length;
    questions.push({
        sentenceId: "",
        text: "",
        optA: "",
        optB: "",
        optC: "",
        optD: "",
        correct: ""
    });
    renderQuestionList();
    setActiveQuestion(index);
}

function removeQuestion() {
    if (questions.length > 0) {
        questions.pop();
        const newIndex = Math.max(questions.length - 1, 0);
        renderQuestionList();
        setActiveQuestion(newIndex);
    }
}

function setActiveQuestion(index) {
    activeIndex = index;
    renderQuestionList();
    renderEditor();
}

function renderQuestionList() {
    questionList.innerHTML = "";
    questions.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.textContent = i + 1;
        btn.classList.toggle("active", i === activeIndex);
        btn.onclick = () => setActiveQuestion(i);
        questionList.appendChild(btn);
    });
}

function renderEditor() {
    const q = questions[activeIndex];
    questionEditor.innerHTML = `
    <h4>Question ${activeIndex + 1}</h4>
    <label>Sentence ID:</label>
    <input type="text" value="${q.sentenceId}" oninput="questions[${activeIndex}].sentenceId = this.value">
    <label>Question Text:</label>
<textarea rows="8" 
  oninput="questions[${activeIndex}].text = this.value"
  class="question-textarea">${q.text || ""}</textarea>
    <div class="row option-row">
  <div class="field">
    <label>Option A:</label>
    <input type="text" class="option-input" value="${q.optA}" oninput="questions[${activeIndex}].optA = this.value">
  </div>
  <div class="field">
    <label>Option B:</label>
    <input type="text" class="option-input" value="${q.optB}" oninput="questions[${activeIndex}].optB = this.value">
  </div>
</div>
<div class="row option-row">
  <div class="field">
    <label>Option C:</label>
    <input type="text" class="option-input" value="${q.optC}" oninput="questions[${activeIndex}].optC = this.value">
  </div>
  <div class="field">
    <label>Option D:</label>
    <input type="text" class="option-input" value="${q.optD}" oninput="questions[${activeIndex}].optD = this.value">
  </div>
</div>

    <label>Correct Answer (A/B/C/D):</label>
    <select onchange="questions[${activeIndex}].correct = this.value">
      <option value="">Select</option>
      ${["A", "B", "C", "D"].map(opt => `
        <option value="${opt}" ${q.correct === opt ? "selected" : ""}>${opt}</option>
      `).join("")}
    </select>
     <label>Correct Answer Text:</label>
    <input type="text" class="option-input" value="${q.correctText || ""}" onInput="questions[${activeIndex}].correctText = this.value"/>
  `;


}

function generateJSON() {
    const tutorialId = document.getElementById("tutorialId").value;
    const tutorialTitle = document.getElementById("tutorialTitle").value;
    const authorityExamId = document.getElementById("authorityExamId").value;

    const finalQuestions = questions.map((q, i) => ({
        questionId: (i + 1).toString(),
        questionDetails: [{
            sentenceId: parseInt(q.sentenceId),
            text: q.text,
            textImages: [],
            possibleAnswers: {
                "A": {text: q.optA, image: null},
                "B": {text: q.optB, image: null},
                "C": {text: q.optC, image: null},
                "D": {text: q.optD, image: null}
            },
            correctAnswer: q.correct,
            correctAnswerText: q.correctText || q[`opt${q.correct}`] || ""
        }]
    }));

    const result = [{
        tutorialId,
        tutorialTitle,
        tutorialDescription: "",
        authorityExamId,
        questions: finalQuestions
    }];

    document.getElementById("output").textContent = JSON.stringify(result, null, 2);
}

// Pre-fill with 60 questions
for (let i = 0; i < 60; i++) addQuestion();


function loadFromFile() {
    const input = document.getElementById('jsonFileInput');
    const file = input.files[0];
    if (!file) {
        alert('Please select a JSON file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data) || !data[0].questions) {
                alert("Invalid JSON structure.");
                return;
            }

            const tutorial = data[0];

            // Set basic fields
            document.getElementById("tutorialId").value = tutorial.tutorialId || "";
            document.getElementById("tutorialTitle").value = tutorial.tutorialTitle || "";
            document.getElementById("authorityExamId").value = tutorial.authorityExamId || "";

            // Parse board/year/subject from tutorialId
            const [board, year, subject] = (tutorial.tutorialId || "").split("_");
            document.getElementById("boardSelect").value = board || "";
            updateSubjects(); // Re-populate subject dropdown based on board
            document.getElementById("yearSelect").value = year || "";
            document.getElementById("subjectSelect").value = subject || "";

            questions.length = 0; // Clear existing
            tutorial.questions.forEach(q => {
                const qd = q.questionDetails[0];
                questions.push({
                    sentenceId: qd.sentenceId.toString(),
                    text: qd.text,
                    optA: qd.possibleAnswers["A"].text,
                    optB: qd.possibleAnswers["B"].text,
                    optC: qd.possibleAnswers["C"].text,
                    optD: qd.possibleAnswers["D"].text,
                    correct: qd.correctAnswer
                });
            });

            // Pad to 60 if fewer
            while (questions.length < 60) {
                questions.push({
                    sentenceId: "",
                    text: "",
                    optA: "",
                    optB: "",
                    optC: "",
                    optD: "",
                    correct: ""
                });
            }

            activeIndex = 0;
            renderQuestionList();
            renderEditor();
        } catch (err) {
            alert("Error reading JSON file.");
            console.error(err);
        }
    };

    reader.readAsText(file);
}
