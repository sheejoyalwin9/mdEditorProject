/* Extended editor script.js
   Adds:
   - dual editors (text <-> markdown)
   - markdown -> text reverse mode
   - folder explorer (localStorage)
   - AI assistant (local features + optional OpenAI)
   - pdf export (html2pdf)
   - PWA registration done in index.html (sw.js must be created)
*/
/*
 * Copyright (C) [2025] [Alwin Chemmannoor Sheejoy]
 *
 * This file is part of the Advanced Markdown Editor PWA.
 *
 * This software is licensed under the GNU General Public License, Version 3.
 * See the accompanying LICENSE file for details.
 */
// (rest of your script.js code)
// Elements
const textEditor = document.getElementById('textEditor'); // plain text pane
const editor = document.getElementById('editor'); // markdown pane
const preview = document.getElementById('preview');

const toolbar = document.getElementById('toolbar');
const imgUpload = document.getElementById('imgUpload');
const fileOpen = document.getElementById('fileOpen');

const createFileBtn = document.getElementById('createFile');
const fileListEl = document.getElementById('fileList');
const saveDocBtn = document.getElementById('saveDoc');
const newDocBtn = document.getElementById('newDoc');
const downloadMd = document.getElementById('downloadMd');
const downloadHtml = document.getElementById('downloadHtml');
const exportPdf = document.getElementById('exportPdf');
const themeToggle = document.getElementById('themeToggle');
const status = document.getElementById('status');

const aiPanel = document.getElementById('aiPanel');
const aiRun = document.getElementById('aiRun');
const aiAction = document.getElementById('aiAction');
const aiPrompt = document.getElementById('aiPrompt');
const aiOutput = document.getElementById('aiOutput');
const insertAi = document.getElementById('insertAi');
const copyAi = document.getElementById('copyAi');
const aiClose = document.getElementById('aiClose');
const openAiKeyInput = document.getElementById('openAiKey');
const importMdBtn = document.getElementById('importMd');
const clearAllBtn = document.getElementById('clearAll');

// Storage keys
const SAVE_KEY = 'mdeditor_autosave_v1';
const FILES_KEY = 'mdeditor_files_v1';
const THEME_KEY = 'mdeditor_theme';

// Explorer state
let files = {}; // {id: {name, content, updated}}
let currentFileId = null;

// initialize marked
marked.setOptions({ gfm: true, breaks: true });

// helper: sanitize
function safeHtml(html) {
  return DOMPurify.sanitize(html, {USE_PROFILES: {html: true}});
}

