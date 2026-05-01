// ════════════════════════════════════════════════════
// نظام مكتبة مدرسة سردا الأساسية المختلطة
// المعلمة: T. Wad Refae
// Google Apps Script — مع دعم AI حقيقي (Claude / OpenAI)
// ════════════════════════════════════════════════════

const SHEET_NAME    = "كتب المكتبات";
const ADMIN_PASSWORD = "Surda123surda";

// ─── إعدادات AI ───
// 1. اذهبي لـ: ملف → إعدادات المشروع → خصائص النص → خصائص السكريبت
// 2. أضيفي خاصية باسم: OPENAI_API_KEY
// 3. القيمة: مفتاح API الخاص بك من platform.openai.com
const AI_PROVIDER = "openai"; // أو "anthropic" إذا حبيتي تغيري لاحقاً
const AI_MODEL_ANTHROPIC = "claude-haiku-4-5-20251001";
const AI_MODEL_OPENAI    = "gpt-4o-mini"; // سريع ورخيص

// ─── أعمدة الجرد ───
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

// ════════════════════════════════════════════════════
// GET / POST handlers
// ════════════════════════════════════════════════════
function doGet(e) {
  // حماية من التشغيل اليدوي بدون parameters
  e = e || {};
  const action = (e.parameter && e.parameter.action) || "getBooks";
  let result;
  try {
    if (action === "getBooks")     result = getBooks(e.parameter || {});
    else if (action === "ping")    result = { status: "ok", message: "الخادم يعمل ✅" };
    else if (action === "testAI")  result = testAI();
    else result = { error: "إجراء غير معروف" };
  } catch (err) { result = { error: err.message }; }
  return jsonResponse(result);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (_) { return jsonResponse({ error: "بيانات غير صالحة" }); }

  const { action, password } = body;
  const adminActions = ["addBook","updateBook","deleteBook","borrow","returnBook","importBooks","generateSummaries","generateSummariesBatch"];
  if (adminActions.includes(action) && password !== ADMIN_PASSWORD) {
    return jsonResponse({ error: "كلمة المرور غير صحيحة" });
  }

  try {
    let result;
    switch (action) {
      case "addBook":               result = addBook(body.book); break;
      case "updateBook":            result = updateBook(body.row, body.book); break;
      case "deleteBook":            result = deleteBook(body.row); break;
      case "borrow":                result = borrowBook(body.row, body.borrower); break;
      case "returnBook":            result = returnBook(body.row); break;
      case "importBooks":           result = importBooks(body.books); break;
      case "generateSummaries":     result = generateMissingSummaries(); break;
      case "generateSummariesBatch": result = generateSummariesBatch(body.startRow, body.batchSize); break;
      default: result = { error: "إجراء غير معروف" };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ════════════════════════════════════════════════════
// عمليات أساسية
// ════════════════════════════════════════════════════
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
    books.push(book);
  }
  return { books, total: books.length };
}

function addBook(book) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const newId = lastRow;

  // النبذة: إذا لم تُحدد، نحاول AI ثم نقع على القالب
  let summary = book["النبذة"];
  if (!summary) {
    try {
      summary = generateAISummary(book["اسم الكتاب"], book["المؤلف"], book["الجزء"]);
    } catch (e) {
      summary = generateFallbackSummary(book["اسم الكتاب"], book["المؤلف"]);
    }
  }

  const row = [
    book["الرقم المتسلسل"] || newId,
    book["رقم التصنيف المكتبي"] || "",
    book["اسم الكتاب"] || "",
    book["الجزء"] || "",
    book["المؤلف"] || "",
    book["رقم صفحة السجل"] || "",
    "متوفر", "", "",
    book["ملاحظات"] || "",
    summary
  ];
  sheet.appendRow(row);
  return { success: true, message: "تمت إضافة الكتاب ✅", id: newId };
}

function updateBook(rowNum, book) {
  const sheet = getSheet();
  const headers = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  headers.forEach((h, idx) => {
    if (book[h] !== undefined) sheet.getRange(rowNum, idx + 1).setValue(book[h]);
  });
  return { success: true, message: "تم تعديل الكتاب ✅" };
}

function deleteBook(rowNum) {
  getSheet().deleteRow(rowNum);
  return { success: true, message: "تم حذف الكتاب ✅" };
}

