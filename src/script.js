const stateSelect = dom("stateSelect"), boardSelect = dom("boardSelect"), subjectSelect = dom("subjectSelect"),
    yearSelect = dom("yearSelect"),
    tutorialIdField = dom("tutorialId");

dom("previewButton").addEventListener("click", showPreview);
const qList = dom("questionList"), qEditor = dom("questionEditor"), questions = [];
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
};
yearSelect.onchange = () => {
    updateTutorialId();
    renderEditor(); // ⬅️ added
};


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
        conductedByField.value = conductedByMap[board] || "";
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

    questions.push({
        sentenceId: "",
        text: "",
        optA: "",
        optB: "",
        optC: "",
        optD: "",
        correct: "",
        questionImages: [],
        optionImages: {}
    });
    setActiveQuestion(questions.length - 1);
}




function removeQuestion() {
    if (questions.length) questions.pop();
    setActiveQuestion(Math.max(questions.length - 1, 0));
}

function setActiveQuestion(i) {
    activeIndex = i;
    renderQuestionList();
    renderEditor();
}

function renderQuestionList() {
    qList.innerHTML = "";
    questions.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.textContent = i + 1;
        btn.dataset.idx = i;
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

    if (!sbj || !yr || !brd) {
        editor.innerHTML = `<div style="color: red; font-weight: bold; padding: 12px;">
            ❗ Please select <u>Board</u>, <u>Year</u>, and <u>Subject</u> before editing questions.
        </div>`;
        return;
    }

    const q = questions[activeIndex];

    editor.innerHTML = `
<h4>Question ${activeIndex + 1}</h4>

<label>Sentence ID:</label>
<input value="${q.sentenceId}" oninput="questions[${activeIndex}].sentenceId = this.value"/>

<label>Question Text:</label>
<textarea rows="8" class="question-textarea" oninput="questions[${activeIndex}].text=this.value">${q.text}</textarea>

<h5 style="margin-top: 10px;">Uploaded Q Images:</h5>
<div id="qUrls_${activeIndex}">
    ${q.questionImages.map((url, idx) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <img src="${url}" width="50" height="50"/>
            <a href="${url}" target="_blank">Image ${idx + 1}</a>
            <button style="color:red; cursor:pointer;" onclick="removeExistingQImage(${activeIndex}, ${idx})">✖</button>
        </div>
    `).join("")}
</div>

<h5 style="margin-top: 10px;">Upload New Q Images:</h5>
<input type="file" multiple onchange="handleQImages(event,${activeIndex})"/>

