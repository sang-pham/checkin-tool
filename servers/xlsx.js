const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { columnFormat } = require('./config')
const { daysInMonth } = require('./time')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREAD_SHEET_ID = '1Vz2OMIN_mbGYZ6EgNkoO_9mZP0Rg_lHhUCVgtyA0Zeo'
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function getNewRefreshToken() {
  let client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
    prompt: 'consent'
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  return await getNewRefreshToken();
}

function genWorkingMonth(date) {
  const previousMonthDate = new Date(date)
  if (date.getDate() < 21) {
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1)
  } else {
    date.setMonth(date.getMonth() + 1)
  }
  const previousMonthDays = daysInMonth(previousMonthDate.getFullYear(), previousMonthDate.getMonth())
  const startDate = 21
  const endDate = 20
  const res = []
  for (let i = startDate; i <= previousMonthDays; i++) {
    res.push(`${i}/${previousMonthDate.getMonth() + 1}`)
  }
  for (let i = 1; i <= endDate; i++) {
    res.push(`${i}/${date.getMonth() + 1}`)
  }
  return res
}

async function getUserSheetData(service) {
  const res = await service.spreadsheets.values.get({
    spreadsheetId: SPREAD_SHEET_ID,
    range: 'Users',
  });
  return res.data.values
}

async function checkExistSheet(service, title) {
  const res = await service.spreadsheets.values.get({
    spreadsheetId: SPREAD_SHEET_ID,
    range: title,
  });
  return res
}

async function formatSheet(service, sheetId) {
  const requestColumnFormat = columnFormat.map(item => ({
    "updateDimensionProperties": {
      "range": {
        "sheetId": sheetId,
        "dimension": "COLUMNS",
        "startIndex": item.startIndex,
        "endIndex": item.endIndexd
      },
      "properties": {
        "pixelSize": item.pixelSize
      },
      "fields": "pixelSize"
    }
  }))
  await service.spreadsheets.batchUpdate({
    spreadsheetId: SPREAD_SHEET_ID,
    requestBody: {
      requests: [
        ...requestColumnFormat
      ]
    }
  });
}

async function createNewMonthSheet(service, title) {
  try {
    const spreadsheet = await service.spreadsheets.batchUpdate({
      spreadsheetId: SPREAD_SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: title,
            }
          }
        }]
      }
    });
    const sheetId = spreadsheet.data.replies[0]['addSheet']['properties']['sheetId']
  
    //load default value
    const userData = await getUserSheetData(service)
    const date = new Date()

    const workingDate = genWorkingMonth(date)
    userData[0].push('Đi muộn', 'Quên CC', 'Ko duyệt', 'Số tiền', 'Ngày quên', 'Trạng thái','Note', '', '', ...workingDate)
    for (let i = 1;i < userData.length; i++) {
      userData[i].push(0, 0, 0, 0, '', '', '', 0, '', ...workingDate.map(item => ''))
    }
    const resource = {
      values: userData
    }
    const result = await service.spreadsheets.values.update({
      spreadsheetId: SPREAD_SHEET_ID,
      range: title,
      resource,
      valueInputOption: "RAW"
    });
    await formatSheet(service, sheetId)
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  checkExistSheet,
  authorize,
  createNewMonthSheet,
  genWorkingMonth,
  getUserSheetData,
  SPREAD_SHEET_ID,
  getNewRefreshToken,
  SCOPES
}