// ---------- Editor sync logic (two-way) ----------
// Convert Markdown -> plain text (reverse)
// This is best-effort: remove markdown formatting, keep content structure.
function markdownToPlain(md) {
  let t = md;
  // Replace fenced code blocks with their content
  t = t.replace(/```[\s\S]*?```/g, match => {
    return match.replace(/```/g, '');
  });
  // Remove images but keep alt text
  t = t.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1');
  // Links -> keep text
  t = t.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Headings -> keep text
  t = t.replace(/^#{1,6}\s*/gm, '');
  // Remove emphasis chars
  t = t.replace(/(\*\*|__)(.*?)\1/g, '$2');
  t = t.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove blockquote markers
  t = t.replace(/^\s*>\s?/gm, '');
  // Remove lists markers
  t = t.replace(/^\s*[-*+]\s+/gm, '');
  t = t.replace(/^\s*\d+\.\s+/gm, '');
  // Remove remaining backticks
  t = t.replace(/`/g, '');
  return t;
}

// Convert plain text -> (simple) markdown (identity here, but you can expand)
function plainToMarkdown(text) {
  // For now, treat plain text as markdown (no change)
  return text;
}

// Render pipeline: markdown -> html preview, mermaid, katex, highlight
function render() {
  try {
    const md = editor.value;
    let html = marked.parse(md);
    html = safeHtml(html);
    preview.innerHTML = html;

    // mermaid blocks
    const mermaidNodes = preview.querySelectorAll('code.language-mermaid, pre code.language-mermaid');
    mermaidNodes.forEach(node => {
      const code = node.textContent;
      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = code;
      const parent = node.closest('pre') || node;
      parent.replaceWith(container);
    });
    try { mermaid.initialize({startOnLoad:false}); mermaid.init(undefined, preview); } catch(e){}

    // highlight
    try { hljs.highlightAll(); } catch(e){}

    // KaTeX
    try {
      renderMathInElement(preview, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });
    } catch(e){}
  } catch (e) {
    console.error('render error', e);
  }
}

// initial content/load
editor.value = localStorage.getItem(SAVE_KEY) || `# Welcome

Start editing...`;

textEditor.value = markdownToPlain(editor.value);
render();

// Keep editors in sync:
// typing in markdown updates preview and plain text
editor.addEventListener('input', () => {
  localStorage.setItem(SAVE_KEY, editor.value);
  textEditor.value = markdownToPlain(editor.value);
  render();
  status.textContent = 'Autosave: ' + new Date().toLocaleTimeString();
});

// typing in plain text updates markdown (simple conversion)
textEditor.addEventListener('input', () => {
  editor.value = plainToMarkdown(textEditor.value);
  render();
  localStorage.setItem(SAVE_KEY, editor.value);
});

// ---------- Toolbar actions ----------
function wrapSelection(before, after = '') {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;
  const selected = text.slice(start, end);
  const newText = text.slice(0, start) + before + selected + after + text.slice(end);
  editor.value = newText;
  editor.focus();
  editor.selectionStart = start + before.length;
  editor.selectionEnd = start + before.length + selected.length;
  // sync
  textEditor.value = markdownToPlain(editor.value);
  render();
}
toolbar.addEventListener('click', (e) => {
  if (e.target.tagName !== 'BUTTON') return;
  const cmd = e.target.dataset.cmd;
  if (!cmd) return;
  switch (cmd) {
    case 'bold': wrapSelection('**','**'); break;
    case 'italic': wrapSelection('*','*'); break;
    case 'h1': wrapSelection('# '); break;
    case 'ul': wrapSelection('- '); break;
    case 'code': wrapSelection('```\n','\n```'); break;
    case 'link': {
      const url = prompt('Enter URL','https://');
      if (!url) return;
      wrapSelection('[', `](${url})`);
      break;
    }
  }
});

// ---------- Image upload ----------
imgUpload.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imgMd = `\n\n![](${reader.result})\n\n`;
    const pos = editor.selectionStart;
    editor.value = editor.value.slice(0, pos) + imgMd + editor.value.slice(pos);
    textEditor.value = markdownToPlain(editor.value);
    render();
  };
  reader.readAsDataURL(f);
  imgUpload.value = '';
});

// ---------- File Explorer (localStorage) ----------
function loadFilesFromStorage() {
  const raw = localStorage.getItem(FILES_KEY);
  files = raw ? JSON.parse(raw) : {};
  renderFileList();
}
function saveFilesToStorage() {
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
}
function renderFileList() {
  fileListEl.innerHTML = '';
  const keys = Object.keys(files).sort((a,b)=> files[b].updated - files[a].updated);
  if (keys.length === 0) {
    fileListEl.innerHTML = '<li style="opacity:.6">No files</li>';
    return;
  }
  keys.forEach(id => {
    const f = files[id];
    const li = document.createElement('li');
    li.textContent = f.name;
    if (id === currentFileId) li.classList.add('active');
    const del = document.createElement('button');
    del.textContent = '🗑';
    del.title = 'Delete';
    del.onclick = (ev) => {
      ev.stopPropagation();
      if (!confirm('Delete "' + f.name + '"?')) return;
      delete files[id];
      if (currentFileId === id) currentFileId = null;
      saveFilesToStorage();
      renderFileList();
    };
    li.appendChild(del);
    li.onclick = () => { openFile(id); };
    fileListEl.appendChild(li);
  });
}
function createFile(name = 'Untitled') {
  const id = 'f_' + Date.now();
  files[id] = { name, content: editor.value, updated: Date.now() };
  currentFileId = id;
  saveFilesToStorage();
  renderFileList();
  alert('File created: ' + name);
}
function openFile(id) {
  if (!files[id]) return;
  currentFileId = id;
  editor.value = files[id].content;
  textEditor.value = markdownToPlain(editor.value);
  render();
  saveCurrentFile();
  renderFileList();
}
function saveCurrentFile() {
  if (!currentFileId) {
    // ask to create
    const name = prompt('Enter filename', 'Untitled.md');
    if (!name) return;
    createFile(name);
    return;
  }
  files[currentFileId].content = editor.value;
  files[currentFileId].updated = Date.now();
  saveFilesToStorage();
  renderFileList();
  status.textContent = 'Saved: ' + files[currentFileId].name;
}

