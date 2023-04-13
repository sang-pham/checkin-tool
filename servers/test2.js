const { google } = require('googleapis')

const SPREAD_SHEET_ID = '1Vz2OMIN_mbGYZ6EgNkoO_9mZP0Rg_lHhUCVgtyA0Zeo'

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'servers/iot-project-372306-1bca45efa7c6.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  const service = google.sheets({version: 'v4', auth})
  const res = await service.spreadsheets.values.get({
    spreadsheetId: SPREAD_SHEET_ID,
    range: '202301',
  });
  console.log(res.data.values)
}

main()