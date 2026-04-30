// ════════════════════════════════════════════════════
// نظام مكتبة مدرسة سردا الأساسية المختلطة
// المعلمة: T. Wad Refae
// Google Apps Script — متوافق مع الجرد الرسمي
// ════════════════════════════════════════════════════

const SHEET_NAME    = "كتب المكتبات";
const ADMIN_PASSWORD = "Surda123surda";

// أعمدة الجرد الرسمي
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
  "ملاحظات"
];

// ─── GET ───
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "getBooks";
  let result;
  try {
    if (action === "getBooks") result = getBooks(e.parameter);
    else if (action === "ping") result = { status: "ok", message: "الخادم يعمل ✅" };
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
  const adminActions = ["addBook","updateBook","deleteBook","borrow","returnBook","importBooks"];
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
    if (!row[2]) continue; // تخطي الصفوف بدون اسم كتاب

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

// ─── إضافة كتاب ───
function addBook(book) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const newId = lastRow; // الرقم المتسلسل التلقائي

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
    book["ملاحظات"] || ""
  ];

  sheet.appendRow(row);
  return { success: true, message: "تمت إضافة الكتاب إلى الجرد ✅", id: newId };
}

// ─── تعديل كتاب ───
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

// ─── حذف كتاب ───
function deleteBook(rowNum) {
  const sheet = getSheet();
  sheet.deleteRow(rowNum);
  return { success: true, message: "تم حذف الكتاب ✅" };
}

// ─── إعارة ───
function borrowBook(rowNum, borrower) {
  const sheet = getSheet();
  const today = Utilities.formatDate(new Date(), "Asia/Jerusalem", "yyyy-MM-dd");

  // عمود الحالة = 7، المستعير = 8، تاريخ الإعارة = 9
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
      book["ملاحظات"] || ""
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, COLUMNS.length).setValues(rows);
  }

  return { success: true, message: `تم استيراد ${rows.length} كتاب إلى الجرد ✅` };
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
  }

  return sheet;
}

// ─── مساعد JSON ───
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
