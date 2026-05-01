// ════════════════════════════════════════════════════
// نظام مكتبة مدرسة سردا الأساسية المختلطة
// المعلمة: T. Wad Refae
// Google Apps Script — مع توليد نبذات ذكي
// ════════════════════════════════════════════════════

const SHEET_NAME    = "كتب المكتبات";
const ADMIN_PASSWORD = "Surda123surda";

// أعمدة الجرد + عمود النبذة
const COLUMNS = [
  "الرقم المتسلسل",
  "رقم التصنيف المكتبي",
  "اسم الكتاب",
  "الجزء",
  "المؤلف",
  "رقم صفحة السجل",
  "الحالة",
  "المستعير",
  "تاريخ الإعارة",
  "ملاحظات",
  "النبذة"
];

// ─── GET ───
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "getBooks";
  let result;
  try {
    if (action === "getBooks") result = getBooks(e.parameter);
    else if (action === "ping") result = { status: "ok", message: "الخادم يعمل ✅" };
    else if (action === "generateAllSummaries") result = generateAllSummaries();
    else result = { error: "إجراء غير معروف" };
  } catch (err) {
    result = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── POST ───
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (_) { return jsonResponse({ error: "بيانات غير صالحة" }); }

  const { action, password } = body;
  const adminActions = ["addBook","updateBook","deleteBook","borrow","returnBook","importBooks","generateSummaries"];
  if (adminActions.includes(action) && password !== ADMIN_PASSWORD) {
    return jsonResponse({ error: "كلمة المرور غير صحيحة" });
  }

  try {
    let result;
    switch (action) {
      case "addBook":     result = addBook(body.book); break;
      case "updateBook":  result = updateBook(body.row, body.book); break;
      case "deleteBook":  result = deleteBook(body.row); break;
      case "borrow":      result = borrowBook(body.row, body.borrower); break;
      case "returnBook":  result = returnBook(body.row); break;
      case "importBooks": result = importBooks(body.books); break;
      case "generateSummaries": result = generateMissingSummaries(); break;
      default: result = { error: "إجراء غير معروف" };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── جلب الكتب ───
function getBooks(params) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const books = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[2]) continue;

    const book = {};
    headers.forEach((h, idx) => { book[h] = row[idx]; });
    book._row = i + 1;

    if (params && params.search) {
      const q = String(params.search).toLowerCase();
      const match = String(book["اسم الكتاب"]).toLowerCase().includes(q) ||
                    String(book["المؤلف"]).toLowerCase().includes(q) ||
                    String(book["رقم التصنيف المكتبي"]).toLowerCase().includes(q);
      if (!match) continue;
    }
    if (params && params.status && book["الحالة"] !== params.status) continue;

    books.push(book);
  }

  return { books, total: books.length };
}

// ─── إضافة كتاب (مع نبذة تلقائية) ───
function addBook(book) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const newId = lastRow;

  // توليد نبذة تلقائياً عند الإضافة
  const summary = book["النبذة"] || generateSmartSummary(
    book["اسم الكتاب"],
    book["المؤلف"],
    book["الجزء"]
  );

  const row = [
    book["الرقم المتسلسل"] || newId,
    book["رقم التصنيف المكتبي"] || "",
    book["اسم الكتاب"] || "",
    book["الجزء"] || "",
    book["المؤلف"] || "",
    book["رقم صفحة السجل"] || "",
    "متوفر",
    "",
    "",
    book["ملاحظات"] || "",
    summary
  ];

  sheet.appendRow(row);
  return { success: true, message: "تمت إضافة الكتاب إلى الجرد ✅", id: newId };
}

// ─── تعديل ───
function updateBook(rowNum, book) {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  headers.forEach((h, idx) => {
    if (book[h] !== undefined) {
      sheet.getRange(rowNum, idx + 1).setValue(book[h]);
    }
  });
  return { success: true, message: "تم تعديل الكتاب ✅" };
}

// ─── حذف ───
function deleteBook(rowNum) {
  getSheet().deleteRow(rowNum);
  return { success: true, message: "تم حذف الكتاب ✅" };
}

// ─── إعارة ───
function borrowBook(rowNum, borrower) {
  const sheet = getSheet();
  const today = Utilities.formatDate(new Date(), "Asia/Jerusalem", "yyyy-MM-dd");
  sheet.getRange(rowNum, 7).setValue("مُعار");
  sheet.getRange(rowNum, 8).setValue(borrower);
  sheet.getRange(rowNum, 9).setValue(today);
  return { success: true, message: `تمت إعارة الكتاب لـ ${borrower} ✅` };
}

// ─── إرجاع ───
function returnBook(rowNum) {
  const sheet = getSheet();
  sheet.getRange(rowNum, 7).setValue("متوفر");
  sheet.getRange(rowNum, 8).setValue("");
  sheet.getRange(rowNum, 9).setValue("");
  return { success: true, message: "تم إرجاع الكتاب ✅" };
}

