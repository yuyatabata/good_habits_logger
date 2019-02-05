var CHANNEL_ACCESS_TOKEN = 'アクセストークン';
var line_endpoint = 'https://api.line.me/v2/bot/message/reply';
var line_endpoint_profile = 'https://api.line.me/v2/bot/profile';

function getUserDisplayName(user_id) {
  var res = UrlFetchApp.fetch(line_endpoint_profile + '/' + user_id, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'get',
  });
  return JSON.parse(res).displayName;
}

function createSpreadSheet(user_id) {
  var SheetName = user_id;
  var spreadSheet = SpreadsheetApp.create("good_habits_logger(" + SheetName + ")");
  var sheet = spreadSheet.getSheets()[0];
  sheet.appendRow(['', ' ', '']);
  sheet.appendRow(['', '日時', 'できたこと']);
  var LastRow = sheet.getLastRow();
  var　rng = sheet.getRange(2,2,(LastRow - 2 + 1), 5);
  rng.setBorder(true, true, true, true, true, false)
  rng.setBackground('#d9ead3')
  PropertiesService.getScriptProperties().setProperty(SheetName, spreadSheet.getId());
  var file = DriveApp.getFileById(spreadSheet.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return spreadSheet;
}

function getSpreadSheet(user_id) {
  var sid = PropertiesService.getScriptProperties().getProperty(user_id);
  if (sid == null) {
    return createSpreadSheet(user_id);
  } else {
    try {
      return SpreadsheetApp.openById(sid);
    } catch(e) {
      return createSpreadSheet(user_id);
    }
  }
}

function addToSpreadSheet(user_id, message) {
  var today = new Date();
  var spreadSheet = getSpreadSheet(user_id);
  var sheet = spreadSheet.getSheets()[0];
  const columnBVals = sheet.getRange('B:B').getValues();
  var insertRow = columnBVals.filter(String).length + 1;
  sheet.getRange(insertRow, 2).setValue(today);
  sheet.getRange(insertRow, 3).setValue(message);
  var　rng = sheet.getRange(insertRow,2,1,5);
  rng.setBorder(true, true, true, true, true, false)
}

function doPost(e) {
  var json = JSON.parse(e.postData.contents);

  var reply_token= json.events[0].replyToken;
  if (typeof reply_token === 'undefined') {
    return;
  }

  var user_id = json.events[0].source.userId;
  var user_message = json.events[0].message.text;

  var reply_messages;
  var spreadSheet;
  if ('ヘルプ' == user_message) {
    reply_messages = ["出来たことの記録が見たい時は「url」と入力してください。\n\nそれ以外の文字列が入力された場合は、「できたこと」として記録します。"];
  } else if ('url' == user_message) {
    spreadSheet = getSpreadSheet(user_id);
    reply_messages = [spreadSheet.getUrl()];
  } else if (typeof user_message === 'undefined') {
    reply_messages = ["すいません、文字以外の情報には対応していません。\n\n使い方が知りたいときは「ヘルプ」と入力してみてください。"];
  } else {
    addToSpreadSheet(user_id, user_message);
    reply_messages = ['やったね！'];
  }

  var messages = reply_messages.map(function (v) {
    return {'type': 'text', 'text': v};
  });
  UrlFetchApp.fetch(line_endpoint, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': reply_token,
      'messages': messages,
    }),
  });
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}
