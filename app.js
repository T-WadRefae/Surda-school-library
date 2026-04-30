// ════════════════════════════════════════════════════
// مكتبة مدرسة سردا الأساسية المختلطة
// المعلمة: T. Wad Refae
// app.js — متوافق مع الجرد الرسمي
// ════════════════════════════════════════════════════

const API_URL    = "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec";
const ADMIN_PASS = "Surda123surda";

let allBooks         = [];
let isAdmin          = false;
let pendingDeleteRow = null;
let editingRow       = null;
let parsedFileBooks  = [];

// ─── التنقل ───
function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  setTimeout(() => document.getElementById("adminPwd")?.focus(), 100);
}
function hideLogin() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("adminPwd").value = "";
  document.getElementById("loginErr").classList.add("hidden");
}
function doLogin() {
  const pw = document.getElementById("adminPwd").value;
  if (pw === ADMIN_PASS) {
    isAdmin = true;
    hideLogin();
    document.getElementById("studentView").classList.add("hidden");
    document.getElementById("adminView").classList.remove("hidden");
    renderAdminBooks(allBooks);
    updateAdminStats(allBooks);
    toast("✅ مرحباً، المعلمة Wad Refae");
  } else {
    document.getElementById("loginErr").classList.remove("hidden");
    document.getElementById("adminPwd").value = "";
    document.getElementById("adminPwd").focus();
  }
}
function switchToStudent() {
  document.getElementById("adminView").classList.add("hidden");
  document.getElementById("studentView").classList.remove("hidden");
  toast("👁️ واجهة الطالب");
}
function logout() {
  isAdmin = false;
  document.getElementById("adminView").classList.add("hidden");
  document.getElementById("studentView").classList.remove("hidden");
  toast("تم تسجيل الخروج");
}
function switchTab(name) {
  document.querySelectorAll(".admin-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p =>
    p.classList.toggle("active", p.id === `tab-${name}`));
}