createFileBtn.addEventListener('click', () => {
  const name = prompt('File name', 'Untitled.md');
  if (!name) return;
  createFile(name);
});
saveDocBtn.addEventListener('click', () => saveCurrentFile());
newDocBtn.addEventListener('click', () => {
  editor.value = '';
  textEditor.value = '';
  currentFileId = null;
  render();
});
importMdBtn.addEventListener('click', () => fileOpen.click());
fileOpen.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.value = reader.result;
    textEditor.value = markdownToPlain(editor.value);
    render();
    // optionally save as new file
    const name = prompt('Save as filename?', f.name);
    if (name) {
      createFile(name);
      files[currentFileId].content = editor.value;
      saveFilesToStorage();
      renderFileList();
    }
  };
  reader.readAsText(f);
  fileOpen.value = '';
});
clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear all saved files?')) return;
  files = {};
  saveFilesToStorage();
  renderFileList();
});

// load initial explorer
loadFilesFromStorage();

// ---------- Download helpers ----------
function download(filename, content, mime) {
  const a = document.createElement('a');
  const blob = new Blob([content], {type: mime});
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
downloadMd.addEventListener('click', () => download('document.md', editor.value, 'text/markdown;charset=utf-8'));
downloadHtml.addEventListener('click', () => {
  const snapshot = `<!doctype html><html><head><meta charset="utf-8"><title>Export</title></head><body>${preview.innerHTML}</body></html>`;
  download('document.html', snapshot, 'text/html;charset=utf-8');
});
exportPdf.addEventListener('click', () => {
  // small config, element = preview
  const opt = { margin:0.5, filename:'document.pdf', html2canvas:{scale:1}, jsPDF:{unit:'in',format:'a4',orientation:'portrait'} };
  html2pdf().set(opt).from(preview).save();
});

// ---------- Splitter dragging ----------
const splitter = document.getElementById('splitter');
const splitter2 = document.getElementById('splitter2');
let dragging = false, dragging2 = false;

splitter.addEventListener('mousedown', () => { dragging = true; document.body.style.userSelect='none'; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const rect = document.querySelector('.editor-area').getBoundingClientRect();
  const percent = ((e.clientX - rect.left) / rect.width) * 100;
  if (percent < 10 || percent > 80) return;
  document.querySelector('.pane-left').style.flex = `0 0 ${percent}%`;
  document.querySelector('.pane-center').style.flex = `0 0 ${50 - percent/2}%`;
});
window.addEventListener('mouseup', () => { dragging = false; document.body.style.userSelect=''; });

splitter2.addEventListener('mousedown', () => { dragging2 = true; document.body.style.userSelect='none'; });
window.addEventListener('mousemove', (e) => {
  if (!dragging2) return;
  const rect = document.querySelector('.editor-area').getBoundingClientRect();
  const percent = ((e.clientX - rect.left) / rect.width) * 100;
  if (percent < 20 || percent > 95) return;
  document.querySelector('.pane-center').style.flex = `0 0 ${percent - 20}%`;
  document.querySelector('.pane-right').style.flex = `0 0 ${100 - percent}%`;
});
window.addEventListener('mouseup', () => { dragging2 = false; document.body.style.userSelect=''; });

// ---------- Theme toggle ----------
const root = document.documentElement;
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) root.dataset.theme = savedTheme;
if (root.dataset.theme === 'dark') themeToggle.textContent = 'Light';
themeToggle.addEventListener('click', () => {
  if (root.dataset.theme === 'dark') { root.dataset.theme = ''; themeToggle.textContent='Dark'; localStorage.removeItem(THEME_KEY); }
  else { root.dataset.theme='dark'; themeToggle.textContent='Light'; localStorage.setItem(THEME_KEY,'dark'); }
});