function borrowBook(rowNum, borrower) {
  const sheet = getSheet();
  const today = Utilities.formatDate(new Date(), "Asia/Jerusalem", "yyyy-MM-dd");
  sheet.getRange(rowNum, 7).setValue("مُعار");
  sheet.getRange(rowNum, 8).setValue(borrower);
  sheet.getRange(rowNum, 9).setValue(today);
  return { success: true, message: `تمت إعارة الكتاب لـ ${borrower} ✅` };
}

function returnBook(rowNum) {
  const sheet = getSheet();
  sheet.getRange(rowNum, 7).setValue("متوفر");
  sheet.getRange(rowNum, 8).setValue("");
  sheet.getRange(rowNum, 9).setValue("");
  return { success: true, message: "تم إرجاع الكتاب ✅" };
}

function importBooks(books) {
  const sheet = getSheet();
  const startRow = sheet.getLastRow() + 1;
  const rows = [];
  books.forEach((book, idx) => {
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
      book["النبذة"] || ""  // فارغ — نولّدها لاحقاً بـ AI
    ]);
  });
  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, COLUMNS.length).setValues(rows);
  }
  return { success: true, message: `تم استيراد ${rows.length} كتاب ✅` };
}

// ════════════════════════════════════════════════════
// 🤖 AI - توليد النبذات الحقيقية
// ════════════════════════════════════════════════════

// اختبار أن AI يعمل
function testAI() {
  console.log("═══ اختبار AI ═══");
  console.log("المزود:", AI_PROVIDER);

  const apiKey = PropertiesService.getScriptProperties().getProperty(
    AI_PROVIDER === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"
  );
  console.log("هل المفتاح موجود؟", apiKey ? `✅ نعم (طوله: ${apiKey.length} حرف)` : "❌ لا");

  if (!apiKey) {
    return {
      success: false,
      error: `المفتاح ${AI_PROVIDER === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} غير موجود في Script Properties`,
      hint: "اذهبي لـ Project Settings → Script Properties وأضيفي المفتاح"
    };
  }

  try {
    console.log("جارٍ الاتصال بـ AI...");
    const summary = generateAISummary("النحو الواضح في قواعد اللغة العربية", "علي الجارم", "1");
    console.log("✅ نجاح! النبذة:", summary);
    return {
      success: true,
      provider: AI_PROVIDER,
      sample: summary,
      message: "✅ AI يعمل بشكل صحيح"
    };
  } catch (err) {
    console.error("❌ فشل:", err.message);
    return {
      success: false,
      error: err.message,
      hint: "افحصي السجل (View → Logs) لمزيد من التفاصيل"
    };
  }
}

// توليد دفعة معينة (للمعالجة بدفعات صغيرة لتجنب timeout)
function generateSummariesBatch(startRow, batchSize, force) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // التأكد من وجود عمود النبذة
  let summaryCol = headers.indexOf("النبذة") + 1;
  if (summaryCol === 0) {
    summaryCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, summaryCol).setValue("النبذة")
      .setFontWeight("bold").setBackground("#0d4d70").setFontColor("#ffffff");
  }

  const titleCol  = headers.indexOf("اسم الكتاب");
  const authorCol = headers.indexOf("المؤلف");
  const partCol   = headers.indexOf("الجزء");

  const start = Math.max(startRow, 2);
  const end = Math.min(start + batchSize - 1, lastRow);

  if (start > lastRow) {
    return { success: true, done: true, processed: 0, nextRow: null, message: "✅ انتهى التوليد" };
  }

  const range = sheet.getRange(start, 1, end - start + 1, sheet.getLastColumn()).getValues();
  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < range.length; i++) {
    const row = range[i];
    const sheetRow = start + i;

    if (!row[titleCol]) { skipped++; continue; }

    // إذا force=false، تخطّ الكتب التي لها نبذات بالفعل
    if (!force) {
      const existing = row[summaryCol - 1];
      if (existing && String(existing).trim().length > 20) { skipped++; continue; }
    }

    try {
      const summary = generateAISummary(
        row[titleCol], row[authorCol], row[partCol]
      );
      sheet.getRange(sheetRow, summaryCol).setValue(summary);
      processed++;
    } catch (e) {
      const fallback = generateFallbackSummary(row[titleCol], row[authorCol]);
      sheet.getRange(sheetRow, summaryCol).setValue(fallback);
      processed++;
    }

    Utilities.sleep(100);
  }

  return {
    success: true,
    done: end >= lastRow,
    processed,
    skipped,
    nextRow: end + 1,
    totalRows: lastRow,
    message: `تمت معالجة ${processed} كتاب (تخطي ${skipped})`
  };
}

