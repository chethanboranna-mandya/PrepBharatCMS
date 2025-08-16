const stateSelect = dom("stateSelect"), boardSelect = dom("boardSelect"), subjectSelect = dom("subjectSelect"),
    yearSelect = dom("yearSelect"),
    tutorialIdField = dom("tutorialId");

dom("previewButton").addEventListener("click", showPreview);
let qList = dom("questionList"), qEditor = dom("questionEditor"), questions = [];
let activeIndex = -1;

function dom(id) {
    return document.getElementById(id);
}

function fillBoards() {
    Object.keys(boards).forEach(b => {
        let o = new Option(b, b);
        boardSelect.add(o)
    });
}

function fillYears() {
    for (let y = 2004; y <= 2025; y++) yearSelect.add(new Option(y, y));
}

fillStates();
fillBoards();
fillYears();

stateSelect.onchange = () => {
    updateBoards();
    renderEditor();
};

boardSelect.onchange = () => {
    updateSubjects();
    updateTutorialId(); // ✅ This line ensures 'Conducted By' and Authority ID are updated
    renderEditor();
};

subjectSelect.onchange = () => {
    updateTutorialId();
    renderEditor(); // ⬅️ added
    regenerateQuestionIds();
};
yearSelect.onchange = () => {
    updateTutorialId();
    renderEditor(); // ⬅️ added
    regenerateQuestionIds();
};

function saveCurrentSubjectState() {
    if (!activeSubject) {
        console.warn("No active subject to save");
        return;
    }
    // Deep copy to avoid reference issues
    questionsBySubject[activeSubject] = JSON.parse(JSON.stringify(questions));
    console.log(`Saved questions for ${activeSubject}:`, questionsBySubject[activeSubject]); // Debug log

    // Generate JSON matching expected structure
    const tId = tutorialIdField.value || `KCET_${yearSelect.value || '2025'}_${activeSubject}`;
    const ttl = dom("tutorialTitle").value || `KCET ${yearSelect.value || '2025'} ${activeSubject}`;
    const aid = dom("authorityExamId").value || "kar_kect"; // Use expected "kar_kect"
    const state = stateSelect.value || "Karnataka";
    const board = boardSelect.value || "KCET";
    const conductedBy = dom("conductedBy").value || "KEA (Karnataka Examinations Authority)";
    const year = yearSelect.value || "2025";
    const subject = activeSubject;

    const out = questions.map((q, i) => ({
        questionIndex: (i + 1).toString(),
        questionId: q.questionId,
        questionDetails: [{
            text: q.text || "",
            textImages: q.questionImages || [],
            possibleAnswers: {
                A: { text: q.optA || "", image: q.optionImages?.A || null },
                B: { text: q.optB || "", image: q.optionImages?.B || null },
                C: { text: q.optC || "", image: q.optionImages?.C || null },
                D: { text: q.optD || "", image: q.optionImages?.D || null },
            },
            correctAnswer: q.correct || "",
            correctAnswerText: q.correctText || ""
        }]
    }));

    const result = [{
        tutorialId: tId,
        tutorialTitle: ttl,
        tutorialDescription: "",
        authorityExamId: aid,
        state: state,
        board: board,
        conductedBy: conductedBy,
        year: year,
        subject: subject,
        questions: out
    }];

    outputsPerSubject[activeSubject] = JSON.stringify(result, null, 2);
    console.log(`Updated JSON for ${activeSubject}:`, outputsPerSubject[activeSubject]); // Debug log
}


function fillStates() {
    Object.keys(states).forEach(state => {
        stateSelect.add(new Option(state, state));
    });
}

function updateBoards() {
    boardSelect.innerHTML = "<option value=''>Select Board</option>";
    const selectedState = stateSelect.value;
    states[selectedState]?.forEach(b => boardSelect.add(new Option(b, b)));
    updateSubjects();
}

function updateSubjects() {
    subjectSelect.innerHTML = "<option value=''>Select Subject</option>";
    boards[boardSelect.value]?.forEach(s => subjectSelect.add(new Option(s, s)));
    updateTutorialId();
}

async function updateTutorialId() {
    const board = boardSelect.value;
    const year = yearSelect.value;
    const subject = subjectSelect.value;
    const state = stateSelect.value;

    const authorityExamIdField = dom("authorityExamId");
    const conductedByField = dom("conductedBy");
    const tutorialIdField = dom("tutorialId");
    const tutorialTitleField = dom("tutorialTitle");

    // ✅ Clear tutorial ID and title on board change
    tutorialIdField.value = "";
    tutorialTitleField.value = "";

    // ✅ Set authorityExamId from map
    const examId = examShortNameToIdMap[state]?.[board];
    if (examId) {
        authorityExamIdField.value = examId;
        conductedByField.value = conductedByByIdMap[examId] || "";
    } else {
        authorityExamIdField.value = "";
        conductedByField.value = conductedByByIdMap[board] || "";
    }

    // ✅ Set tutorialId and title only if all are selected
    if (board && year && subject && subject !== "Select Subject") {
        const tutorialId = `${board}_${year}_${subject}`;
        tutorialIdField.value = tutorialId;
        tutorialTitleField.value = `${board} ${year} ${subject}`;

        try {
            await remoteConfig.fetchAndActivate();
            const key = `${board}_${year}_${subject}_exam_id`;
            const remoteId = remoteConfig.getString(key);
            if (remoteId) {
                authorityExamIdField.value = remoteId;
                conductedByField.value = conductedByByIdMap[remoteId] || conductedByField.value;
            }
        } catch (err) {
            console.error("Remote config fetch failed:", err);
        }
    }
}