// ─── استيراد دفعة ───
function importBooks(books) {
  const sheet = getSheet();
  const startRow = sheet.getLastRow() + 1;
  const rows = [];

  books.forEach((book, idx) => {
    const summary = book["النبذة"] || generateSmartSummary(
      book["اسم الكتاب"], book["المؤلف"], book["الجزء"]
    );
    rows.push([
      book["الرقم المتسلسل"] || (startRow + idx - 1),
      book["رقم التصنيف المكتبي"] || "",
      book["اسم الكتاب"] || "",
      book["الجزء"] || "",
      book["المؤلف"] || "",
      book["رقم صفحة السجل"] || "",
      book["الحالة"] || "متوفر",
      book["المستعير"] || "",
      book["تاريخ الإعارة"] || "",
      book["ملاحظات"] || "",
      summary
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, COLUMNS.length).setValues(rows);
  }
  return { success: true, message: `تم استيراد ${rows.length} كتاب للجرد ✅` };
}

// ─── توليد نبذات للكتب الفارغة ───
function generateMissingSummaries() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const summaryCol = headers.indexOf("النبذة") + 1;
  const titleCol   = headers.indexOf("اسم الكتاب");
  const authorCol  = headers.indexOf("المؤلف");
  const partCol    = headers.indexOf("الجزء");

  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[titleCol]) continue;
    if (row[summaryCol - 1] && String(row[summaryCol - 1]).trim()) continue;

    const summary = generateSmartSummary(
      row[titleCol], row[authorCol], row[partCol]
    );
    sheet.getRange(i + 1, summaryCol).setValue(summary);
    count++;

    
}

