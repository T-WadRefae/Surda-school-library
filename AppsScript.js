// ════════════════════════════════════════════════════
// نظام مكتبة مدرسة سردا الأساسية المختلطة
// المعلمة: T. Wad Refae
// النسخة النهائية — مع AI معالج بشكل سليم
// ════════════════════════════════════════════════════

const SHEET_NAME    = "كتب المكتبات";
const ADMIN_PASSWORD = "Surda123surda";

// ─── إعدادات OpenAI ───
// ضعي مفتاح OpenAI في Project Settings → Script Properties
// Property name: OPENAI_API_KEY
const AI_MODEL = "gpt-4o-mini";

// 🎯 الإعدادات المحكمة لتجنب Rate Limit
const DELAY_BETWEEN_CALLS_MS = 1500;  // 1.5 ثانية بين كل طلب AI
const MAX_BATCH_SIZE = 5;             // 5 كتب فقط لكل دفعة (آمنة جداً)

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
  const adminActions = ["addBook","updateBook","deleteBook","borrow","returnBook","importBooks","generateSummariesBatch"];
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
  const row = [
    book["الرقم المتسلسل"] || newId,
    book["رقم التصنيف المكتبي"] || "",
    book["اسم الكتاب"] || "",
    book["الجزء"] || "",
    book["المؤلف"] || "",
    book["رقم صفحة السجل"] || "",
    "متوفر", "", "",
    book["ملاحظات"] || "",
    book["النبذة"] || ""
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
      book["النبذة"] || ""
    ]);
  });
  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, COLUMNS.length).setValues(rows);
  }
  return { success: true, message: `تم استيراد ${rows.length} كتاب ✅` };
}

// ════════════════════════════════════════════════════
// 🤖 AI — توليد النبذات
// ════════════════════════════════════════════════════

function testAI() {
  const apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY غير موجود في Script Properties" };
  }
  try {
    const summary = callOpenAI("النحو الواضح في قواعد اللغة العربية", "علي الجارم", "");
    return { success: true, sample: summary, message: "✅ AI يعمل" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// 🎯 الدالة المهمة: معالجة دفعة صغيرة (5 كتب) مع تأخير
function generateSummariesBatch(startRow, batchSize) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  // التأكد من وجود عمود النبذة
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let summaryCol = headers.indexOf("النبذة") + 1;
  if (summaryCol === 0) {
    summaryCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, summaryCol).setValue("النبذة")
      .setFontWeight("bold").setBackground("#0d4d70").setFontColor("#ffffff");
  }

  const titleCol  = headers.indexOf("اسم الكتاب");
  const authorCol = headers.indexOf("المؤلف");
  const partCol   = headers.indexOf("الجزء");

  // فرض الحد الأقصى للدفعة
  const safeBatchSize = Math.min(batchSize || MAX_BATCH_SIZE, MAX_BATCH_SIZE);
  const start = Math.max(startRow, 2);
  const end = Math.min(start + safeBatchSize - 1, lastRow);

  if (start > lastRow) {
    return { success: true, done: true, processed: 0, nextRow: null, message: "✅ انتهى" };
  }

  const range = sheet.getRange(start, 1, end - start + 1, sheet.getLastColumn()).getValues();
  let processed = 0;
  let skipped = 0;
  let lastError = null;

  for (let i = 0; i < range.length; i++) {
    const row = range[i];
    const sheetRow = start + i;

    if (!row[titleCol]) { skipped++; continue; }

    // تخطّ الكتب التي لها نبذة موجودة
    const existing = row[summaryCol - 1];
    if (existing && String(existing).trim().length > 30) { skipped++; continue; }

    try {
      const summary = callOpenAI(row[titleCol], row[authorCol], row[partCol]);
      sheet.getRange(sheetRow, summaryCol).setValue(summary);
      processed++;

      // ⚡ تأخير بين كل طلب لتجنب Rate Limit
      if (i < range.length - 1) {
        Utilities.sleep(DELAY_BETWEEN_CALLS_MS);
      }
    } catch (e) {
      lastError = e.message;
      // إذا فشل، نتوقف فوراً ونرجع للمستخدم لإعادة المحاولة لاحقاً
      // (أفضل من ملء الشيت بنبذات احتياطية رديئة)
      return {
        success: false,
        error: e.message,
        processed,
        skipped,
        nextRow: sheetRow,  // نرجع للسطر الذي فشل ليُعاد محاولته
        partialBatch: true,
        message: `توقف عند السطر ${sheetRow}: ${e.message}`
      };
    }
  }

  return {
    success: true,
    done: end >= lastRow,
    processed,
    skipped,
    nextRow: end + 1,
    totalRows: lastRow,
    message: `معالجة ${processed} كتاب`
  };
}

// ─── استدعاء OpenAI ───
function callOpenAI(title, author, part) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY غير موجود");

  const authorText = (author && String(author).trim() && String(author).trim() !== "nan")
    ? `، تأليف: ${author}` : "";
  const partText = (part && String(part).trim() && String(part).trim() !== "nan")
    ? ` (الجزء ${part})` : "";

  const prompt = `اكتب نبذة قصيرة (40-60 كلمة) عن الكتاب التالي بأسلوب جذاب يشجع طلاب المدرسة الأساسية على القراءة. اكتب باللغة العربية الفصحى البسيطة. لا تذكر معلومات قد لا تكون صحيحة.

الكتاب: "${title}"${authorText}${partText}

اكتب النبذة فقط:`;

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + apiKey },
    payload: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.7
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  // ⚡ معالجة Rate Limit
  if (code === 429) {
    throw new Error("Rate Limit — انتظري قليلاً ثم أعيدي المحاولة");
  }

  if (code !== 200) {
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
