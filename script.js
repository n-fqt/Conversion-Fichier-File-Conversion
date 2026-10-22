let currentFile = null;
let history = [];

const dropZone = document.getElementById("drop-zone");
const dropText = document.getElementById("drop-text");
const fileInput = document.getElementById("file-input");
const categoryBtns = document.querySelectorAll(".category-btn");
const historyBtn = document.getElementById("history-btn");

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

function handleFile(file) {
  currentFile = file;
  dropText.innerHTML = `Fichier prêt :<br><strong>${file.name}</strong>`;
  dropZone.style.border = "2px solid #4CAF50";
}

const categoriesMap = {
  documents: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
  images: ["jpg", "jpeg", "png", "webp", "svg", "gif", "bmp"],
  videos: ["mp4", "avi", "mov", "mkv", "webm"],
  audio: ["mp3", "wav", "flac", "aac", "ogg"],
  ebooks: ["epub", "mobi", "azw3", "fb2"],
};

categoryBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!currentFile) {
      alert("Veuillez d'abord glisser un fichier à gauche.");
      return;
    }

    const category = btn.getAttribute("data-category");
    const fileExtension = currentFile.name.split(".").pop().toLowerCase();
    const allowedExtensions = categoriesMap[category];

    if (allowedExtensions.includes(fileExtension)) {
      openConversionModal(category, fileExtension);
    } else {
      openErrorModal(
        `Vous avez glissé un fichier .${fileExtension}. Veuillez choisir la bonne catégorie.`,
      );
    }
  });
});

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function openErrorModal(message) {
  document.getElementById("error-text").innerText = message;
  document.getElementById("error-modal").classList.add("active");
}

function openConversionModal(category, ext) {
  document.getElementById("conversion-title").innerText =
    `Convertir ${currentFile.name}`;
  const list = document.getElementById("conversion-list");
  list.innerHTML = "";

  let options = [];
  if (category === "documents") options = ["PDF", "JPG", "Word", "Excel"];
  if (category === "images") options = ["JPG", "PNG", "WebP", "PDF"];
  if (category === "videos")
    options = ["MP4", "AVI", "GIF", "MP3 (Extraire audio)"];
  if (category === "audio") options = ["MP3", "WAV", "FLAC"];
  if (category === "ebooks") options = ["EPUB", "MOBI", "PDF"];

  options.forEach((opt) => {
    if (opt.toLowerCase() !== ext) {
      const btn = document.createElement("button");
      btn.className = "conversion-btn";
      btn.innerText = `Convertir en ${opt}`;
      btn.onclick = () => simulateDownload(opt);
      list.appendChild(btn);
    }
  });

  document.getElementById("conversion-modal").classList.add("active");
}

function simulateDownload(targetFormat) {
  closeModal("conversion-modal");

  const historyItem = {
    name: currentFile.name,
    format: targetFormat,
    date: new Date().toLocaleTimeString(),
  };
  history.unshift(historyItem);

  alert(
    `✅ Conversion de "${currentFile.name}" en ${targetFormat} terminée ! (Simulé)`,
  );

  currentFile = null;
  dropText.innerHTML = "Entrez votre fichier ici";
  dropZone.style.border = "none";
  fileInput.value = "";
}

historyBtn.addEventListener("click", () => {
  const list = document.getElementById("history-list");
  if (history.length === 0) {
    list.innerHTML = "<li>Aucun fichier converti pour le moment.</li>";
  } else {
    list.innerHTML = history
      .map(
        (item) =>
          `<li>📄 <strong>${item.name}</strong> ➡️ ${item.format} <span style="float:right; color:#888; font-size:0.8rem;">${item.date}</span></li>`,
      )
      .join("");
  }
  document.getElementById("history-modal").classList.add("active");
});

window.onclick = function (event) {
  if (event.target.classList.contains("modal-overlay")) {
    event.target.classList.remove("active");
  }
};
