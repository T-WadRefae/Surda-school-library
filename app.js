// ════════════════════════════════════════════════════
// مكتبة مدرسة سردا الأساسية المختلطة
// تصميم: T. Wad Refae
// ════════════════════════════════════════════════════

const API_URL    = "https://script.google.com/macros/s/AKfycbyOVdJ0XWfTG8cpuWjaOVwVKXJ6IxpTxRBnStrVGDC-lqWi0iWQoFsDWYRtJuXv4nECVQ/exec";
const ADMIN_PASS = "Surda123surda";

let allBooks         = [];
let isAdmin          = false;
let pendingDeleteRow = null;
let editingRow       = null;
let parsedFileBooks  = [];
let currentCategory  = null;
let stopGeneration   = false; // للتوقف عند الطلب

// ─── التصنيفات ───
const CATEGORIES = [
  { key: "religious",  name: "ديني وإسلامي",   icon: "🕌" },
  { key: "palestine",  name: "فلسطين والقضية", icon: "🇵🇸" },
  { key: "history",    name: "تاريخ وحضارة",   icon: "🏛️" },
  { key: "science",    name: "علوم ومعارف",    icon: "🔬" },
  { key: "literature", name: "أدب وشعر",       icon: "✒️" },
  { key: "stories",    name: "قصص وروايات",    icon: "📖" },
  { key: "children",   name: "قصص أطفال",      icon: "🧸" },
  { key: "english",    name: "كتب باللغة الإنجليزية", icon: "🇬🇧" },
  { key: "encycl",     name: "موسوعات ومراجع", icon: "📚" },
  { key: "language",   name: "لغات وقواعد",    icon: "🔤" },
  { key: "nature",     name: "طبيعة وبيئة",   icon: "🌿" },
  { key: "general",    name: "متنوعات",       icon: "📕" }
];

// ─── تحديد لون الغلاف ───
function getCoverInfo(book) {
  const title = String(book["اسم الكتاب"] || "");
  const t = title.toLowerCase();

  const englishLetters = (title.match(/[a-zA-Z]/g) || []).length;
  const arabicLetters  = (title.match(/[\u0600-\u06FF]/g) || []).length;
  if (englishLetters >= 3 && englishLetters > arabicLetters) {
    return { class: "english", icon: "🇬🇧" };
  }
  if (/(english|british|american|grammar lesson|reader|story book)/.test(t))
    return { class: "english", icon: "🇬🇧" };

  if (/(أطفال|طفل|للأطفال|للصغار|الصغار|روضة|كتكوت|أرنوب|دبدوب|عصفور|قط|الفأر|الأرنب|الدب|بطوط|ميكي|كان يا ما كان|سندريلا|بياض الثلج|الأقزام)/.test(t))
    return { class: "children", icon: "🧸" };

  if (/(قرآن|قران|الكريم|تفسير|حديث|أحاديث|إسلام|إسلامي|فقه|عقيدة|سيرة|نبوي|دعاء|أذكار|صلاة|أنبياء|الرسول|محمد ﷺ|الصحابة|الصحابي)/.test(t))
    return { class: "religious", icon: "🕌" };

  if (/(فلسطين|القدس|الأقصى|قضية|نكبة|اللاجئين|أسرى|الإنتفاضة|انتفاض|غزة|حيفا|يافا)/.test(t))
    return { class: "palestine", icon: "🇵🇸" };

  if (/(تاريخ|تاريخي|حضارة|عصر|دولة|الخلافة|الفتح|معركة|الحرب|الثورة|الأموي|العباسي|العثماني)/.test(t))
    return { class: "history", icon: "🏛️" };

  if (/(علم|علوم|علمي|فيزياء|كيمياء|رياضيات|أحياء|بيولوجيا|طب|هندسة|تكنولوجيا|كمبيوتر|حاسوب|فلك|فضاء|اختراع)/.test(t))
    return { class: "science", icon: "🔬" };

  if (/(موسوعة|قاموس|معجم|أطلس)/.test(t))
    return { class: "encycl", icon: "📚" };

  if (/(ديوان|شعر|شاعر|قصيدة|أدب|أدبي|نثر|مسرح|بلاغة)/.test(t))
    return { class: "literature", icon: "✒️" };

  if (/(رواية|قصة|قصص|حكاية|حكايات|أسطورة|خيال|مغامرات|مغامرة)/.test(t))
    return { class: "stories", icon: "📖" };

  if (/(بيئة|طبيعة|حيوان|نبات|بحر|محيط|غابة|طيور|الحدائق|الزراعة)/.test(t))
    return { class: "nature", icon: "🌿" };

  if (/(عربي|العربية|نحو|صرف|قواعد|إعراب|اللغة العربية|excel|word|access)/.test(t))
    return { class: "language", icon: "🔤" };

  return { class: "general", icon: "📕" };
}

