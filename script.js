const boardSelect = document.getElementById("boardSelect");
const yearSelect = document.getElementById("yearSelect");
const subjectSelect = document.getElementById("subjectSelect");
const tutorialIdDisplay = document.getElementById("tutorialIdDisplay");

// Populate board dropdown
function populateBoards() {
  Object.keys(boards).forEach(board => {
    const option = document.createElement("option");
    option.value = board;
    option.textContent = board;
    boardSelect.appendChild(option);
  });
}

// Populate years
function populateYears() {
  for (let year = 2004; year <= 2025; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}

// Populate subjects when board is selected
function updateSubjects() {
  const board = boardSelect.value;
  subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
  if (boards[board]) {
    boards[board].forEach(subject => {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });
  }
}

// Generate tutorial ID
function generateTutorialId() {
  const board = boardSelect.value;
  const year = yearSelect.value;
  const subject = subjectSelect.value;
  if (board && year && subject) {
    tutorialIdDisplay.textContent = `Tutorial ID: ${board}_${year}_${subject}`;
  } else {
    tutorialIdDisplay.textContent = "";
  }
}

// Initial load
populateBoards();
populateYears();

// Event listeners
boardSelect.addEventListener("change", () => {
  updateSubjects();
  generateTutorialId();
});
yearSelect.addEventListener("change", generateTutorialId);
subjectSelect.addEventListener("change", generateTutorialId);