# 🌳 Advanced Markdown Editor PWA

An installable Progressive Web App (PWA) built for ChromeOS and modern browsers.

This editor features:
* **Three Panes:** Plain Text, Markdown Source, and Live Preview.
* **PWA Ready:** Installable app with offline support (via `sw.js`).
* **File Explorer:** Local document management using browser storage.
* **AI Assistant:** Optional integration with the Gemini API for summarization, expansion, and rewriting.
* **Export:** Download as MD, HTML, or export as PDF.

## 🚀 Installation on Chromebook

1.  Ensure you have Linux enabled.
2.  Clone this repository to your Linux environment.
3.  Navigate to the project folder in your terminal.
4.  Run the local server: `python3 -m http.server 8000`
5.  Go to `http://localhost:8000` in Chrome and click the **Install** icon.

## 🛠️ Dependencies

This project utilizes the following client-side libraries via CDN:
* `marked.js` for Markdown parsing.
* `DOMPurify` for security in the preview pane.
* `highlight.js`, `KaTeX`, and `Mermaid` for rich content rendering.
* `html2pdf.js` for PDF export.

Copyright (C) [2025] [Alwin Chemmannoor Sheejoy]

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.