"use strict";

let currentFile = null;
let history = [];

const dropZone = document.getElementById("drop-zone");
const dropText = document.getElementById("drop-text");
const fileInput = document.getElementById("file-input");
const categoryBtns = document.querySelectorAll(".category-btn");
const historyBtn = document.getElementById("history-btn");

const categoriesMap = {
  documents: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "json"],
  images: ["jpg", "jpeg", "png", "webp", "svg", "gif", "bmp", "avif"],
  videos: ["mp4", "avi", "mov", "mkv", "webm"],
  audio: ["mp3", "wav", "flac", "aac", "ogg", "m4a"],
  ebooks: ["epub", "mobi", "azw3", "fb2"]
};

const IMAGE_INPUTS = ["jpg", "jpeg", "png", "webp", "svg", "gif", "bmp", "avif"];
const IMAGE_OUTPUTS = ["PNG", "JPG", "WebP"];

function getExtension(filename) {
  const name = filename.split(/[\\/]/).pop();
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}

window.closeModal = closeModal;

function openErrorModal(message) {
  document.getElementById("error-text").textContent = message;
  document.getElementById("error-modal").classList.add("active");
}

function setStatus(message) {
  let status = document.getElementById("conversion-status");
  if (!status) {
    status = document.createElement("p");
    status.id = "conversion-status";
    status.setAttribute("role", "status");
    status.style.cssText =
      "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);" +
      "max-width:90vw;padding:12px 18px;border-radius:12px;" +
      "background:rgba(30,15,50,.92);color:#fff;z-index:200;" +
      "box-shadow:0 4px 20px #0004;text-align:center;";
    document.body.appendChild(status);
  }
  status.textContent = message;
  status.style.display = "block";
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => {
    status.style.display = "none";
  }, 4500);
}

function handleFile(file) {
  if (!file) return;
  currentFile = file;
  dropText.textContent = `Fichier prêt : ${file.name} (${formatBytes(file.size)})`;
  dropZone.style.border = "2px solid #4CAF50";
  dropZone.setAttribute("aria-label", `Fichier sélectionné : ${file.name}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

dropZone.tabIndex = 0;
dropZone.setAttribute("role", "button");
dropZone.setAttribute("aria-label", "Choisir ou déposer un fichier");

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  if (event.dataTransfer.files.length) handleFile(event.dataTransfer.files[0]);
});

fileInput.addEventListener("change", (event) => {
  if (event.target.files.length) handleFile(event.target.files[0]);
});

categoryBtns.forEach((button) => {
  button.addEventListener("click", () => {
    if (!currentFile) {
      openErrorModal("Veuillez d'abord choisir ou déposer un fichier dans la zone de gauche.");
      return;
    }

    const category = button.dataset.category;
    const ext = getExtension(currentFile.name);
    const allowed = categoriesMap[category] || [];

    if (!allowed.includes(ext)) {
      openErrorModal(
        `Le fichier sélectionné est au format .${ext || "inconnu"}. ` +
        "Choisissez la catégorie correspondant à ce type de fichier."
      );
      return;
    }

    openConversionModal(category, ext);
  });
});

function getConversionOptions(category, ext) {
  if (category === "documents") {
    if (ext === "txt") {
      return [{
        label: "PDF",
        target: "pdf",
        description: "Créer un document PDF"
      }];
    }

    if (ext === "pdf") {
      return [{
        label: "TXT",
        target: "txt",
        description: "Extraire le texte du PDF"
      }];
    }

    if (ext === "csv") {
      return [{
        label: "JSON",
        target: "json",
        description: "Convertir le tableau en données JSON"
      }];
    }

    if (ext === "json") {
      return [{
        label: "TXT",
        target: "txt",
        description: "Enregistrer les données en texte lisible"
      }];
    }

    return [];
  }

  if (category === "images" && IMAGE_INPUTS.includes(ext)) {
    const sameFormat = ext === "jpeg" ? "JPG" : ext.toUpperCase();

    return IMAGE_OUTPUTS
      .filter((target) =>
        target.toLowerCase() !== sameFormat.toLowerCase()
      )
      .map((target) => ({
        label: target,
        target: target.toLowerCase(),
        description: `Convertir l'image en ${target}`
      }));
  }

  return [];
}

