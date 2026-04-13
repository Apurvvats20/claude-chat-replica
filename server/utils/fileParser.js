const mammoth = require("mammoth");

async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    // Lazy require avoids pdf-parse's startup side-effect that crashes in Railway
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype.includes("wordprocessingml")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // TXT, MD, plain text
  return buffer.toString("utf-8");
}

module.exports = { extractText };
