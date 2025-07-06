const boardSelect = dom("boardSelect"), subjectSelect = dom("subjectSelect"),
    yearSelect = dom("yearSelect"), tutorialIdField = dom("tutorialId");
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

fillBoards();
fillYears();

boardSelect.onchange = updateSubjects;
subjectSelect.onchange = updateTutorialId;
yearSelect.onchange = updateTutorialId;

function updateSubjects() {
    subjectSelect.innerHTML = "<option>Select Subject</option>";
    boards[boardSelect.value]?.forEach(s => subjectSelect.add(new Option(s, s)));
    updateTutorialId();
}

function updateTutorialId() {
    if (boardSelect.value && yearSelect.value && subjectSelect.value) {
        tutorialIdField.value = `${boardSelect.value}_${yearSelect.value}_${subjectSelect.value}`;
    }
}

function addQuestion() {
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
    const q = questions[activeIndex], sbj = subjectSelect.value, yr = yearSelect.value;
    qEditor.innerHTML = `
<h4>Question ${activeIndex + 1}</h4>
<label>Sentence ID:</label><input value="${q.sentenceId}" oninput="questions[${activeIndex}].sentenceId = this.value"/>
<label>Question Text:</label><textarea rows="8" class="question-textarea" oninput="questions[${activeIndex}].text=this.value">${q.text}</textarea>

<!-- Keep title always on top -->
<label style="display:block; margin-top:12px; font-weight:bold;">Upload Q Images:</label>

<!-- Container for image previews -->
<div id="qUrls_${activeIndex}"></div>

<!-- File selector below the fixed title -->
<input type="file" id="uploadInput_${activeIndex}" multiple onchange="handleQImages(event,${activeIndex})"/>



${["A", "B", "C", "D"].map(opt => `
<div class="free">
  <label>Option ${opt}:</label>
  <textarea rows="4" class="option-textarea" oninput="questions[${activeIndex}].opt${opt}=this.value">${q["opt" + opt]}</textarea>
  <input type="file" onchange="handleOptImage(event,${activeIndex},'${opt}')"/>
  <div id="opt${opt}Url_${activeIndex}"></div>
</div>`).join("")}
<label>Correct Answer:</label>
<select onchange="questions[${activeIndex}].correct=this.value">
  <option></option>${["A", "B", "C", "D"].map(o => `<option ${q.correct === o ? "selected" : ""}>${o}</option>`).join("")}
</select>
<label>Correct Answer Text:</label><input value="${q.correctText || ""}" oninput="questions[${activeIndex}].correctText=this.value"/>
`;
}


function handleQImages(ev, index) {
    const files = [...ev.target.files];
    const subject = subjectSelect.value;
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

                const storageRef = ref(getStorage(), `questions/${subject}/${year}/${fileName}`);

                deleteObject(storageRef)
                    .then(() => {
                        wrapper.remove();
                        questions[index].questionImages = questions[index].questionImages.filter(u => u !== url);
                        alert("✅ Image deleted.");
                    })
                    .catch((err) => {
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


function handleOptImage(ev, i, opt) {
    const f = ev.target.files[0];
    const c = subjectSelect.value, y = yearSelect.value;
    const container = dom(`opt${opt}Url_${i}`);
    container.replaceChildren(prog);
    const prog = document.createElement("progress");
    prog.value = 100;
    const done = document.createElement("span");
    done.textContent = " ✅ Uploaded";
    container.append(done);
    container.append(prog);
    window.uploadImageToFirebase = function (file, subject, year, index, suffix, onProgress) {
        return new Promise((resolve, reject) => {
            const fileName = `${subject.toLowerCase()}_${year}_${index + 1}${suffix}`;
            const path = `questions/${subject}/${year}/${fileName}`;
            const storageRef = ref(getStorage(), path);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(Math.round(percent));
                },
                (error) => reject(error),
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
                }
            );
        });
    };

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
    const tId = tutorialIdField.value, ttl = dom("tutorialTitle").value, aid = dom("authorityExamId").value;
    const out = questions.map((q, i) => ({
        questionId: (i + 1).toString(),
        questionDetails: [{
            sentenceId: parseInt(q.sentenceId) || 0,
            text: q.text,
            textImages: q.questionImages || [],
            possibleAnswers: {
                A: {text: q.optA, image: q.optionImages?.A || null},
                B: {text: q.optB, image: q.optionImages?.B || null},
                C: {text: q.optC, image: q.optionImages?.C || null},
                D: {text: q.optD, image: q.optionImages?.D || null},
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

for (let i = 0; i < 60; i++) addQuestion();