// ---------- AI Assistant (local + optional OpenAI) ----------
aiClose.addEventListener('click', () => { aiPanel.style.display = 'none'; });
document.getElementById('aiRun').addEventListener('click', async () => {
  const action = aiAction.value;
  const promptExtra = aiPrompt.value || '';
  const selection = editor.value.substring(editor.selectionStart, editor.selectionEnd) || editor.value;
  aiOutput.textContent = 'Processing...';

  // If user provided OpenAI key, call the API (user responsibility).
  const apiKey = openAiKeyInput.value.trim();
  if (apiKey) {
    try {
      // Use fetch to call OpenAI Chat Completions (note: user must supply valid key & CORS may block).
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // user can modify
          messages: [{role:'user', content: `${action}: ${promptExtra}\n\n${selection}`}],
          max_tokens: 800
        })
      });
      if (!res.ok) {
        const err = await res.text();
        aiOutput.textContent = 'OpenAI error: ' + res.status + ' ' + err;
        return;
      }
      const j = await res.json();
      const text = j.choices?.[0]?.message?.content || JSON.stringify(j);
      aiOutput.textContent = text;
      return;
    } catch (e) {
      aiOutput.textContent = 'OpenAI call failed: ' + e.message;
      return;
    }
  }

  // Local simple transformations (no external calls)
  let out = '';
  switch(action) {
    case 'summarize':
      // very simple summarizer: take first 3 sentences
      out = selection.split(/(?<=[.?!])\s+/).slice(0,3).join(' ');
      if (!out) out = selection.slice(0,200) + (selection.length>200 ? '…' : '');
      if (promptExtra) out = `(${promptExtra})\n\n` + out;
      break;
    case 'expand':
      out = selection + '\n\n' + (promptExtra || 'Additional detail: ') + '— Add more content here.\n';
      break;
    case 'rewrite':
      out = selection.split('\n').map(l => l.trim()).join(' ');
      out = out + '\n\n' + '(Rewritten: ' + (promptExtra || 'polished') + ')';
      break;
    case 'extract_headings':
      const matches = selection.match(/^#{1,6}\s*(.+)$/gm);
 //     out = matches ? matches.map(h=>h.replace(/^#{1,6}\s*/,'')).join('\n') : 'No headings found';
      break;
    default:
      out = 'Unknown action';
  }
  aiOutput.textContent = out;
});

insertAi.addEventListener('click', () => {
  const val = aiOutput.textContent || '';
  const pos = editor.selectionEnd || editor.value.length;
  editor.value = editor.value.slice(0,pos) + '\n\n' + val + '\n\n' + editor.value.slice(pos);
  textEditor.value = markdownToPlain(editor.value);
  render();
});
copyAi.addEventListener('click', () => {
  navigator.clipboard.writeText(aiOutput.textContent || '').then(()=> alert('Copied'));
});


// ---------- keyboard shortcuts ----------
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s') {
    e.preventDefault();
    saveCurrentFile();
  }
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='b') {
    e.preventDefault(); wrapSelection('**','**');
  }
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='i') {
    e.preventDefault(); wrapSelection('*','*');
  }
});

// ---------- initial render & autosave ----------
render();
status.textContent = 'Autosave: ready';

// autosave interval
setInterval(()=> {
  localStorage.setItem(SAVE_KEY, editor.value);
  if (currentFileId) {
    files[currentFileId].content = editor.value;
    files[currentFileId].updated = Date.now();
    saveFilesToStorage();
  }
}, 5000);