function addQuestion(showAlert = true) {
    const board = boardSelect.value;
    const year = yearSelect.value;
    const subject = subjectSelect.value;

    if (!board || !year || !subject || subject === "Select Subject") {
        if (showAlert) alert("Please select Board, Year, and Subject first.");
        return;
    }

    const questionNumber = questions.length + 1;
    const subjectInitial = subject[0].toUpperCase();
    const sentenceId = `${year}${subjectInitial}Q${questionNumber}`;

    questions.push({
        questionId: sentenceId,
        text: "",
        optA: "",
        optB: "",
        optC: "",
        optD: "",
        correct: "",
        correctText: "",
        type: "mcq", // Default type
        questionImages: [],
        optionImages: { A: "", B: "", C: "", D: "" }
    });
    setActiveQuestion(questions.length - 1);
    saveCurrentSubjectState(); // Save after adding
}


function removeQuestion() {
    if (questions.length) {
        questions.pop();
        setActiveQuestion(Math.max(questions.length - 1, 0));
        saveCurrentSubjectState(); // Save after removing
    }
}

function setActiveQuestion(i) {
    activeIndex = i;
    renderQuestionList();
    renderEditor();
    updatePreviewForActiveQuestion();

    if (dom("previewPanel").classList.contains("open")) {
        scrollToPreviewQuestion(i);
    }

    // Refresh JSON view with active question scroll
    generateJSON(activeIndex);
}

function renderQuestionList() {
    qList.innerHTML = "";
    questions.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.textContent = i + 1;
        btn.dataset.idx = i;
        btn.className = "q-list-btn";
        if (i === activeIndex) btn.classList.add("active");
        btn.onclick = () => setActiveQuestion(i);
        qList.appendChild(btn);
    });
}


function renderEditor() {
    const sbj = subjectSelect.value;
    const yr = yearSelect.value;
    const brd = boardSelect.value;
    const editor = dom("questionEditor");

    if (!sbj || !yr || !brd || !activeSubject) {
        editor.innerHTML = `<div style="color: red; font-weight: bold; padding: 12px;">
            ❗ Please select <u>Board</u>, <u>Year</u>, and <u>Subject</u> before editing questions.
        </div>`;
        console.log("Editor blocked: Missing subject, year, board, or activeSubject"); // Debug log
        return;
    }

    if (!questions.length || activeIndex < 0) {
        editor.innerHTML = `<div style="color: orange; font-weight: bold; padding: 12px;">
            ⚠️ No questions available for ${sbj}. Add a question to start editing.
        </div>`;
        console.log(`No questions for ${sbj}, activeIndex: ${activeIndex}`); // Debug log
        return;
    }

    const q = questions[activeIndex];

    editor.innerHTML = `
<h4>Question ${activeIndex + 1}</h4>

<label>Question ID:</label>
<input value="${q.questionId || ''}" readonly style="background:#f3f3f3; color:#555; cursor:not-allowed;"/>

<label>Type:</label>
<select onchange="questions[${activeIndex}].type=this.value; saveCurrentSubjectState(); debouncedGenerateJSON();">
  ${["mcq", "integer", "truefalse", "fillblank"].map(t =>
        `<option value="${t}" ${q.type === t ? "selected" : ""}>${t}</option>`
    ).join("")}
</select>

<label>Question Text:</label>
<textarea rows="8" class="question-textarea" 
          oninput="questions[${activeIndex}].text=this.value; saveCurrentSubjectState(); debouncedGenerateJSON();">${q.text || ''}</textarea>

<h5 style="margin-top: 10px;">Uploaded Q Images:</h5>
<div id="qImagesContainer_${activeIndex}"></div>
<div style="margin-top:10px;">
  <input type="file" multiple id="qImagesInput_${activeIndex}" onchange="handleQImages(event, ${activeIndex})"/>
</div>

<div id="qUrls_${activeIndex}">
    ${q.questionImages?.map((url, idx) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <img src="${url}" width="50" height="50"/>
            <a href="${url}" target="_blank">Image ${idx + 1}</a>
            <button style="color:red; cursor:pointer;" onclick="removeExistingQImage(${activeIndex}, ${idx})">✖</button>
        </div>
    `).join("") || ""}
</div>

${["A", "B", "C", "D"].map((opt, idx) => `
<div class="free" style="margin-top:12px;">
  <label>Option ${opt}:</label>
  <textarea rows="4" class="option-textarea" 
          oninput="questions[${activeIndex}].opt${opt}=this.value; saveCurrentSubjectState(); debouncedGenerateJSON();">${q["opt" + opt] || ''}</textarea>

  <div id="opt${opt}Url_${activeIndex}">
    ${q.optionImages?.[opt] ? `
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
            <img src="${q.optionImages[opt]}" width="50" height="50"/>
            <a href="${q.optionImages[opt]}" target="_blank">Option ${opt}</a>
            <button style="color:red; cursor:pointer;" onclick="removeExistingOptImage(${activeIndex}, '${opt}')">✖</button>
        </div>
    ` : ""}
  </div>

  <input type="file" accept="image/*" onchange="handleOptImage(event,${activeIndex},'${opt}', ${idx + 1})"/>
</div>`).join("")}

<label>Correct Answer:</label>
<select onchange="questions[${activeIndex}].correct=this.value; saveCurrentSubjectState(); debouncedGenerateJSON();">
  <option></option>${["A", "B", "C", "D"].map(o => `<option ${q.correct === o ? "selected" : ""}>${o}</option>`).join("")}
</select>

<label>Correct Answer Text:</label>
<input value="${q.correctText || ""}" 
       oninput="questions[${activeIndex}].correctText=this.value; saveCurrentSubjectState(); debouncedGenerateJSON();"/>
