const { createNewMonthSheet,
  checkExistSheet,
  authorize,
  SPREAD_SHEET_ID,
  getUserSheetData,
  getNewRefreshToken
} = require('./xlsx')
const {google} = require('googleapis');

async function main() {
  try {
    let auth = await authorize()
    let service = google.sheets({version: 'v4', auth})
    let res = await service.spreadsheets.values.get({
      spreadsheetId: SPREAD_SHEET_ID,
      range: '202301',
    });
    console.log(res)
  } catch (error) {
    console.log(error)
    auth = getNewRefreshToken()
    service = google.sheets({version: 'v4', auth})
    res = await service.spreadsheets.values.get({
      spreadsheetId: SPREAD_SHEET_ID,
      range: '202301',
    });
    console.log(res)
  }
}

main()