function openConversionModal(category, ext) {
  const title = document.getElementById("conversion-title");
  const list = document.getElementById("conversion-list");

  title.textContent = `Convertir ${currentFile.name}`;
  list.replaceChildren();

  const options = getConversionOptions(category, ext);

  if (!options.length) {
    const message = document.createElement("p");

    message.textContent =
      "Aucune conversion réelle n'est disponible pour ce format dans cette version. " +
      "Les conversions vidéo, audio, ebooks et fichiers Office nécessitent un moteur spécialisé.";

    list.appendChild(message);
    document.getElementById("conversion-modal").classList.add("active");
    return;
  }

  options.forEach((option) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "conversion-btn";
    button.textContent = `Convertir en ${option.label}`;
    button.title = option.description;

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = `Conversion en ${option.label}…`;

      try {
        await convertFile(currentFile, option.target);
        closeModal("conversion-modal");
      } catch (error) {
        closeModal("conversion-modal");
        openErrorModal(`La conversion a échoué : ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });

    list.appendChild(button);
  });

  document.getElementById("conversion-modal").classList.add("active");
}

async function convertFile(file, target) {
  const source = getExtension(file.name);
  let blob;
  let outputName;

  if (source === "txt" && target === "pdf") {
    blob = await txtToPdf(file);
    outputName = replaceExtension(file.name, "pdf");
  } else if (source === "pdf" && target === "txt") {
    blob = await pdfToTxt(file);
    outputName = replaceExtension(file.name, "txt");
  } else if (source === "csv" && target === "json") {
    blob = await csvToJson(file);
    outputName = replaceExtension(file.name, "json");
  } else if (source === "json" && target === "txt") {
    blob = await jsonToTxt(file);
    outputName = replaceExtension(file.name, "txt");
  } else if (
    IMAGE_INPUTS.includes(source) &&
    ["png", "jpg", "webp"].includes(target)
  ) {
    blob = await imageToFormat(file, target);
    outputName = replaceExtension(
      file.name,
      target === "jpg" ? "jpg" : target
    );
  } else {
    throw new Error(
      `La conversion ${source.toUpperCase()} vers ${target.toUpperCase()} n'est pas prise en charge.`
    );
  }

  downloadBlob(blob, outputName);
  addHistory(file.name, target.toUpperCase(), outputName);
  setStatus(`Conversion réussie : ${outputName}`);
}

function replaceExtension(filename, extension) {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base}.${extension}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function txtToPdf(file) {
  const text = await file.text();
  const jsPDF = await loadJsPDF();

  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(text, 180);

  let y = 15;

  for (const line of lines) {
    if (y > 280) {
      pdf.addPage();
      y = 15;
    }

    pdf.text(line, 15, y);
    y += 7;
  }

  return pdf.output("blob");
}

function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) {
    return Promise.resolve(window.jspdf.jsPDF);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error("Impossible de charger la bibliothèque PDF."));
      }
    };

    script.onerror = () => {
      reject(new Error(
        "Connexion Internet nécessaire pour créer le PDF."
      ));
    };

    document.head.appendChild(script);
  });
}

async function pdfToTxt(file) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());

  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str || "")
      .join(" ");

    pages.push(text);
  }

  return new Blob([pages.join("\n\n")], {
    type: "text/plain;charset=utf-8"
  });
}

function loadPdfJs() {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        resolve(window.pdfjsLib);
      } else {
        reject(new Error("Impossible de charger la bibliothèque PDF.js."));
      }
    };

    script.onerror = () => {
      reject(new Error(
        "Connexion Internet nécessaire pour lire le PDF."
      ));
    };

    document.head.appendChild(script);
  });
}

async function csvToJson(file) {
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const rows = parseCsv(text);

  if (!rows.length) {
    throw new Error("Le fichier CSV est vide.");
  }

  const headers = rows[0].map((header, index) => {
    const value = header.trim();
    return value || `colonne_${index + 1}`;
  });

  const data = rows.slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const object = {};

      headers.forEach((header, index) => {
        object[header] = row[index] ?? "";
      });

      return object;
    });

  return new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json;charset=utf-8" }
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !quoted
    ) {
      if (char === "\r" && next === "\n") i++;

      row.push(field);
      rows.push(row);

      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new Error("Le fichier CSV contient des guillemets non fermés.");
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function jsonToTxt(file) {
  const text = await file.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Le fichier JSON n'est pas valide.");
  }

  const output = typeof data === "string"
    ? data
    : JSON.stringify(data, null, 2);

  return new Blob([output], {
    type: "text/plain;charset=utf-8"
  });
}

async function imageToFormat(file, target) {
  const image = await loadImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  if (!canvas.width || !canvas.height) {
    throw new Error("Impossible de lire les dimensions de l'image.");
  }

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Le navigateur ne peut pas traiter cette image.");
  }

  if (target === "jpg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0);

  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp"
  };

  const mime = mimeTypes[target];

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Le navigateur n'a pas pu créer l'image."));
      }
    }, mime, 0.92);
  });

  if (blob.type !== mime) {
    throw new Error(
      `Le navigateur ne prend pas en charge la sortie ${target.toUpperCase()}.`
    );
  }

  return blob;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(
        "Impossible de lire cette image. Son format n'est peut-être pas pris en charge par le navigateur."
      ));
    };

    image.src = url;
  });
}

function loadHistory() {
  try {
    const saved = localStorage.getItem("conversion-history");
    history = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (error) {
    history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(
      "conversion-history",
      JSON.stringify(history)
    );
  } catch (error) {
    console.warn("Impossible d'enregistrer l'historique.", error);
  }
}

function addHistory(originalName, format, outputName) {
  const entry = {
    originalName,
    format,
    outputName,
    date: new Date().toLocaleString("fr-FR")
  };

  history.unshift(entry);
  history = history.slice(0, 50);

  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("history-list");

  if (!list) return;

  list.replaceChildren();

  if (history.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Aucune conversion pour le moment.";
    list.appendChild(message);
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("div");

    item.className = "history-item";
    item.style.cssText =
      "padding:12px;margin:8px 0;border-radius:10px;" +
      "background:rgba(255,255,255,0.08);overflow-wrap:anywhere;";

    const filename = document.createElement("p");
    filename.textContent =
      `${entry.originalName} → ${entry.outputName}`;

    const details = document.createElement("small");
    details.textContent =
      `${entry.format} • ${entry.date}`;

    item.appendChild(filename);
    item.appendChild(details);
    list.appendChild(item);
  });
}

if (historyBtn) {
  historyBtn.addEventListener("click", () => {
    loadHistory();
    renderHistory();

    const modal = document.getElementById("history-modal");

    if (modal) {
      modal.classList.add("active");
    }
  });
}

loadHistory();
renderHistory();

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("active");
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal.active").forEach((modal) => {
      modal.classList.remove("active");
    });
  }
});

console.log("Convertisseur de fichiers chargé avec succès.");