`;
    console.log(`Rendered editor for ${sbj}, question ${activeIndex + 1}:`, q); // Debug log
}


function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
const debouncedGenerateJSON = debounce(generateJSON);

function removeExistingQImage(index, imgIdx) {
    if (!confirm("Remove this question image?")) return;
    questions[index].questionImages.splice(imgIdx, 1);
    renderEditor();
    saveCurrentSubjectState(); // Save after image removal
}
function removeExistingOptImage(index, opt) {
    if (!confirm("Remove this option image?")) return;
    questions[index].optionImages[opt] = null;
    renderEditor();
    saveCurrentSubjectState(); // Save after image removal
}


function handleQImages(ev, index) {
    const files = [...ev.target.files];
    const subject = subjectSelect.value.toLowerCase();
    const year = yearSelect.value;

    if (!questions[index].questionImages) questions[index].questionImages = [];

    const container = dom(`qImagesContainer_${index}`);

    files.forEach((file) => {
        const imgIdx = questions[index].questionImages.length;
        const suffix = `_Q${imgIdx + 1}`;
        const fileName = `${subject}_${year}_${index + 1}${suffix}`;

        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        wrapper.style.marginBottom = "8px";

        const progress = document.createElement("progress");
        progress.value = 0;
        progress.max = 100;
        progress.style.width = "120px";

        const status = document.createElement("span");
        status.textContent = "Uploading...";

        wrapper.append(progress, status);
        container.appendChild(wrapper);

        uploadImageToFirebase(file, subject, year, index, suffix, percent => {
            progress.value = percent;
        }).then(url => {
            questions[index].questionImages.push(url);
            saveCurrentSubjectState();
            generateJSON();
            const thumbnail = document.createElement("img");
            thumbnail.src = url;
            thumbnail.width = 50;
            thumbnail.height = 50;

            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.textContent = fileName;

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✖";
            removeBtn.style.cursor = "pointer";
            removeBtn.style.color = "red";
            removeBtn.onclick = () => removeQImage(index, imgIdx, fileName, wrapper);

            wrapper.replaceChildren(thumbnail, link, removeBtn);
        }).catch(err => {
            console.error("Upload failed:", err);
            status.textContent = "❌ Upload failed";
        });
    });

    // Reset the file input to allow re-selection of the same file
    ev.target.value = "";
}

function removeQImage(index, imgIdx, fileName, wrapper) {
    if (!confirm("Remove this question image?")) return;

    const {storage, ref, deleteObject} = window.firebaseStorage;

    const subject = subjectSelect.value.toLowerCase();
    const year = yearSelect.value;
    const path = `questions/${subject}/${year}/${fileName}`;

    const storageRef = ref(storage, path);

    deleteObject(storageRef)
        .then(() => {
            questions[index].questionImages.splice(imgIdx, 1);
            wrapper.remove();
            generateJSON();
            alert("✅ Image deleted.");
        })
        .catch(err => {
            console.error("Delete failed:", err);
            alert("❌ Could not delete from Firebase.");
        });
}


function handleOptImage(ev, i, opt, optNumber) {
    const fileInput = ev.target;
    const file = fileInput.files[0];
    if (!file) return;

    const subject = subjectSelect.value.toLowerCase();
    const year = yearSelect.value;
    const fileName = `${subject}_${year}_${i + 1}_op${optNumber}`;
    const path = `questions/${subject}/${year}/${fileName}`;

    const container = dom(`opt${opt}Url_${i}`);
    container.innerHTML = ""; // Clear all existing elements

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";
    wrapper.style.marginTop = "6px";

    const progress = document.createElement("progress");
    progress.value = 0;
    progress.max = 100;
    progress.style.width = "100px";

    const status = document.createElement("span");
    status.textContent = "Uploading...";

    const thumbnail = document.createElement("img");
    thumbnail.style.display = "none";
    thumbnail.width = 50;
    thumbnail.height = 50;

    const link = document.createElement("a");
    link.target = "_blank";
    link.style.fontSize = "12px";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.color = "red";

    wrapper.append(progress, status);
    container.appendChild(wrapper);

    uploadImageToFirebase(file, subject, year, i, `_op${optNumber}`, percent => {
        progress.value = percent;
    }).then(url => {
        // ✅ Remove input after upload
        fileInput.remove();

        questions[i].optionImages[opt] = url;
        saveCurrentSubjectState();
        generateJSON();
        status.textContent = "✅ Uploaded";
        thumbnail.src = url;
        thumbnail.style.display = "block";
        link.href = url;
        link.textContent = fileName;

        removeBtn.onclick = () => {
            if (!confirm("Do you want to remove the uploaded image?")) return;

            const {storage, ref, deleteObject} = window.firebaseStorage;
            const storageRef = ref(storage, path);
            deleteObject(storageRef)
                .then(() => {
                    wrapper.remove();
                    questions[i].optionImages[opt] = null; // First remove from data
                    generateJSON(); // Then update JSON output

                    // ✅ Restore file input after delete
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e) => handleOptImage(e, i, opt, optNumber);
                    container.appendChild(input);

                    alert("✅ Image deleted.");
                })
                .catch(err => {
                    console.error("Delete failed:", err);
                    alert("❌ Could not delete from Firebase.");
                });
        };

        wrapper.replaceChildren(thumbnail, link, removeBtn);
    }).catch(err => {
        console.error("Upload failed:", err);
        status.textContent = "❌ Upload failed";
    });
}

function generateJSON(activeIndex = -1) {
    const tId = tutorialIdField.value || `KCET_${yearSelect.value || '2025'}_${subjectSelect.value || 'Unknown'}`;
    const ttl = dom("tutorialTitle").value || `KCET ${yearSelect.value || '2025'} ${subjectSelect.value || 'Unknown'}`;
    const aid = dom("authorityExamId").value || "kar_kect"; // Match expected JSON
    const state = stateSelect.value || "Karnataka";
    const board = boardSelect.value || "KCET";
    const conductedBy = dom("conductedBy").value || "KEA (Karnataka Examinations Authority)";
    const year = yearSelect.value || "2025";
    const subject = subjectSelect.value || "Unknown";

    const out = questions.map((q, i) => ({
        questionIndex: (i + 1).toString(),
        questionId: q.questionId,
        questionDetails: [{
            text: q.text || "",
            textImages: q.questionImages || [],
            possibleAnswers: {
                A: { text: q.optA || "", image: q.optionImages?.A || null },
                B: { text: q.optB || "", image: q.optionImages?.B || null },
                C: { text: q.optC || "", image: q.optionImages?.C || null },
                D: { text: q.optD || "", image: q.optionImages?.D || null },
            },
            correctAnswer: q.correct || "",
            correctAnswerText: q.correctText || ""
        }]
    }));

    const result = [{
        tutorialId: tId,
        tutorialTitle: ttl,
        tutorialDescription: "",
        authorityExamId: aid,
        state: state,
        board: board,
        conductedBy: conductedBy,
        year: year,
        subject: subject,
        questions: out
    }];

    // Generate raw JSON string
    const jsonStr = JSON.stringify(result, null, 2);

    // Update outputsPerSubject for the active subject
    if (activeSubject) {
        outputsPerSubject[activeSubject] = jsonStr;
    }

    // Render for UI with questionIndex spans
    const lines = jsonStr.split('\n');
    const htmlLines = lines.map(line => {
        const match = /"questionIndex":\s?"(\d+)"/.exec(line);
        if (match) {
            const idx = match[1];
            return `<span id="jsonQ${idx}">${line}</span>`;
        }
        return line;
    });

    dom("output").innerHTML = htmlLines.join('<br/>');

    // Auto-scroll to active question
    if (activeIndex >= 0) {
        setTimeout(() => {
            const target = document.getElementById(`jsonQ${activeIndex + 1}`);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 100);
    }

    // Update preview if needed
    if (dom("previewPanel").classList.contains("open")) {
        updatePreviewForActiveQuestion();
    }

    // Store clean JSON for export
    window.latestExportJSON = jsonStr;
    window.lastGeneratedJSONString = jsonStr;

    // Save to questionsBySubject
    if (activeSubject) {
        questionsBySubject[activeSubject] = JSON.parse(JSON.stringify(questions));
    }
}


function downloadJSON() {
    const blob = new Blob([window.latestExportJSON], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "tutorial.json";
    link.click();
}


function loadFromFile() {
    const f = dom('jsonFileInput').files[0];
    if (!f) {
        alert("Select a file");
        return;
    }

    const r = new FileReader();
    r.onload = e => {
        try {
            const dt = JSON.parse(e.target.result)[0]; // Expect array
            window.currentTutorial = dt;
            dom("tutorialTitle").value = dt.tutorialTitle;
            dom("authorityExamId").value = dt.authorityExamId;

            const [b, y, s] = (dt.tutorialId || "").split("_");
            boardSelect.value = b;
            updateSubjects();
            yearSelect.value = y;
            subjectSelect.value = s;
            updateTutorialId();

            questions.length = 0;
            activeSubject = s;

            dt.questions.forEach((q, idx) => {
                const d = q.questionDetails[0];
                const questionNumber = idx + 1;
                const subjectInitial = subjectSelect.value[0].toUpperCase();
                const year = yearSelect.value;
                const correctFormat = `${year}${subjectInitial}Q${questionNumber}`;

                let existingId = (q.questionId || "").toString().trim();
                const pattern = new RegExp(`^${year}${subjectInitial}Q${questionNumber}$`);
                const finalId = pattern.test(existingId) && existingId !== "" ? existingId : correctFormat;

                questions.push({
                    questionId: finalId,
                    text: d.text,
                    optA: d.possibleAnswers.A.text,
                    optB: d.possibleAnswers.B.text,
                    optC: d.possibleAnswers.C.text,
                    optD: d.possibleAnswers.D.text,
                    correct: d.correctAnswer,
                    correctText: d.correctAnswerText,
                    type: q.type || "mcq",
                    questionImages: d.textImages || [],
                    optionImages: {
                        A: d.possibleAnswers.A.image || "",
                        B: d.possibleAnswers.B.image || "",
                        C: d.possibleAnswers.C.image || "",
                        D: d.possibleAnswers.D.image || ""
                    }
                });
            });

            // Save to questionsBySubject
            questionsBySubject[s] = JSON.parse(JSON.stringify(questions));
            outputsPerSubject[s] = JSON.stringify([dt], null, 2);

            setActiveQuestion(0);
            saveCurrentSubjectState();
        } catch (err) {
            console.error(err);
            alert("Invalid JSON");
        }
    };

    r.readAsText(f);
}

function scrollToPreviewQuestion(index) {
    const target = document.getElementById(`previewQ${index}`);
    if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function copyJSON() {
    // Get the JSON string without HTML decorations
    const json = lastGeneratedJSONString || '';

    if (!json) {
        alert("Please generate JSON first!");
        return;
    }

    navigator.clipboard.writeText(json).then(() => {
        alert("JSON copied to clipboard!");
    }).catch(err => {
        console.error("Copy failed", err);
        alert("Failed to copy JSON.");
    });
}


function showPreview() {
    if (!activeSubject || !questions.length) {
        alert("❌ No questions available for preview.");
        return;
    }

    const previewDiv = dom("previewContent");
    const ttl = `${activeSubject} Preview`;

    let html = `<h3>${ttl}</h3>`;

    questions.forEach((q, i) => {
        const text = convertTablesInText(q.text || "");
        const optA = q.optA || "";
        const optB = q.optB || "";
        const optC = q.optC || "";
        const optD = q.optD || "";
        const correct = q.correct || "";
        const correctText = q.correctText || "";

        html += `
            <div id="previewQ${i}" style="margin-bottom: 20px; padding: 8px; border-bottom: 1px solid #ddd;">
                <div><b>Q${i + 1}.</b> ${text}</div>
                ${(q.questionImages || []).map(url => `<img src="${url}" height="60" style="margin:4px;"/>`).join(" ")}
                <ul>
                    <li><b>A:</b> ${optA}</li>
                    <li><b>B:</b> ${optB}</li>
                    <li><b>C:</b> ${optC}</li>
                    <li><b>D:</b> ${optD}</li>
                </ul>
                <div><b>Answer:</b> ${correct} - ${correctText}</div>
            </div>`;
    });

    previewDiv.innerHTML = html;

    MathJax.typesetPromise([previewDiv]).then(() => {
        dom("previewPanel").classList.add("open");
        document.body.classList.add("panel-open");
    }).catch(err => {
        console.error("MathJax rendering failed:", err);
    });
}

function updatePreviewForActiveQuestion() {
    const q = questions[activeIndex];
    const container = document.getElementById(`previewQ${activeIndex}`);
    if (!container) return; // If preview is not open yet, skip

    const text = convertTablesInText(q.text);

    let html = `
        <div><b>Q${activeIndex + 1}.</b> ${text}</div>
        ${q.questionImages?.map(url => `<img src="${url}" height="60" style="margin:4px;"/>`).join(" ") || ""}
        <ul>
            ${["A", "B", "C", "D"].map(opt => {
        const optText = q["opt" + opt] || "";
        const optImg = q.optionImages?.[opt];
        return `<li><b>${opt}:</b> ${optText} ${optImg ? `<img src="${optImg}" height="40" style="margin-left:6px;"/>` : ""}</li>`;
    }).join("")}
        </ul>
        <div><b>Answer:</b> ${q.correct || ""} - ${q.correctText || ""}</div>
    `;

    container.innerHTML = html;

    MathJax.typesetPromise([container]);
}



function markdownTableToHtml(markdown) {
    const cleanMarkdown = markdown.replace(/<br\s*\/?>/gi, '').trim();
    const lines = cleanMarkdown.split('\n').map(line => line.trim()).filter(Boolean);

    if (lines.length < 2) return "";

    const splitRow = line => {
        return line.split("|").slice(1, -1).map(c => c.trim());
    };

    const isSeparator = line => /^(\|\s*:?-+:?\s*)+\|$/.test(line);
    const headerCellsRaw = splitRow(lines[0]);
    const separatorLine = lines[1];
    if (!isSeparator(separatorLine)) return "";

    const bodyLines = lines.slice(2);

    let html = "<table>\n<thead><tr>";
    for (const cell of headerCellsRaw) {
        html += `<th>${cell}</th>`;
    }
    html += "</tr></thead>\n<tbody>\n";

    bodyLines.forEach(line => {
        const cells = splitRow(line);
        html += "<tr>";
        for (const cell of cells) {
            html += `<td>${cell}</td>`;
        }
        html += "</tr>\n";
    });

    html += "</tbody>\n</table>";
    return html;
}




function convertTablesInText(text) {
    // ✅ Step 1: Replace all <br> (case-insensitive) with real line breaks
    const cleanText = text.replace(/<br\s*\/?>/gi, "\n");

    const lines = cleanText.split("\n");
    const output = [];
    let tableBuffer = [];

    const isTableLine = line =>
        line.includes("|") && (line.includes("---") || line.includes("|"));

    for (let line of lines) {
        if (isTableLine(line)) {
            tableBuffer.push(line);
        } else {
            if (tableBuffer.length >= 3) {
                output.push(markdownTableToHtml(tableBuffer.join("\n")));
                tableBuffer = [];
            } else if (tableBuffer.length) {
                output.push(...tableBuffer);
                tableBuffer = [];
            }
            output.push(line);
        }
    }

    if (tableBuffer.length >= 3) {
        output.push(markdownTableToHtml(tableBuffer.join("\n")));
    } else {
        output.push(...tableBuffer);
    }

    return output.join("<br/>");
}


for (let i = 0; i < 60; i++) addQuestion(false);


document.addEventListener("DOMContentLoaded", () => {
    dom("previewButton").addEventListener("click", () => {
        showPreview();
        document.body.classList.add("panel-open");
    });

    dom("closePreview").addEventListener("click", () => {
        dom("previewPanel").classList.remove("open");
        document.body.classList.remove("panel-open");
    });
});

function openRawContentLoader() {
    document.getElementById("rawContentModal").style.display = "block";
}

function closeRawContentLoader() {
    document.getElementById("rawContentModal").style.display = "none";
}

function openJsonContentLoader() {
    document.getElementById("rawJsonModal").style.display = "block";
}

function closeJsonContentLoader() {
    document.getElementById("rawJsonModal").style.display = "none";
}

let outputsPerSubject = {};   // { subjectName: jsonString }
let questionsBySubject = {};  // { subjectName: parsedQuestionsArray }
let activeSubject = null;

function parseMultiSubjectJsonSeparate() {
    try {
        const raw = document.getElementById("rawJsonInput").value.trim();
        if (!raw) throw "❌ No input detected.\nPaste JSON content from file.";

        let inputData;
        try {
            inputData = JSON.parse(raw);
        } catch {
            throw "❌ Invalid JSON format. Please check your pasted content.";
        }

        if (!Array.isArray(inputData.results)) {
            throw "❌ JSON format error: 'results' array not found.";
        }

        // Clear existing data
        outputsPerSubject = {};
        questionsBySubject = {};
        activeSubject = "";

        inputData.results.forEach(subjectBlock => {
            const subjectName = subjectBlock._id || "Unknown";
            const firstQ = subjectBlock.questions?.[0] || {};
            const year = firstQ.year?.toString() || "2025";
            const subjectInitial = subjectName[0]?.toUpperCase() || "";
            const state = "Karnataka";
            const board = "KCET";
            const conductedBy = "KEA (Karnataka Examinations Authority)";

            // Build KCET-format questions
            const transformedQuestions = subjectBlock.questions.map((q, idx) => {
                const qIndex = (idx + 1).toString();
                const qId = `${year}${subjectInitial}Q${qIndex}`;
                const enQ = q.question?.en || {};
                const possibleAnswers = {};
                (enQ.options || []).forEach(opt => {
                    possibleAnswers[opt.identifier] = {
                        text: opt.content?.trim() || "",
                        image: null
                    };
                });

                return {
                    questionIndex: qIndex,
                    questionId: qId,
                    questionDetails: [{
                        text: stripHtml(enQ.content || ""),
                        textImages: [],
                        possibleAnswers,
                        correctAnswer: enQ.correct_options?.[0] || "",
                        correctAnswerText: possibleAnswers[enQ.correct_options?.[0]]?.text || ""
                    }]
                };
            });

            // Wrap in tutorial structure (array to match expected JSON)
            const outputArray = [{
                tutorialId: `KCET_${year}_${subjectName}`.replace(/\s+/g, "_"),
                tutorialTitle: `KCET ${year} ${subjectName}`,
                tutorialDescription: "",
                authorityExamId: "kar_kect", // Match expected JSON
                state,
                board,
                conductedBy,
                year,
                subject: subjectName,
                questions: transformedQuestions
            }];

            // Save per-subject JSON
            outputsPerSubject[subjectName] = JSON.stringify(outputArray, null, 2);
            // Prepare editor-friendly questions
            questionsBySubject[subjectName] = convertKCETToEditorFormat(transformedQuestions);
            if (!activeSubject) activeSubject = subjectName;
        });

        // Build subject tabs
        const tabsContainer = document.getElementById("subjectTabs");
        tabsContainer.innerHTML = "";
        Object.keys(outputsPerSubject).forEach((subjectName, idx) => {
            const tabBtn = document.createElement("button");
            tabBtn.textContent = subjectName;
            tabBtn.className = "subject-tab";
            tabBtn.style.marginRight = "8px";
            tabBtn.onclick = () => setActiveTab(subjectName);
            tabsContainer.appendChild(tabBtn);
            if (idx === 0) {
                document.getElementById("output").textContent = outputsPerSubject[subjectName];
            }
        });

        // Load first subject
        if (Object.keys(outputsPerSubject).length > 0) {
            setActiveTab(Object.keys(outputsPerSubject)[0]);
        }

        alert(`✅ Generated ${Object.keys(outputsPerSubject).length} separate subject JSONs.`);
        closeJsonContentLoader();
    } catch (err) {
        console.error(err);
        showParseErrorDialog(err);
    }
}






// Helper to highlight active tab
function setDropdownSelectionsFromMeta(meta) {
    const year = meta.year || "";
    const subject = meta.subject || "";
    const board = meta.board || "KCET";
    const state = meta.state || "Karnataka";

    // Auto-set dropdowns
    stateSelect.value = state;
    populateBoards(boardSelect, state);
    boardSelect.value = board;
    populateSubjects(subjectSelect, board);
    subjectSelect.value = subject;
    yearSelect.value = year;

    // Find Authority Exam ID from config.js mapping
    let examId = "";
    if (examShortNameToIdMap[state] && examShortNameToIdMap[state][board]) {
        examId = examShortNameToIdMap[state][board];
    }

    // Conducted By
    let conductedBy = "";
    if (examId && conductedByByIdMap[examId]) {
        conductedBy = conductedByByIdMap[examId];
    }

    // Tutorial ID & Title
    tutorialIdField.value = meta.tutorialId || `${subject}_${year}`;
    dom("tutorialTitle").value = meta.tutorialTitle || `${subject} ${year}`;
    dom("authorityExamId").value = examId || meta.authorityExamId || "";
    dom("conductedBy").value = conductedBy || meta.conductedBy || "";
}

function loadQuestionsForSubject(subjectName) {
    // ✅ Load only from questionsBySubject (already contains edits)
    questions = [...(questionsBySubject[subjectName] || [])];
    activeIndex = 0;
    renderQuestionList();
    renderEditor();
}

function setActiveTab(subjectName) {
    // Save current subject's state before switching
    if (activeSubject && activeSubject !== subjectName) {
        saveCurrentSubjectState();
    }

    // Update active subject
    activeSubject = subjectName;
    console.log(`Switching to subject: ${subjectName}`); // Debug log

    // Highlight active tab
    document.querySelectorAll(".subject-tab").forEach(btn => {
        btn.style.background = btn.textContent === subjectName ? "#007bff" : "";
        btn.style.color = btn.textContent === subjectName ? "white" : "";
    });

    // Initialize storage for new subject if it doesn't exist
    if (!questionsBySubject[subjectName]) {
        questionsBySubject[subjectName] = [];
        console.log(`Initialized empty questions for ${subjectName}`); // Debug log
    }
    if (!outputsPerSubject[subjectName]) {
        const defaultJson = [{
            tutorialId: `KCET_${yearSelect.value || '2025'}_${subjectName}`,
            tutorialTitle: `KCET ${yearSelect.value || '2025'} ${subjectName}`,
            tutorialDescription: "",
            authorityExamId: "kar_kect", // Match expected JSON
            state: stateSelect.value || "Karnataka",
            board: boardSelect.value || "KCET",
            conductedBy: conductedByByIdMap[examShortNameToIdMap[stateSelect.value || "Karnataka"]?.[boardSelect.value || "KCET"]] || "KEA (Karnataka Examinations Authority)",
            year: yearSelect.value || "2025",
            subject: subjectName,
            questions: []
        }];
        outputsPerSubject[subjectName] = JSON.stringify(defaultJson, null, 2);
        console.log(`Initialized JSON for ${subjectName}:`, outputsPerSubject[subjectName]); // Debug log
    }

    // Load questions
    loadQuestionsForSubject(subjectName);

    // Set dropdowns & meta fields
    if (outputsPerSubject[subjectName]) {
        const jsonData = JSON.parse(outputsPerSubject[subjectName]);
        if (jsonData.length) setDropdownSelectionsFromMeta(jsonData[0]);
    }

    // Update output panel
    document.getElementById("output").textContent = outputsPerSubject[subjectName] || "";
}



function convertKCETToEditorFormat(rawQList) {
    return rawQList.map(q => {
        const d = q.questionDetails?.[0] || {};
        return {
            questionId: q.questionId,
            text: d.text || "",
            optA: d.possibleAnswers?.A?.text || "",
            optB: d.possibleAnswers?.B?.text || "",
            optC: d.possibleAnswers?.C?.text || "",
            optD: d.possibleAnswers?.D?.text || "",
            correct: d.correctAnswer || "",
            correctText: d.correctAnswerText || "",
            questionImages: d.textImages || [],
            optionImages: {
                A: d.possibleAnswers?.A?.image || "",
                B: d.possibleAnswers?.B?.image || "",
                C: d.possibleAnswers?.C?.image || "",
                D: d.possibleAnswers?.D?.image || ""
            }
        };
    });
}

function populateBoards(boardSelectEl, stateName) {
    boardSelectEl.innerHTML = ""; // clear old
    if (!states[stateName]) return;
    states[stateName].forEach(board => {
        const opt = document.createElement("option");
        opt.value = board;
        opt.textContent = board;
        boardSelectEl.appendChild(opt);
    });
}

function populateSubjects(subjectSelectEl, boardName) {
    subjectSelectEl.innerHTML = ""; // clear old
    if (!boards[boardName]) return;
    boards[boardName].forEach(subj => {
        const opt = document.createElement("option");
        opt.value = subj;
        opt.textContent = subj;
        subjectSelectEl.appendChild(opt);
    });
}



// Small helper to strip HTML tags
function stripHtml(html) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
}


function parseRawContent() {
    try {
        const raw = document.getElementById("rawContentInput").value.trim();

        if (!raw) {
            throw `❌ No input detected.\n\nPaste questions like:\n\n1. What is ...?\n1) Option A\n2) Option B\n3) Option C\n4) Option D`;
        }

        if (!yearSelect.value || !subjectSelect.value) {
            throw "❌ Please select Year and Subject before parsing.";
        }

        const year = yearSelect.value;
        const subjectInitial = subjectSelect.value.trim().toUpperCase()[0];

        const lines = raw.split("\n").map(line => line.trim()).filter(Boolean);

        let i = 0;
        const newQuestions = [];

        while (i < lines.length) {

            const questionStartMatch = lines[i].match(/^(\d+)\.\s+(.*)/);

            if (questionStartMatch) {
                const questionNumber = questionStartMatch[1];
                let questionText = questionStartMatch[2];

                i++;

                // Collect question text until first '1)' or next question
                while (i < lines.length &&
                !lines[i].match(/^1\)\s+/) &&
                !lines[i].match(/^\d+\.\s+/)) {

                    if (!/!\[.*?\]\(.*?\)/.test(lines[i]) && !/choose the correct answer/i.test(lines[i])) {
                        questionText += ' ' + lines[i];
                    }
                    i++;
                }

                const options = [];
                const missingOptions = [];

                for (let opt = 1; opt <= 4; opt++) {
                    if (i >= lines.length) {
                        missingOptions.push(`${opt})`);
                        continue;
                    }

                    const currentOptionPattern = new RegExp(`^${opt}\\)\\s+`);

                    if (lines[i].match(currentOptionPattern)) {
                        // Current option line
                        let optionText = lines[i].replace(`${opt})`, "").trim();
                        i++;

                        // Collect lines until next option or next question
                        const nextOptionPattern = new RegExp(`^${opt + 1}\\)\\s+`);
                        while (i < lines.length &&
                        !lines[i].match(nextOptionPattern) &&
                        !lines[i].match(/^\d+\.\s+/)) {

                            if (!/!\[.*?\]\(.*?\)/.test(lines[i])) {
                                optionText += " " + lines[i];
                            }
                            i++;
                        }

                        options.push(optionText.trim());
                    } else {
                        // Option is missing
                        missingOptions.push(`${opt})`);
                    }
                }

                if (missingOptions.length > 0) {
                    throw `❌ Error in Question ${questionNumber}: Missing option(s): ${missingOptions.join(", ")}`;
                }

                const sentenceId = `${year}${subjectInitial}Q${questionNumber}`;

                // ✅ Detect type
                let questionType = "mcq";
                if (questionText.includes("____")) {
                    questionType = "fillblank"; // fill in the blank
                } else if (options.length === 2) {
                    questionType = "truefalse";
                }

                newQuestions.push({
                    questionId: sentenceId,
                    text: questionText.trim(),
                    optA: options[0],
                    optB: options[1],
                    optC: options[2],
                    optD: options[3],
                    correct: "",
                    correctText: "",
                    type: questionType, // ✅ Added type
                    questionImages: [],
                    optionImages: { A: "", B: "", C: "", D: "" }
                });

            } else {
                i++;
            }
        }

        questions = newQuestions;
        closeRawContentLoader();
        setActiveQuestion(0);
        renderQuestionList();
        generateJSON();

        alert(`✅ Loaded ${newQuestions.length} questions successfully.`);

    } catch (err) {
        console.error(err);
        showParseErrorDialog(err);
    }
}




function renderQuestions() {
    const container = dom("questionsContainer");
    container.innerHTML = "";

    questions.forEach((q, i) => {
        const card = document.createElement("div");
        card.style.border = "1px solid #ccc";
        card.style.padding = "12px";
        card.style.marginBottom = "10px";
        card.style.borderRadius = "8px";
        card.style.background = "#f9f9f9";

        const title = document.createElement("h4");
        title.textContent = `Q${i + 1} (${q.questionId}): ${q.text}`;

        const questionIdField = document.createElement("input");
        questionIdField.value = q.questionId;
        questionIdField.readOnly = true;
        questionIdField.style.width = "150px";
        questionIdField.style.marginBottom = "8px";

        // Options
        const opts = ["A", "B", "C", "D"];
        const optionFields = opts.map(opt => {
            const input = document.createElement("input");
            input.value = q["opt" + opt];
            input.style.display = "block";
            input.style.marginBottom = "6px";
            input.oninput = (e) => {
                q["opt" + opt] = e.target.value;
                generateJSON();
            };
            return input;
        });

        // Correct answer selector
        const correctSelect = document.createElement("select");
        correctSelect.innerHTML = `<option value="">Select Correct</option>`;
        opts.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            if (q.correct === opt) option.selected = true;
            correctSelect.appendChild(option);
        });
        correctSelect.onchange = (e) => {
            q.correct = e.target.value;
            q.correctText = q["opt" + e.target.value];
            generateJSON();
        };

        // Append to card
        card.appendChild(title);
        card.appendChild(sentenceIdField);
        optionFields.forEach(f => card.appendChild(f));
        card.appendChild(correctSelect);

        // Add to container
        container.appendChild(card);
    });

    generateJSON();
}



function showParseErrorDialog(message) {
    const dialog = document.createElement("div");
    dialog.style.padding = "20px";
    dialog.style.background = "#fff";
    dialog.style.border = "2px solid red";
    dialog.style.borderRadius = "8px";
    dialog.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    dialog.style.maxWidth = "600px";
    dialog.style.margin = "50px auto";
    dialog.style.whiteSpace = "pre-wrap";
    dialog.style.fontFamily = "monospace";
    dialog.style.position = "fixed";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
    dialog.style.zIndex = "9999";

    dialog.innerHTML = `
        <h3 style="color:red;">⚠️ Parse Failed</h3>
        <p>${message}</p>
        <button style="margin-top: 10px; padding: 6px 12px;" onclick="this.parentElement.remove()">Close</button>
    `;

    document.body.appendChild(dialog);
}

function regenerateQuestionIds() {
    if (questions.length === 0) return; // Do nothing if no questions

    const subject = subjectSelect.value.trim().toUpperCase();
    const year = yearSelect.value;

    questions.forEach((q, idx) => {
        const questionNumber = idx + 1;
        const subjectInitial = subject[0] || "S";
        q.questionId = `${year}${subjectInitial}Q${questionNumber}`;
    });

    renderQuestionList();
    renderEditor();
    generateJSON();
}

let generateJson = []; // This should reference your actual generated JSON list

function openKeyAnswerLoader() {
    document.getElementById('keyAnswerModal').style.display = 'block';
}

function closeKeyAnswerLoader() {
    document.getElementById('keyAnswerModal').style.display = 'none';
}

function parseKeyAnswers() {
    const keyInput = document.getElementById("keyAnswerInput").value;

    try {
        const keyAnswers = JSON.parse(keyInput);
        const tutorial = window.currentTutorial; // ✅ Ensure tutorial is loaded

        if (!tutorial || !tutorial.questions) {
            alert("No tutorial data loaded. Please load the tutorial first.");
            return;
        }

        // Create a lookup map for fast access
        const answerMap = {};
        keyAnswers.answers.forEach(item => {
            answerMap[item.questionIndex] = item.correctAnswer;
        });

        tutorial.questions.forEach((q, idx) => {
            const key = q.questionIndex;
            const correctAnswer = answerMap[key];

            if (!correctAnswer) {
                console.warn(`No answer found for questionIndex ${key}`);
                return; // Skip if key answer is missing
            }

            const detail = q.questionDetails && q.questionDetails[0];
            if (!detail || !detail.possibleAnswers) {
                console.warn(`Skipping questionIndex ${key} due to missing questionDetails or possibleAnswers.`);
                return;
            }

            // Get possible answers object (A/B/C/D)
            const possibleAnswers = detail.possibleAnswers;

            // Determine correctAnswerText based on correctAnswer key
            let correctAnswerText;

            if (possibleAnswers && possibleAnswers[correctAnswer]) {
                correctAnswerText = possibleAnswers[correctAnswer].text;
            } else {
                correctAnswerText = "Unknown Option";
            }

            // Set the correct answer and text in questionDetails
            detail.correctAnswer = correctAnswer;
            detail.correctAnswerText = correctAnswerText;

            // Update in-memory 'questions' array if available
            if (questions && questions[idx]) {
                questions[idx].correct = correctAnswer;
                questions[idx].correctText = correctAnswerText;
            }
        });

        alert("Key answers have been successfully mapped to the questions!");

        // Optional: Update the JSON output panel if needed
        const output = document.getElementById("output");
        if (output) {
            output.textContent = JSON.stringify(tutorial, null, 2);
        }

        // ✅ Refresh editor and regenerate JSON
        renderEditor();
        generateJSON();

    } catch (e) {
        alert("Invalid JSON: " + e.message);
        console.error(e);
    }
}