// توليد كل النبذات الفارغة (للكتب القليلة)
function generateMissingSummaries() {
  return generateSummariesBatch(2, 20);

  
  if (!result.done) {
    ScriptApp.newTrigger("generateMissingSummaries")
      .timeBased()
      .after(5000) // بعد 5 ثواني
      .create();
  }

  return result;
}

// ─── الدالة الأساسية لتوليد نبذة بـ AI ───
function generateAISummary(title, author, part) {
  if (!title) return "";

  if (AI_PROVIDER === "anthropic") {
    return callClaudeAPI(title, author, part);
  } else if (AI_PROVIDER === "openai") {
    return callOpenAI(title, author, part);
  }
  return generateFallbackSummary(title, author);
}

// ─── Claude API ───
function callClaudeAPI(title, author, part) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("لم يتم إضافة ANTHROPIC_API_KEY في خصائص السكريبت");

  const authorText = (author && String(author).trim() && String(author).trim() !== "nan")
    ? `، تأليف: ${author}` : "";
  const partText = (part && String(part).trim() && String(part).trim() !== "nan")
    ? ` (الجزء ${part})` : "";

  const prompt = `اكتب نبذة قصيرة (40-60 كلمة فقط) عن الكتاب التالي بحيث تكون مناسبة لطلاب المدرسة الأساسية في فلسطين. اكتب باللغة العربية الفصحى البسيطة، بأسلوب جذاب يشجع الطلاب على القراءة. لا تذكر أي معلومات قد لا تكون صحيحة. ركّز على الموضوع العام والفئة المستهدفة.

الكتاب: "${title}"${authorText}${partText}

اكتب النبذة فقط، بدون أي مقدمة أو عنوان:`;

  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify({
      model: AI_MODEL_ANTHROPIC,
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }]
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const data = JSON.parse(response.getContentText());

  if (code !== 200) {
    throw new Error(`Claude API error ${code}: ${data.error?.message || "Unknown"}`);
  }

  return data.content[0].text.trim();
}

// ─── OpenAI API ───
function callOpenAI(title, author, part) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) throw new Error("لم يتم إضافة OPENAI_API_KEY في خصائص السكريبت");

  const authorText = (author && String(author).trim() && String(author).trim() !== "nan")
    ? `، تأليف: ${author}` : "";
  const partText = (part && String(part).trim() && String(part).trim() !== "nan")
    ? ` (الجزء ${part})` : "";

  const prompt = `اكتب نبذة قصيرة (40-60 كلمة فقط) عن الكتاب التالي بحيث تكون مناسبة لطلاب المدرسة الأساسية في فلسطين. اكتب باللغة العربية الفصحى البسيطة، بأسلوب جذاب يشجع الطلاب على القراءة.

الكتاب: "${title}"${authorText}${partText}

اكتب النبذة فقط:`;

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + apiKey },
    payload: JSON.stringify({
      model: AI_MODEL_OPENAI,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.7
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code !== 200) {
    console.error(`OpenAI HTTP ${code}:`, text);
    let errMsg = `OpenAI error ${code}`;
    try {
      const data = JSON.parse(text);
      errMsg += `: ${data.error?.message || data.error?.code || "Unknown"}`;
    } catch(_) {}
    throw new Error(errMsg);
  }

  const data = JSON.parse(text);
  return data.choices[0].message.content.trim();
}

// ─── نبذة احتياطية (لو فشل AI) ───
function generateFallbackSummary(title, author) {
  const authorText = (author && String(author).trim() && String(author).trim() !== "nan")
    ? `للمؤلف ${author}` : "";
  return `كتاب "${title}" ${authorText} متوفر في مكتبة مدرسة سردا الأساسية المختلطة.`;
}

// ════════════════════════════════════════════════════
// مساعدات
// ════════════════════════════════════════════════════
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length)
      .setFontWeight("bold").setBackground("#0d4d70").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf("النبذة") === -1) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue("النبذة")
        .setFontWeight("bold").setBackground("#0d4d70").setFontColor("#ffffff");
    }
  }
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