// ════════════════════════════════════════════════════
// التنقل
// ════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════
// تحميل الكتب
// ════════════════════════════════════════════════════
async function loadBooks() {
  showStudentState("loading");
  if (isAdmin) showAdminState("loading");
  try {
    const res = await fetch(`${API_URL}?action=getBooks`);
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
      `تعذّر الاتصال: ${err.message}. تأكد من API_URL والنشر بصلاحية "الجميع"`;
  }
}

// ─── البحث الرئيسي ───
function globalSearchHandler() {
  const q = document.getElementById("globalSearch").value.trim();
  document.getElementById("globalClearBtn").style.display = q ? "flex" : "none";

  if (!q) {
    if (currentCategory === "_search") {
      currentCategory = null;
      document.getElementById("searchToolbar").style.display = "none";
      document.getElementById("categoryHeader").classList.add("hidden");
      renderCategories(allBooks);
    }
    return;
  }

  currentCategory = "_search";
  document.getElementById("searchToolbar").style.display = "flex";
  document.getElementById("categoryHeader").classList.remove("hidden");
  document.getElementById("catHeaderIcon").textContent = "🔍";
  document.getElementById("catHeaderName").textContent = `نتائج البحث: "${q}"`;

  const filtered = applyFilter(allBooks, q.toLowerCase(), "");
  document.getElementById("catHeaderCount").textContent = `${filtered.length} نتيجة`;

  document.getElementById("searchInput").value = q;
  const grid = document.getElementById("booksGrid");
  if (!filtered.length) {
    showStudentState("noResults");
  } else {
    showStudentState("grid");
    grid.innerHTML = filtered.map((b, i) => studentCard(b, i)).join("");
  }
}

function clearGlobalSearch() {
  document.getElementById("globalSearch").value = "";
  document.getElementById("globalClearBtn").style.display = "none";
  currentCategory = null;
  document.getElementById("searchToolbar").style.display = "none";
  document.getElementById("categoryHeader").classList.add("hidden");
  renderCategories(allBooks);
  document.getElementById("globalSearch").focus();
}

// ════════════════════════════════════════════════════
// واجهة الطالب
// ════════════════════════════════════════════════════
function renderStudentBooks(books) {
  if (currentCategory === null) {
    renderCategories(books);
  } else {
    renderCategoryBooks(books);
  }
}

function renderCategories(books) {
  showStudentState("categories");
  const counts = {};
  CATEGORIES.forEach(c => counts[c.key] = 0);
  books.forEach(b => {
    const info = getCoverInfo(b);
    if (counts[info.class] !== undefined) counts[info.class]++;
  });

  const visibleCats = CATEGORIES.filter(c => counts[c.key] > 0);
  document.getElementById("categoriesGrid").innerHTML = visibleCats.map((cat, i) => {
    const delay = Math.min(i * 0.05, 0.5);
    return `
      <div class="category-card" style="animation-delay:${delay}s" onclick="openCategory('${cat.key}')">
        <div class="cat-banner ${cat.key}">
          <span class="cat-icon">${cat.icon}</span>
        </div>
        <div class="cat-body">
          <div class="cat-name">${cat.name}</div>
          <div class="cat-count">📚 ${counts[cat.key]} كتاب</div>
          <div class="cat-arrow">تصفح التصنيف ←</div>
        </div>
      </div>
    `;
  }).join("");
}

