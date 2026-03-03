/**
 * Google Apps Script - Bug Tracker Backend
 * 
 * Instructions:
 * 1. Open a Google Sheet.
 * 2. Go to Extensions > App Script.
 * 3. Paste this code and save.
 * 4. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL to bugreport.js
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Order: Data, Nick, Email, Wersja, Tag, Opis, Link
    sheet.appendRow([
      new Date(),
      data.nick,
      data.email,
      data.version,
      data.tag,
      data.description,
      data.media
    ]);
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * SETUP: Uruchom tę funkcję raz w edytorze Apps Script, 
 * aby dodać nagłówki do arkusza.
 */
function setupHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.clear(); // Opcjonalnie: czyści arkusz przed dodaniem nagłówków
  sheet.appendRow(["Data", "Nick", "Email", "Wersja", "Tag", "Opis", "Link"]);
  
  // Ozdabianie nagłówków
  var range = sheet.getRange(1, 1, 1, 7);
  range.setBackground("#4fcca3")
       .setFontColor("#121212")
       .setFontWeight("bold");
}