// ─── محرك توليد النبذات الذكي ───
function generateSmartSummary(title, author, part) {
  if (!title) return "";

  const t = String(title).toLowerCase();
  const authorText = author && String(author).trim() && String(author).trim() !== "nan"
    ? `للمؤلف ${author}` : "";
  const partText = part && String(part).trim() && String(part).trim() !== "nan"
    ? `الجزء (${part})` : "";

  // ─── تصنيف موضوعي + قالب نبذة ───
  let topic = "";
  let template = "";

  // ديني وإسلامي
  if (/(قرآن|قران|الكريم|تفسير|حديث|أحاديث|إسلام|إسلامي|فقه|عقيدة|سيرة|نبوي|دعاء|أذكار|صلاة|صيام|حج|زكاة|أنبياء|الرسول|محمد ﷺ)/.test(t)) {
    topic = "ديني إسلامي";
    template = `كتاب ديني ${authorText} يتناول موضوعات إسلامية تثري معرفة القارئ بأمور دينه. يقدم محتوى نافعاً مناسباً للطلاب يساعدهم على فهم تعاليم الإسلام السمحة.`;
  }
  // قصص الأنبياء
  else if (/(قصص الأنبياء|قصة نبي|الأنبياء|الرسل)/.test(t)) {
    topic = "قصص الأنبياء";
    template = `كتاب يروي قصص الأنبياء عليهم السلام بأسلوب شيق ومناسب للأطفال والناشئة، يحمل دروساً وعبراً قيّمة في الإيمان والصبر والثبات على الحق.`;
  }
  // فلسطين وقضية
  else if (/(فلسطين|القدس|الأقصى|قضية|نكبة|نكسة|اللاجئين|أسرى|الإنتفاضة|انتفاض)/.test(t)) {
    topic = "فلسطيني";
    template = `كتاب يتناول الشأن الفلسطيني ${authorText}، ويسلط الضوء على جوانب من قضيتنا العادلة، تاريخها أو حاضرها. مقروء قيّم يربط الطالب بأرضه وقضيته.`;
  }
  // تاريخ
  else if (/(تاريخ|تاريخي|حضارة|عصر|دولة|الخلافة|الفتح|معركة|الحرب|الثورة)/.test(t)) {
    topic = "تاريخي";
    template = `كتاب تاريخي ${authorText} يأخذ القارئ في رحلة عبر الأزمان لاستكشاف أحداث وشخصيات تركت بصمة في التاريخ. يعزز الوعي التاريخي ويربط الحاضر بالماضي.`;
  }
  // علوم
  else if (/(علم|علوم|علمي|فيزياء|كيمياء|رياضيات|أحياء|بيولوجيا|طب|هندسة|تكنولوجيا|كمبيوتر|حاسوب|فلك|فضاء|ذرة|نظرية)/.test(t)) {
    topic = "علمي";
    template = `كتاب علمي ${authorText} يقدم معلومات قيّمة في المجال العلمي بأسلوب مبسط. يحفز الفضول لدى الطلاب ويوسع آفاقهم في فهم العالم من حولهم.`;
  }
  // موسوعة
  else if (/(موسوعة|قاموس|معجم)/.test(t)) {
    topic = "موسوعة";
    template = `موسوعة شاملة ${authorText} تجمع معلومات قيّمة ومتنوعة في موضوعها. مرجع غني للطلاب والباحثين، يوفر معرفة منظمة ومرتبة يسهل الرجوع إليها.`;
  }
  // أدب وشعر
  else if (/(ديوان|شعر|شاعر|قصيدة|أدب|أدبي|نثر|مسرح|مسرحية)/.test(t)) {
    topic = "أدبي";
    template = `كتاب أدبي ${authorText} يتذوق فيه القارئ جماليات اللغة العربية، ويثري ذائقته الأدبية. يعرّف الطلاب على روائع الأدب العربي.`;
  }
  // قصص وروايات
  else if (/(رواية|قصة|قصص|حكاية|حكايات|أسطورة|خيال|مغامرات|مغامرة)/.test(t)) {
    topic = "قصصي";
    template = `كتاب قصصي ${authorText} يجمع بين المتعة والفائدة، ينقل القارئ إلى عوالم مشوقة ويغرس قيماً تربوية. مناسب لتنمية حب القراءة عند الطلاب.`;
  }
  // طبيعة وبيئة
  else if (/(بيئة|طبيعة|حيوان|حيوانات|نبات|نباتات|بحر|محيط|غابة|طيور|حشرات)/.test(t)) {
    topic = "بيئي";
    template = `كتاب يستكشف عالم الطبيعة والبيئة ${authorText}، يفتح أمام الطلاب نوافذ للتعرف على عجائب المخلوقات وجمال الكون. يغرس حب الطبيعة والمحافظة عليها.`;
  }
  // جغرافيا
  else if (/(جغرافيا|جغرافي|بلدان|دول|قارات|مدن|عواصم|أطلس|خريطة)/.test(t)) {
    topic = "جغرافي";
    template = `كتاب جغرافي ${authorText} يطوف بالقارئ في أرجاء المعمورة، يعرّفه على البلدان والشعوب والتضاريس. يوسع الأفق ويعزز الثقافة الجغرافية.`;
  }
  // تربية وأخلاق
  else if (/(تربية|تربوي|أخلاق|أخلاقي|قيم|سلوك|مهارات|تنمية|شخصية)/.test(t)) {
    topic = "تربوي";
    template = `كتاب تربوي ${authorText} يقدم مفاهيم وقيماً تساهم في بناء شخصية الطالب. غني بالتوجيهات النافعة لتنمية المهارات الحياتية والأخلاقية.`;
  }
  // لغة عربية
  else if (/(عربي|العربية|نحو|صرف|بلاغة|قواعد|إعراب|لغة)/.test(t)) {
    topic = "لغة عربية";
    template = `كتاب يخدم اللغة العربية ${authorText}، يساعد الطلاب على إتقان قواعدها وفهم أسرارها. مرجع نافع لتقوية المهارات اللغوية.`;
  }
  // لغة إنجليزية
  else if (/(english|انجلي|إنجلي|excel|word|access|computer)/.test(t)) {
    topic = "تعليمي";
    template = `كتاب تعليمي ${authorText} يقدم محتوى عملياً للمتعلمين. مفيد لتطوير المهارات الأكاديمية والتقنية.`;
  }
  // فنون
  else if (/(فن|فنون|رسم|تلوين|موسيقى|نشيد|أناشيد)/.test(t)) {
    topic = "فني";
    template = `كتاب يحتفي بالفن والإبداع ${authorText}، يفتح أمام الطلاب آفاقاً للتعبير الفني وتذوق الجمال.`;
  }
  // عام (الافتراضي)
  else {
    topic = "متنوع";
    template = `كتاب قيّم ${authorText} ضمن مجموعة مكتبة المدرسة، يُثري معرفة الطلاب ويوسع آفاقهم الفكرية. متاح في مكتبة مدرسة سردا للقراءة والاستفادة.`;
  }

  // إضافة معلومة الجزء إن وجدت
  if (partText) {
    template += ` (${partText})`;
  }

  return template;
}

// ─── الحصول على الـ Sheet ───
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length)
      .setFontWeight("bold")
      .setBackground("#0d4d70")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    COLUMNS.forEach((_, i) => sheet.autoResizeColumn(i + 1));
  } else {
    // التأكد من وجود عمود "النبذة" — أضفه إن لم يكن موجوداً
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf("النبذة") === -1) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue("النبذة")
        .setFontWeight("bold")
        .setBackground("#0d4d70")
        .setFontColor("#ffffff")
        .setHorizontalAlignment("center");
    }
  }

  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