// ─── تحميل الكتب ───
async function loadBooks() {
  showStudentState("loading");
  if (isAdmin) showAdminState("loading");
  try {
    const res = await fetch(`${API_URL}?action=getBooks`, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    allBooks = data.books || [];
    renderStudentBooks(allBooks);
    updateStudentStats(allBooks);
    if (isAdmin) {
      renderAdminBooks(allBooks);
      updateAdminStats(allBooks);
    }
  } catch (err) {
    showStudentState("error");
    document.getElementById("errorMsg").textContent =
      "تعذّر الاتصال بالخادم. تأكد من ربط رابط API في app.js";
  }
}

// ════════════════════════════════════════════════════
// واجهة الطالب
// ════════════════════════════════════════════════════
function renderStudentBooks(books) {
  const grid = document.getElementById("booksGrid");
  if (!books.length) { showStudentState("noResults"); return; }
  showStudentState("grid");
  grid.innerHTML = books.map(b => studentCard(b)).join("");
}

function studentCard(book) {
  const borrowed = book["الحالة"] === "مُعار";
  const part = book["الجزء"] && book["الجزء"] !== ""
    ? `<span class="part-badge">جزء ${esc(book["الجزء"])}</span>` : "";
  return `
    <div class="book-card clickable ${borrowed ? "borrowed" : ""}" onclick="openBookDetail(${book._row})">
      <div class="book-head">
        <div class="book-emoji">📖</div>
        <div class="book-titlebox">
          <div class="book-title">${esc(book["اسم الكتاب"])} ${part}</div>
          <div class="book-author">${esc(book["المؤلف"] || "مؤلف غير محدد")}</div>
        </div>
      </div>
      <div class="book-tags">
        ${book["رقم التصنيف المكتبي"] ? `<span class="tag">رقم: ${esc(book["رقم التصنيف المكتبي"])}</span>` : ""}
        <span class="tag ${borrowed ? "borrowed" : "available"}">
          ${borrowed ? "🔴 مُعار" : "✅ متوفر"}
        </span>
      </div>
      <div class="book-meta-row">
        <span>📄 سجل ${esc(book["رقم صفحة السجل"] || "—")}</span>
        <span>🔢 #${esc(book["الرقم المتسلسل"] || "")}</span>
      </div>
    </div>
  `;
}

function filterBooks() {
  const q  = document.getElementById("searchInput").value.trim().toLowerCase();
  const st = document.getElementById("statusFilter").value;
  renderStudentBooks(applyFilter(allBooks, q, st));
}

function updateStudentStats(books) {
  document.getElementById("statTotal").textContent     = books.length;
  document.getElementById("statAvailable").textContent = books.filter(b => b["الحالة"] === "متوفر").length;
  document.getElementById("statBorrowed").textContent  = books.filter(b => b["الحالة"] === "مُعار").length;
}

function showStudentState(state) {
  ["loadingState","errorState","booksGrid","noResults"].forEach(id =>
    document.getElementById(id).classList.add("hidden"));
  const map = { loading: "loadingState", error: "errorState", grid: "booksGrid", noResults: "noResults" };
  document.getElementById(map[state]).classList.remove("hidden");
}

function openBookDetail(row) {
  const b = allBooks.find(x => x._row === row);
  if (!b) return;
  const borrowed = b["الحالة"] === "مُعار";
  document.getElementById("bookModalBody").innerHTML = `
    <div class="detail-icon">📖</div>
    <div class="detail-title">${esc(b["اسم الكتاب"])}</div>
    <div class="detail-author">✍️ ${esc(b["المؤلف"] || "غير محدد")}</div>
    <div class="detail-tags">
      ${b["الجزء"] ? `<span class="tag">جزء ${esc(b["الجزء"])}</span>` : ""}
      <span class="tag ${borrowed ? "borrowed" : "available"}">
        ${borrowed ? "🔴 مُعار حالياً" : "✅ متوفر"}
      </span>
    </div>
    <div class="detail-row"><span>الرقم المتسلسل</span><span>${esc(b["الرقم المتسلسل"] || "")}</span></div>
    ${b["رقم التصنيف المكتبي"] ? `<div class="detail-row"><span>رقم التصنيف المكتبي</span><span>${esc(b["رقم التصنيف المكتبي"])}</span></div>` : ""}
    <div class="detail-row"><span>رقم صفحة السجل</span><span>${esc(b["رقم صفحة السجل"] || "—")}</span></div>
    ${b["ملاحظات"] ? `<div class="detail-row"><span>ملاحظات</span><span>${esc(b["ملاحظات"])}</span></div>` : ""}
  `;
  document.getElementById("bookModal").classList.remove("hidden");
}
function closeBookModal() {
  document.getElementById("bookModal").classList.add("hidden");
}

// ════════════════════════════════════════════════════
// واجهة المعلم
// ════════════════════════════════════════════════════
function renderAdminBooks(books) {
  const grid = document.getElementById("adminBooksGrid");
  if (!books.length) { showAdminState("noResults"); return; }
  showAdminState("grid");
  grid.innerHTML = books.map(b => adminCard(b)).join("");
}

function adminCard(book) {
  const borrowed = book["الحالة"] === "مُعار";
  const part = book["الجزء"] && book["الجزء"] !== ""
    ? `<span class="part-badge">جزء ${esc(book["الجزء"])}</span>` : "";
  return `
    <div class="book-card ${borrowed ? "borrowed" : ""}">
      <div class="book-head">
        <div class="book-emoji">📖</div>
        <div class="book-titlebox">
          <div class="book-title">${esc(book["اسم الكتاب"])} ${part}</div>
          <div class="book-author">${esc(book["المؤلف"] || "مؤلف غير محدد")}</div>
        </div>
      </div>
      <div class="book-tags">
        ${book["رقم التصنيف المكتبي"] ? `<span class="tag">رقم: ${esc(book["رقم التصنيف المكتبي"])}</span>` : ""}
        <span class="tag ${borrowed ? "borrowed" : "available"}">
          ${borrowed ? "🔴 مُعار" : "✅ متوفر"}
        </span>
      </div>
      <div class="book-meta-row">
        <span>📄 سجل ${esc(book["رقم صفحة السجل"] || "—")}</span>
        <span>🔢 #${esc(book["الرقم المتسلسل"] || "")}</span>
      </div>
      ${borrowed ? `<div class="book-borrower">👤 المستعير: <strong>${esc(book["المستعير"] || "")}</strong> — ${esc(book["تاريخ الإعارة"] || "")}</div>` : ""}
      <div class="book-actions">
        ${borrowed
          ? `<button class="btn btn-success btn-flex" onclick="doReturn(${book._row})">↩️ إرجاع</button>`
          : `<button class="btn btn-success btn-flex" onclick="openBorrow(${book._row})">📤 إعارة</button>`}
        <button class="btn btn-ghost"  onclick="openEdit(${book._row})">✏️</button>
        <button class="btn btn-icon"   onclick="askDelete(${book._row})">🗑️</button>
      </div>
    </div>
  `;
}

function adminFilterBooks() {
  const q  = document.getElementById("adminSearch").value.trim().toLowerCase();
  const st = document.getElementById("adminStatusFilter").value;
  renderAdminBooks(applyFilter(allBooks, q, st));
}

function updateAdminStats(books) {
  document.getElementById("aStatTotal").textContent     = books.length;
  document.getElementById("aStatAvailable").textContent = books.filter(b => b["الحالة"] === "متوفر").length;
  document.getElementById("aStatBorrowed").textContent  = books.filter(b => b["الحالة"] === "مُعار").length;
}

function showAdminState(state) {
  ["adminLoading","adminBooksGrid","adminNoResults"].forEach(id =>
    document.getElementById(id).classList.add("hidden"));
  const map = { loading: "adminLoading", grid: "adminBooksGrid", noResults: "adminNoResults" };
  document.getElementById(map[state]).classList.remove("hidden");
}

// ─── إضافة كتاب ───
async function addBook() {
  const title = document.getElementById("bookTitle").value.trim();
  if (!title) { showMsg("addMsg", "❌ أدخل اسم الكتاب", "error"); return; }
  const book = {
    "اسم الكتاب":          title,
    "المؤلف":              document.getElementById("bookAuthor").value.trim(),
    "الجزء":               document.getElementById("bookPart").value.trim(),
    "رقم التصنيف المكتبي":  document.getElementById("bookClass").value.trim(),
    "رقم صفحة السجل":      document.getElementById("bookPage").value.trim(),
    "ملاحظات":             document.getElementById("bookNotes").value.trim()
  };
  try {
    const res = await apiPost({ action: "addBook", password: ADMIN_PASS, book });
    if (res.error) throw new Error(res.error);
    showMsg("addMsg", "✅ " + res.message, "success");
    ["bookTitle","bookAuthor","bookPart","bookClass","bookPage","bookNotes"]
      .forEach(id => document.getElementById(id).value = "");
    await loadBooks();
  } catch (e) {
    showMsg("addMsg", "❌ " + e.message, "error");
  }
}

// ─── استيراد ملف ───
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("fileInfo").innerHTML = `📄 <strong>${esc(file.name)}</strong> — جارٍ القراءة...`;
  document.getElementById("fileInfo").classList.remove("hidden");
  document.getElementById("filePreview").innerHTML = "";
  document.getElementById("importFileBtn").classList.add("hidden");

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });

      // البحث عن أفضل ورقة
      let sheet = null;
      let rows = [];
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        // محاولة قراءة برأس الصف 0، ثم 5، ثم 6 (لملف الجرد الرسمي)
        for (const headerRow of [0, 5, 6]) {
          const tmp = XLSX.utils.sheet_to_json(ws, {
            defval: "", range: headerRow
          });
          if (tmp.length > 0 && tmp.some(r => r["اسم الكتاب"] || r["اسم الكتاب "] || r["title"] || r["Title"])) {
            sheet = name;
            rows = tmp;
            break;
          }
        }
        if (rows.length) break;
      }

      if (!rows.length) {
        document.getElementById("fileInfo").innerHTML =
          `⚠️ لم نجد كتباً صالحة. تأكد من وجود عمود "اسم الكتاب"`;
        return;
      }

      parsedFileBooks = rows.map(r => ({
        "اسم الكتاب":         (r["اسم الكتاب"] || r["اسم الكتاب "] || r["title"] || r["Title"] || "").toString().trim(),
        "المؤلف":             (r["المؤلف"]     || r["author"]      || r["Author"] || "").toString().trim(),
        "الجزء":              (r["الجزء"]      || r["part"]        || "").toString().trim(),
        "رقم التصنيف المكتبي": (r["رقم التصنيف المكتبي"] || r["التصنيف"] || r["category"] || "").toString().trim(),
        "رقم صفحة السجل":     (r["رقم صفحة السجل"] || r["page"]    || "").toString().trim(),
        "ملاحظات":            (r["ملاحظات"]    || r["notes"]       || "").toString().trim()
      })).filter(b => b["اسم الكتاب"] && b["اسم الكتاب"] !== "nan");

      if (!parsedFileBooks.length) {
        document.getElementById("fileInfo").innerHTML = `⚠️ لم نجد كتباً صالحة`;
        return;
      }

      document.getElementById("fileInfo").innerHTML =
        `✅ <strong>${esc(file.name)}</strong> — <strong>${parsedFileBooks.length}</strong> كتاب جاهز للاستيراد`;

      const preview = parsedFileBooks.slice(0, 5);
      document.getElementById("filePreview").innerHTML = `
        <table class="preview-table">
          <thead>
            <tr><th>#</th><th>اسم الكتاب</th><th>المؤلف</th><th>الجزء</th><th>سجل</th></tr>
          </thead>
          <tbody>
            ${preview.map((b, i) => `
              <tr>
                <td>${i+1}</td>
                <td>${esc(b["اسم الكتاب"])}</td>
                <td>${esc(b["المؤلف"]) || "—"}</td>
                <td>${esc(b["الجزء"]) || "—"}</td>
                <td>${esc(b["رقم صفحة السجل"]) || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${parsedFileBooks.length > 5
          ? `<p style="color:var(--text-soft);font-size:.85rem;text-align:center;margin-top:8px">
               ... و ${parsedFileBooks.length - 5} كتاب آخر</p>`
          : ""}
      `;
      document.getElementById("importFileBtn").classList.remove("hidden");

    } catch (err) {
      document.getElementById("fileInfo").innerHTML = `❌ خطأ: ${err.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
}

async function importFromFile() {
  if (!parsedFileBooks.length) return;
  showMsg("importMsg", `⏳ جارٍ استيراد ${parsedFileBooks.length} كتاب...`, "success");
  try {
    // الاستيراد على دفعات (100 في كل مرة) لتجنّب timeout
    const BATCH = 100;
    let totalImported = 0;
    for (let i = 0; i < parsedFileBooks.length; i += BATCH) {
      const batch = parsedFileBooks.slice(i, i + BATCH);
      const res = await apiPost({ action: "importBooks", password: ADMIN_PASS, books: batch });
      if (res.error) throw new Error(res.error);
      totalImported += batch.length;
      showMsg("importMsg", `⏳ تم استيراد ${totalImported} من ${parsedFileBooks.length}...`, "success");
    }
    showMsg("importMsg", `✅ تم استيراد ${totalImported} كتاب للجرد`, "success");
    document.getElementById("fileInput").value = "";
    document.getElementById("fileInfo").classList.add("hidden");
    document.getElementById("filePreview").innerHTML = "";
    document.getElementById("importFileBtn").classList.add("hidden");
    parsedFileBooks = [];
    await loadBooks();
  } catch (e) {
    showMsg("importMsg", "❌ " + e.message, "error");
  }
}

// ─── إعارة ───
function openBorrow(row) {
  const b = allBooks.find(x => x._row === row);
  document.getElementById("adminModalBody").innerHTML = `
    <h3>📤 تسجيل إعارة</h3>
    <p style="color:var(--text-soft);margin:6px 0 16px">الكتاب: <strong>${esc(b["اسم الكتاب"])}</strong></p>
    <div class="form-group">
      <label>اسم المستعير</label>
      <input type="text" id="borrowerName" placeholder="اسم الطالب أو المعلم...">
    </div>
    <div class="modal-actions">
      <button class="btn btn-success" onclick="confirmBorrow(${row})">✅ تأكيد الإعارة</button>
      <button class="btn btn-ghost" onclick="closeAdminModal()">إلغاء</button>
    </div>
  `;
  document.getElementById("adminModal").classList.remove("hidden");
  setTimeout(() => document.getElementById("borrowerName")?.focus(), 100);
}

async function confirmBorrow(row) {
  const borrower = document.getElementById("borrowerName").value.trim();
  if (!borrower) { toast("❌ أدخل اسم المستعير", "error"); return; }
  try {
    const res = await apiPost({ action: "borrow", password: ADMIN_PASS, row, borrower });
    if (res.error) throw new Error(res.error);
    closeAdminModal();
    toast("✅ " + res.message);
    await loadBooks();
  } catch (e) { toast("❌ " + e.message, "error"); }
}

async function doReturn(row) {
  if (!confirm("تسجيل إرجاع هذا الكتاب؟")) return;
  try {
    const res = await apiPost({ action: "returnBook", password: ADMIN_PASS, row });
    if (res.error) throw new Error(res.error);
    toast("✅ " + res.message);
    await loadBooks();
  } catch (e) { toast("❌ " + e.message, "error"); }
}

// ─── تعديل ───
function openEdit(row) {
  const b = allBooks.find(x => x._row === row);
  if (!b) return;
  editingRow = row;
  document.getElementById("adminModalBody").innerHTML = `
    <h3>✏️ تعديل الكتاب</h3>
    <div class="form-row" style="margin-top:14px">
      <div class="form-group full">
        <label>اسم الكتاب *</label>
        <input id="editTitle" type="text" value="${esc(b["اسم الكتاب"])}">
      </div>
      <div class="form-group">
        <label>المؤلف</label>
        <input id="editAuthor" type="text" value="${esc(b["المؤلف"] || "")}">
      </div>
      <div class="form-group">
        <label>الجزء</label>
        <input id="editPart" type="text" value="${esc(b["الجزء"] || "")}">
      </div>
      <div class="form-group">
        <label>رقم التصنيف المكتبي</label>
        <input id="editClass" type="text" value="${esc(b["رقم التصنيف المكتبي"] || "")}">
      </div>
      <div class="form-group">
        <label>رقم صفحة السجل</label>
        <input id="editPage" type="text" value="${esc(b["رقم صفحة السجل"] || "")}">
      </div>
      <div class="form-group full">
        <label>ملاحظات</label>
        <textarea id="editNotes">${esc(b["ملاحظات"] || "")}</textarea>
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveEdit()">💾 حفظ التعديلات</button>
  `;
  document.getElementById("adminModal").classList.remove("hidden");
}

async function saveEdit() {
  const book = {
    "اسم الكتاب":         document.getElementById("editTitle").value.trim(),
    "المؤلف":             document.getElementById("editAuthor").value.trim(),
    "الجزء":              document.getElementById("editPart").value.trim(),
    "رقم التصنيف المكتبي": document.getElementById("editClass").value.trim(),
    "رقم صفحة السجل":     document.getElementById("editPage").value.trim(),
    "ملاحظات":            document.getElementById("editNotes").value.trim()
  };
  if (!book["اسم الكتاب"]) { toast("❌ اسم الكتاب مطلوب", "error"); return; }
  try {
    const res = await apiPost({ action: "updateBook", password: ADMIN_PASS, row: editingRow, book });
    if (res.error) throw new Error(res.error);
    closeAdminModal();
    toast("✅ تم التعديل");
    await loadBooks();
  } catch (e) { toast("❌ " + e.message, "error"); }
}

// ─── حذف ───
function askDelete(row) {
  pendingDeleteRow = row;
  document.getElementById("deleteModal").classList.remove("hidden");
}
function closeDeleteModal() {
  pendingDeleteRow = null;
  document.getElementById("deleteModal").classList.add("hidden");
}
async function confirmDelete() {
  if (!pendingDeleteRow) return;
  try {
    const res = await apiPost({ action: "deleteBook", password: ADMIN_PASS, row: pendingDeleteRow });
    if (res.error) throw new Error(res.error);
    closeDeleteModal();
    toast("✅ تم الحذف");
    await loadBooks();
  } catch (e) { toast("❌ " + e.message, "error"); closeDeleteModal(); }
}
function closeAdminModal() {
  document.getElementById("adminModal").classList.add("hidden");
}

// ════════════════════════════════════════════════════
// مساعدات
// ════════════════════════════════════════════════════
function applyFilter(books, q, st) {
  return books.filter(b => {
    const matchQ = !q ||
      String(b["اسم الكتاب"]||"").toLowerCase().includes(q) ||
      String(b["المؤلف"]||"").toLowerCase().includes(q) ||
      String(b["رقم التصنيف المكتبي"]||"").toLowerCase().includes(q) ||
      String(b["الرقم المتسلسل"]||"").toLowerCase().includes(q);
    const matchSt = !st || b["الحالة"] === st;
    return matchQ && matchSt;
  });
}

async function apiPost(body) {
  const res = await fetch(API_URL, {
    method: "POST", mode: "cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.className = "toast hidden"; }, 3500);
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `msg ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

window.addEventListener("DOMContentLoaded", () => {
  loadBooks();
  const drop = document.getElementById("fileDropZone");
  if (drop) {
    drop.addEventListener("dragover",  e => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", e => {
      e.preventDefault();
      drop.classList.remove("drag");
      const file = e.dataTransfer.files[0];
      if (file) {
        document.getElementById("fileInput").files = e.dataTransfer.files;
        handleFile({ target: { files: [file] } });
      }
    });
  }
});