${["A", "B", "C", "D"].map((opt, idx) => `
<div class="free" style="margin-top:12px;">
  <label>Option ${opt}:</label>
  <textarea rows="4" class="option-textarea" oninput="questions[${activeIndex}].opt${opt}=this.value">${q["opt" + opt]}</textarea>

  <div id="opt${opt}Url_${activeIndex}">
    ${q.optionImages[opt] ? `
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
<select onchange="questions[${activeIndex}].correct=this.value">
  <option></option>${["A", "B", "C", "D"].map(o => `<option ${q.correct === o ? "selected" : ""}>${o}</option>`).join("")}
</select>

<label>Correct Answer Text:</label>
<input value="${q.correctText || ""}" oninput="questions[${activeIndex}].correctText=this.value"/>
`;
}

function removeExistingQImage(index, imgIdx) {
    if (!confirm("Remove this question image?")) return;
    questions[index].questionImages.splice(imgIdx, 1);
    renderEditor(); // Refresh to reflect changes
}

function removeExistingOptImage(index, opt) {
    if (!confirm("Remove this option image?")) return;
    questions[index].optionImages[opt] = null;
    renderEditor(); // Refresh to reflect changes
}


function handleQImages(ev, index) {
    const files = [...ev.target.files];
    const subject = subjectSelect.value.toLowerCase();
    const year = yearSelect.value;
    const container = dom(`qUrls_${index}`);

    if (!questions[index].questionImages) questions[index].questionImages = [];

    files.forEach((file) => {
        const existingCount = questions[index].questionImages.length;
        const suffix = `_Q${existingCount + 1}`;
        const fileName = `${subject.toLowerCase()}_${year}_${index + 1}${suffix}`;

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

        container.appendChild(wrapper);
        wrapper.append(progress, status);

        uploadImageToFirebase(file, subject, year, index, suffix, percent => {
            progress.value = percent;
        }).then(url => {
            // Save URL in question
            questions[index].questionImages.push(url);

            // Update UI
            status.textContent = "✅ Uploaded";
            thumbnail.src = url;
            thumbnail.style.display = "block";
            link.href = url;
            link.textContent = fileName;

            removeBtn.onclick = () => {
                if (!confirm("Do you want to remove the uploaded image?")) return;
                const { storage, ref, deleteObject } = window.firebaseStorage;
                const storageRef = ref(storage, `questions/${subject}/${year}/${fileName}`);

                deleteObject(storageRef)
                    .then(() => {
                        wrapper.remove();
                        questions[index].questionImages = questions[index].questionImages.filter(u => u !== url);
                        alert("✅ Image deleted.");
                    })
                    .catch(err => {
                        console.error("Failed to delete:", err);
                        alert("❌ Could not delete from Firebase.");
                    });
            };

            wrapper.replaceChildren(thumbnail, link, removeBtn);
        }).catch(err => {
            console.error("Upload failed:", err);
            status.textContent = "❌ Upload failed";
        });
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

        status.textContent = "✅ Uploaded";
        thumbnail.src = url;
        thumbnail.style.display = "block";
        link.href = url;
        link.textContent = fileName;

        removeBtn.onclick = () => {
            if (!confirm("Do you want to remove the uploaded image?")) return;

            const { storage, ref, deleteObject } = window.firebaseStorage;
            const storageRef = ref(storage, path);
            deleteObject(storageRef)
                .then(() => {
                    wrapper.remove();
                    questions[i].optionImages[opt] = null;

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



function removeImage(type, i, optOrUrl, urlMaybe, btn) {
    if (!confirm("Remove this image?")) return;
    const container = btn.parentElement.parentElement;
    if (type === "q") {
        questions[i].questionImages = questions[i].questionImages.filter(u => u !== optOrUrl);
    } else {
        delete questions[i].optionImages[optOrUrl];
    }
    container.replaceChildren(prog);
    renderEditor();
}

function generateJSON() {
    const tId = tutorialIdField.value;
    const ttl = dom("tutorialTitle").value;
    const aid = dom("authorityExamId").value;

    const state = dom("stateSelect").value;
    const board = dom("boardSelect").value;
    const conductedBy = dom("conductedBy").value;
    const year = dom("yearSelect").value;
    const subject = dom("subjectSelect").value;

    const out = questions.map((q, i) => ({
        questionId: (i + 1).toString(),
        questionDetails: [{
            sentenceId: parseInt(q.sentenceId) || 0,
            text: q.text,
            textImages: q.questionImages || [],
            possibleAnswers: {
                A: { text: q.optA, image: q.optionImages?.A || null },
                B: { text: q.optB, image: q.optionImages?.B || null },
                C: { text: q.optC, image: q.optionImages?.C || null },
                D: { text: q.optD, image: q.optionImages?.D || null },
            },
            correctAnswer: q.correct,
            correctAnswerText: q.correctText || "",
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

    dom("output").textContent = JSON.stringify(result, null, 2);
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
            const dt = JSON.parse(e.target.result)[0];
            dom("tutorialTitle").value = dt.tutorialTitle;
            dom("authorityExamId").value = dt.authorityExamId;
            const [b, y, s] = (dt.tutorialId || "").split("_");
            boardSelect.value = b;
            updateSubjects();
            yearSelect.value = y;
            subjectSelect.value = s;
            updateTutorialId();
            questions.length = 0;
            dt.questions.forEach(q => {
                const d = q.questionDetails[0];
                questions.push({
                    sentenceId: d.sentenceId, text: d.text,
                    optA: d.possibleAnswers.A.text,
                    optB: d.possibleAnswers.B.text,
                    optC: d.possibleAnswers.C.text,
                    optD: d.possibleAnswers.D.text,
                    correct: d.correctAnswer, correctText: d.correctAnswerText,
                    questionImages: d.textImages || [], optionImages: {
                        A: d.possibleAnswers.A.image,
                        B: d.possibleAnswers.B.image,
                        C: d.possibleAnswers.C.image,
                        D: d.possibleAnswers.D.image
                    }
                });
            });
            while (questions.length < 60) addQuestion();
            setActiveQuestion(0);
        } catch (err) {
            alert("Invalid JSON");
        }
    };
    r.readAsText(f);
}

function showPreview() {
    generateJSON();

    const previewDiv = dom("previewContent"); // ✅ FIXED ID
    const rawJson = JSON.parse(dom("output").textContent);
    const qList = rawJson[0]?.questions || [];

    let html = `<h3>${rawJson[0]?.tutorialTitle || ""}</h3>`;
    qList.forEach((q, i) => {
        const d = q.questionDetails[0];
        const rendered = convertTablesInText(d.text);

        html += `
        <div style="margin-bottom: 20px;">
           <div>${rendered}</div>
            ${d.textImages?.map(url => `<img src="${url}" height="60"/>`).join(" ") || ""}
            <ul>
                ${["A", "B", "C", "D"].map(opt => {
            const optData = d.possibleAnswers[opt];
            return `<li><b>${opt}:</b> ${optData.text || ""} ${optData.image ? `<img src="${optData.image}" height="40"/>` : ""}</li>`;
        }).join("")}
            </ul>
            <div><b>Answer:</b> ${d.correctAnswer} - ${d.correctAnswerText || ""}</div>
        </div>`;
    });

    previewDiv.innerHTML = html;
    MathJax.typesetPromise([previewDiv]);

    dom("previewPanel").classList.add("open"); // ✅ Ensure preview panel is visible
}


function markdownTableToHtml(markdown) {
    const lines = markdown.trim().split("\n").filter(Boolean);

    if (lines.length < 2) return "";

    let html = "<table>\n";

    const splitRow = line => {
        // Preserve empty cells: split and trim, but don't remove blanks
        return line.split("|").slice(1, -1).map(c => c.trim());
    };

    const headerCellsRaw = splitRow(lines[0]);
    const separatorLine = lines[1];
    const bodyLines = lines.slice(2);

    // Detect merged header row (e.g., 2 cells only in a 4-col table)
    if (headerCellsRaw.length <= 2) {
        html += "<thead><tr>";
        for (const cell of headerCellsRaw) {
            html += `<th colspan="2">${cell}</th>`;
        }
        html += "</tr></thead>\n";
    } else {
        html += "<thead><tr>";
        for (const cell of headerCellsRaw) {
            html += `<th>${cell}</th>`;
        }
        html += "</tr></thead>\n";
    }

    html += "<tbody>\n";
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