function openCategory(key) {
  currentCategory = key;
  document.getElementById("searchToolbar").style.display = "flex";
  document.getElementById("categoryHeader").classList.remove("hidden");
  const cat = CATEGORIES.find(c => c.key === key);
  document.getElementById("catHeaderIcon").textContent = cat.icon;
  document.getElementById("catHeaderName").textContent = cat.name;
  const count = allBooks.filter(b => getCoverInfo(b).class === key).length;
  document.getElementById("catHeaderCount").textContent = `${count} كتاب`;
  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilter").value = "";
  filterBooks();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToCategories() {
  currentCategory = null;
  document.getElementById("searchToolbar").style.display = "none";
  document.getElementById("categoryHeader").classList.add("hidden");
  document.getElementById("globalSearch").value = "";
  document.getElementById("globalClearBtn").style.display = "none";
  renderCategories(allBooks);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCategoryBooks(books) {
  const categoryBooks = books.filter(b => getCoverInfo(b).class === currentCategory);
  const grid = document.getElementById("booksGrid");
  if (!categoryBooks.length) { showStudentState("noResults"); return; }
  showStudentState("grid");
  grid.innerHTML = categoryBooks.map((b, i) => studentCard(b, i)).join("");
}

function studentCard(book, idx) {
  const cover = getCoverInfo(book);
  const borrowed = book["الحالة"] === "مُعار";
  const part = book["الجزء"] && book["الجزء"] !== ""
    ? `<span class="part-badge">جزء ${esc(book["الجزء"])}</span>` : "";
  const delay = Math.min(idx * 0.02, 0.6);
  return `
    <div class="book-card clickable" style="animation-delay:${delay}s" onclick="openBookDetail(${book._row})">
      <div class="book-cover ${cover.class}">
        <span class="book-cover-icon">${cover.icon}</span>
        <span class="book-cover-num">#${esc(book["الرقم المتسلسل"] || "")}</span>
        <span class="book-cover-status ${borrowed ? "borrowed" : "available"}">
          ${borrowed ? "مُعار" : "متوفر"}
        </span>
      </div>
      <div class="book-body">
        <div class="book-title">${esc(book["اسم الكتاب"])} ${part}</div>
        <div class="book-author">${esc(book["المؤلف"] || "مؤلف غير محدد")}</div>
        <div class="book-meta-row">
          <span>📄 سجل ${esc(book["رقم صفحة السجل"] || "—")}</span>
          ${book["رقم التصنيف المكتبي"] ? `<span>🏷️ ${esc(book["رقم التصنيف المكتبي"])}</span>` : '<span></span>'}
        </div>
      </div>
    </div>
  `;
}

function filterBooks() {
  const q  = document.getElementById("searchInput").value.trim().toLowerCase();
  const st = document.getElementById("statusFilter").value;
  const filtered = applyFilter(allBooks, q, st);
  renderCategoryBooks(filtered);
}

function updateStudentStats(books) {
  document.getElementById("statTotal").textContent     = books.length;
  document.getElementById("statAvailable").textContent = books.filter(b => b["الحالة"] === "متوفر").length;
  document.getElementById("statBorrowed").textContent  = books.filter(b => b["الحالة"] === "مُعار").length;
}

function showStudentState(state) {
  ["loadingState","errorState","categoriesGrid","booksGrid","noResults"].forEach(id =>
    document.getElementById(id).classList.add("hidden"));
  const map = { loading: "loadingState", error: "errorState", categories: "categoriesGrid", grid: "booksGrid", noResults: "noResults" };
  document.getElementById(map[state]).classList.remove("hidden");
}

function openBookDetail(row) {
  const b = allBooks.find(x => x._row === row);
  if (!b) return;
  const cover = getCoverInfo(b);
  const borrowed = b["الحالة"] === "مُعار";
  const summary = b["النبذة"];

  document.getElementById("bookModalBody").innerHTML = `
    <div class="detail-cover ${cover.class}">
      <span class="detail-cover-icon">${cover.icon}</span>
    </div>
    <div class="detail-title">${esc(b["اسم الكتاب"])}</div>
    <div class="detail-author">✍️ ${esc(b["المؤلف"] || "غير محدد")}</div>
    <div class="detail-tags">
      ${b["الجزء"] ? `<span class="detail-tag">جزء ${esc(b["الجزء"])}</span>` : ""}
      <span class="detail-tag ${borrowed ? "borrowed" : "available"}">
        ${borrowed ? "🔴 مُعار حالياً" : "✅ متوفر للاستعارة"}
      </span>
    </div>

    ${summary ? `
      <div class="detail-summary-label">📝 نبذة عن الكتاب</div>
      <div class="detail-summary">${esc(summary)}</div>
    ` : ""}

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
  grid.innerHTML = books.map((b, i) => adminCard(b, i)).join("");
}

function adminCard(book, idx) {
  const cover = getCoverInfo(book);
  const borrowed = book["الحالة"] === "مُعار";
  const part = book["الجزء"] && book["الجزء"] !== ""
    ? `<span class="part-badge">جزء ${esc(book["الجزء"])}</span>` : "";
  const delay = Math.min(idx * 0.02, 0.6);
  return `
    <div class="book-card" style="animation-delay:${delay}s">
      <div class="book-cover ${cover.class}">
        <span class="book-cover-icon">${cover.icon}</span>
        <span class="book-cover-num">#${esc(book["الرقم المتسلسل"] || "")}</span>
        <span class="book-cover-status ${borrowed ? "borrowed" : "available"}">
          ${borrowed ? "مُعار" : "متوفر"}
        </span>
      </div>
      <div class="book-body">
        <div class="book-title">${esc(book["اسم الكتاب"])} ${part}</div>
        <div class="book-author">${esc(book["المؤلف"] || "مؤلف غير محدد")}</div>
        <div class="book-meta-row">
          <span>📄 سجل ${esc(book["رقم صفحة السجل"] || "—")}</span>
          ${book["رقم التصنيف المكتبي"] ? `<span>🏷️ ${esc(book["رقم التصنيف المكتبي"])}</span>` : '<span></span>'}
        </div>
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
    "ملاحظات":             document.getElementById("bookNotes").value.trim(),
    "النبذة":              document.getElementById("bookSummary").value.trim()
  };
  try {
    const res = await apiPost({ action: "addBook", password: ADMIN_PASS, book });
    if (res.error) throw new Error(res.error);
    showMsg("addMsg", "✅ " + res.message, "success");
    ["bookTitle","bookAuthor","bookPart","bookClass","bookPage","bookNotes","bookSummary"]
      .forEach(id => document.getElementById(id).value = "");
    await loadBooks();
  } catch (e) {
    showMsg("addMsg", "❌ " + e.message, "error");
  }
}

// ════════════════════════════════════════════════════
// 🤖 توليد النبذات بـ AI — معالجة محكمة
// ════════════════════════════════════════════════════
async function generateAllSummaries() {
  const btn = document.getElementById("genBtn");
  const stopBtn = document.getElementById("stopGenBtn");

  stopGeneration = false;
  btn.disabled = true;
  if (stopBtn) stopBtn.style.display = "inline-flex";

  let totalProcessed = 0;
  let totalSkipped = 0;
  let nextRow = 2;
  let consecutiveErrors = 0;
  const totalBooks = allBooks.length;

  showMsg("genMsg", "🤖 جارٍ بدء التوليد...", "success");

  try {
    let safety = 0;
    while (safety < 500 && !stopGeneration) {
      safety++;

      // عرض التقدم
      const progress = Math.min(100, Math.round((nextRow / Math.max(totalBooks + 1, 1)) * 100));
      showMsg("genMsg",
        `🤖 توليد... <strong>${totalProcessed}</strong> نبذة جاهزة • السطر ${nextRow}/${totalBooks + 1} • <strong>${progress}%</strong>${consecutiveErrors > 0 ? ` <span style="color:#dc2626">⚠️ أخطاء: ${consecutiveErrors}</span>` : ''}`,
        "success");

      let res = null;
      try {
        // مهلة طويلة (3 دقائق) لكل دفعة لأن فيها 5 طلبات OpenAI
        res = await apiPostWithTimeout({
          action: "generateSummariesBatch",
          password: ADMIN_PASS,
          startRow: nextRow,
          batchSize: 5  // 5 كتب فقط لكل دفعة
        }, 180000);
      } catch (e) {
        consecutiveErrors++;
        console.error(`Network error attempt ${consecutiveErrors}:`, e.message);

        if (consecutiveErrors >= 3) {
          throw new Error(`فشل الاتصال 3 مرات متتالية: ${e.message}`);
        }

        // انتظار متزايد ثم إعادة المحاولة
        const waitSec = consecutiveErrors * 5;
        showMsg("genMsg",
          `⚠️ مشكلة شبكة (محاولة ${consecutiveErrors}/3) — انتظار ${waitSec} ثانية...`,
          "error");
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      // إذا الـ batch فشل بسبب OpenAI Rate Limit
      if (res.error || res.partialBatch) {
        consecutiveErrors++;
        console.warn(`API error ${consecutiveErrors}:`, res.error || res.message);

        if (res.processed) totalProcessed += res.processed;
        if (res.skipped) totalSkipped += res.skipped;

        if (consecutiveErrors >= 5) {
          throw new Error(`OpenAI رفض الطلبات 5 مرات: ${res.error}`);
        }

        // انتظار طويل عند Rate Limit
        const waitSec = consecutiveErrors * 15; // 15, 30, 45, 60, 75 ثانية
        showMsg("genMsg",
          `⏸️ ${res.error || res.message}<br>انتظار ${waitSec} ثانية ثم نكمل... (${totalProcessed} كتاب جاهز حتى الآن)`,
          "error");
        await new Promise(r => setTimeout(r, waitSec * 1000));

        // نكمل من السطر الذي فشل
        if (res.nextRow) nextRow = res.nextRow;
        continue;
      }

      // النجاح — نصفّر عداد الأخطاء
      consecutiveErrors = 0;
      totalProcessed += res.processed || 0;
      totalSkipped   += res.skipped || 0;

      console.log(`✅ Batch ${safety}: +${res.processed} (skip ${res.skipped}) → next ${res.nextRow}`);

      if (res.done || !res.nextRow) {
        showMsg("genMsg",
          `✅ <strong>تم بنجاح!</strong> تمت معالجة ${totalProcessed} كتاب (تخطي ${totalSkipped})`,
          "success");
        break;
      }

      nextRow = res.nextRow;
      // فاصل قصير بين الدفعات
      await new Promise(r => setTimeout(r, 500));
    }

    if (stopGeneration) {
      showMsg("genMsg",
        `⏹️ تم الإيقاف. تم توليد ${totalProcessed} نبذة. اضغطي الزر لإكمال الباقي.`,
        "success");
    }

    await loadBooks();
  } catch (e) {
    console.error("Final error:", e);
    showMsg("genMsg",
      `❌ توقف: ${e.message}<br><br>تم توليد <strong>${totalProcessed}</strong> نبذة. اضغطي الزر مرة أخرى لإكمال الباقي.`,
      "error");
  } finally {
    btn.disabled = false;
    if (stopBtn) stopBtn.style.display = "none";
    stopGeneration = false;
  }
}

function stopGenerationNow() {
  stopGeneration = true;
}

// ─── اختبار AI ───
async function testAI() {
  const btn = document.getElementById("testAIBtn");
  if (btn) { btn.disabled = true; btn.textContent = "جارٍ الاختبار..."; }
  try {
    const res = await fetch(`${API_URL}?action=testAI`);
    const data = await res.json();
    if (data.success) {
      showMsg("genMsg",
        `✅ <strong>AI يعمل!</strong><br><br>📝 نبذة تجريبية:<br><em>"${data.sample}"</em>`,
        "success");
    } else {
      showMsg("genMsg",
        `❌ ${data.error}<br><br>تحققي من إعداد OPENAI_API_KEY في Apps Script`,
        "error");
    }
  } catch (e) {
    showMsg("genMsg", `❌ ${e.message}`, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🧪 اختبار AI"; }
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

      let rows = [];
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        for (const headerRow of [0, 5, 6]) {
          const tmp = XLSX.utils.sheet_to_json(ws, { defval: "", range: headerRow });
          if (tmp.length > 0 && tmp.some(r => r["اسم الكتاب"] || r["اسم الكتاب "] || r["title"] || r["Title"])) {
            rows = tmp;
            break;
          }
        }
        if (rows.length) break;
      }

      if (!rows.length) {
        document.getElementById("fileInfo").innerHTML = `⚠️ لم نجد كتباً صالحة`;
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
        `✅ <strong>${esc(file.name)}</strong> — <strong>${parsedFileBooks.length}</strong> كتاب جاهز`;

      const preview = parsedFileBooks.slice(0, 5);
      document.getElementById("filePreview").innerHTML = `
        <table class="preview-table">
          <thead><tr><th>#</th><th>اسم الكتاب</th><th>المؤلف</th><th>الجزء</th><th>سجل</th></tr></thead>
          <tbody>
            ${preview.map((b, i) => `
              <tr>
                <td>${i+1}</td><td>${esc(b["اسم الكتاب"])}</td>
                <td>${esc(b["المؤلف"]) || "—"}</td><td>${esc(b["الجزء"]) || "—"}</td>
                <td>${esc(b["رقم صفحة السجل"]) || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${parsedFileBooks.length > 5 ? `<p style="color:var(--text-soft);font-size:.85rem;text-align:center;margin-top:8px">... و ${parsedFileBooks.length - 5} كتاب آخر</p>` : ""}
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
    const BATCH = 100;
    let totalImported = 0;
    for (let i = 0; i < parsedFileBooks.length; i += BATCH) {
      const batch = parsedFileBooks.slice(i, i + BATCH);
      const res = await apiPost({ action: "importBooks", password: ADMIN_PASS, books: batch });
      if (res.error) throw new Error(res.error);
      totalImported += batch.length;
      showMsg("importMsg", `⏳ تم استيراد ${totalImported} من ${parsedFileBooks.length}...`, "success");
    }
    showMsg("importMsg", `✅ تم استيراد ${totalImported} كتاب`, "success");
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
      <button class="btn btn-success" onclick="confirmBorrow(${row})">✅ تأكيد</button>
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
        <label>النبذة</label>
        <textarea id="editSummary" rows="4">${esc(b["النبذة"] || "")}</textarea>
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
    "النبذة":             document.getElementById("editSummary").value.trim(),
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
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPostWithTimeout(body, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error(`Timeout بعد ${timeoutMs/1000} ثانية`);
    throw e;
  }
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
  el.innerHTML = msg;
  el.className = `msg ${type}`;
  el.classList.remove("hidden");
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
