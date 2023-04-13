const express = require("express")
const TelegramBot = require('node-telegram-bot-api')
const nodeCron = require('node-cron')
const { randomTime, isNextDay } = require('./time')
const bodyParser = require("body-parser")
const { createNewMonthSheet,
  checkExistSheet,
  authorize,
  SPREAD_SHEET_ID,
  SCOPES,
  getUserSheetData
} = require('./xlsx')
const {google} = require('googleapis')
const mongoose = require('mongoose')
const app = express()
const PORT = 3002
app.use(bodyParser.json())
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
const config = require('./config')
const { checkinLogService, checkinTimeService } = require('./services')

const CheckinLog = require('./models/checkin_log')

mongoose.set("strictQuery", false);

mongoose.connect(config.db, { useNewUrlParser: true, useUnifiedTopology: true });

const TOKEN = process.env.TOKEN
const GROUP_ID = -1001686140005
const LUNCH_GROUP_ID = -1001675221274

const bot = new TelegramBot(TOKEN, {polling: true});

bot.on('message', (message, metadata) => {
  console.log('message', message)
})

app.use(bodyParser.json())

const randomCheckinTime = () => randomTime(9,  9, 2, 10)

// register webhooks and push message to Telegram.
app.post("/checkin-data", async (req, res) => {
  console.log(JSON.stringify(req.body))
  const body = req.body
  if (body) {
    let {date, personName,detected_image_url} = req.body
    let today = new Date().getDate()
    let checkinDate = new Date(date).getDate()
    if (personName && today == checkinDate) {
      let checkinTimeData = await checkinTimeService.getTodayCheckinTime()
      console.log(checkinTimeData)
      let checkinTime
      if (!checkinTimeData) {
        checkinTimeData = await checkinTimeService.createNew({
          checkin_time: randomCheckinTime(),
	  date: new Date().setHours(0, 0, 0, 0),
          notified: true
        })
      }
      checkinTime = new Date(checkinTimeData.checkin_time)
      const result = await checkinLogService.isFirstCheckinDay(body.date, body.personName)
      if (!result) {
        await CheckinLog.create({
          detected_image_url,
          created: body.date,
          person_name: body.personName,
          person_id: body.personID,
          place_name: body.placeName
        })
        let message = `${personName} checkin on time: ${date}.`
        if (new Date(date).getTime() > checkinTime.getTime()) {
          message += ' Congratulations. You are late and we\'ll receive 20k. Thanks for your donation.'
        }
        bot.sendMessage(GROUP_ID, message)
        console.log(message)
      } else {
        const createDate = new Date(body.date)
        const oldDate = new Date(result.created)
        if (createDate.getDate() == oldDate.getDate() && createDate.getTime() < oldDate.getTime()) {
          console.log("HELLO")
          await checkinLogService.updateById(result._id, {
            created: body.date
          })
        }
      }
    }
  }
  res.status(200).end() // Responding is important
})

// run on 18h per day => summary revenue per day
const summaryDatatask = nodeCron.schedule('0 18 * * *', async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'iot-project-372306-1bca45efa7c6.json',
    scopes: SCOPES
  })
  const service = google.sheets({version: 'v4', auth})
  const date = new Date()
  let checkinTimeData = await checkinTimeService.getTodayCheckinTime()
  if (!checkinTimeData) {
    checkinTimeData = await checkinTimeService.createNew({
      checkin_time: randomCheckinTime(),
      date: new Date().setHours(0, 0, 0, 0)
    })
  }
  const checkinTime = new Date(checkinTimeData.checkin_time)
  const checkinDay = checkinTime.getDate()
  let money = 0
  if (checkinDay > 20) {
    date.setMonth(date.getMonth() + 1)
  }
  const sheetMonth = checkinTime.getMonth() + 1
  let today = `${checkinDay}/${sheetMonth}`
  console.log(`Start calculating revenue for ${today}`)

  const sheetName = date.getFullYear().toString() +(date.getMonth() < 9 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1))

  const res = await service.spreadsheets.values.get({
    spreadsheetId: SPREAD_SHEET_ID,
    range: sheetName,
  });
  let values = res.data.values

  let colIdx = values[0].indexOf(today)
  if (colIdx >= 0) {
    console.log(colIdx)
    const checkinLogs = await checkinLogService.getTodayCheckinLogs()
    for (const checkinLog of checkinLogs) {
      let idx = values.findIndex(item => item[3] && item[3].toString().toLowerCase().includes(checkinLog.person_name.toLowerCase()))
      console.log(idx)
      if (idx < 0) continue
      if (new Date(checkinLog.created).getTime() > checkinTime.getTime()) {
        money += 20
      }
    }
  }

  console.log(`Total revenue on ${today}/${checkinTime.getFullYear()}: ${money}`)
  bot.sendMessage(GROUP_ID, `Total revenue on ${today}/${checkinTime.getFullYear()}: ${money}`)
})

const generateCheckinTime = nodeCron.schedule('15 0 * * *', async () => {
	let checkinTimeData = await checkinTimeService.createNew({
		checkin_time: randomCheckinTime(),
		date: new Date().setHours(0, 0, 0, 0),
		notified: false
	})
	console.log(checkinTimeData);
})

const lunchNotifyTassk = nodeCron.schedule('48 14 * * 1,2,3,4,5,6', async () => {
  try {
    await bot.sendPoll(LUNCH_GROUP_ID, 'Anhbt mời cơm trưa mọi người nha =)))', ['Ăn', 'Không ăn'], { is_anonymous: true })
  } catch (error) {
  console.log(error)
  }
})

// run on 8:30h per day => reset data and get new checkin time
const resetTask = nodeCron.schedule('30 8 * * *', async () => {
  let checkinTimeData = await checkinTimeService.getTodayCheckinTime()
  if (checkinTimeData) {
    bot.sendMessage(GROUP_ID, `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nRandom checkin time today: ${new Date(checkinTimeData.checkin_time).toString()}`)
    return
  }
  let checkinTime = randomCheckinTime()
  bot.sendMessage(GROUP_ID, `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nRandom checkin time today: ${checkinTime.toString()}`)
  await checkinTimeService.createNew({
    checkin_time: checkinTime,
    date: new Date().setHours(0, 0, 0, 0),
    notified: true
  })
})

const writeToSheet = nodeCron.schedule('0 8-17 * * *', async () => {
  const date = new Date()
  const auth = new google.auth.GoogleAuth({
    keyFile: 'iot-project-372306-1bca45efa7c6.json',
    scopes: SCOPES
  })
  const service = google.sheets({version: 'v4', auth})
  let checkinTimeData = await checkinTimeService.getTodayCheckinTime()
    if (!checkinTimeData) {
      checkinTimeData = await checkinTimeService.createNew({
        checkin_time: randomCheckinTime(),
	date: new Date().setHours(0, 0, 0, 0)
      })
    }
  const checkinTime = new Date(checkinTimeData.checkin_time)
  console.log(checkinTime)
  const checkinDay = checkinTime.getDate()

  if (checkinDay > 20) { 
    date.setMonth(date.getMonth() + 1)
  }

  const sheetName = date.getFullYear().toString() +(date.getMonth() < 9 ? `0${date.getMonth() + 1}` : (date.getMonth() + 1))
  console.log(sheetName)
  //create sheet if not exists
  try {
    await checkExistSheet(service, sheetName)
  } catch (error) {
    console.log(error.code, error.message)
    if (error.code == 400 || error.message.startsWith('Unable to parse range')) {
      await createNewMonthSheet(service, sheetName)
    }
  }

  //get sheet data
  const res = await service.spreadsheets.values.get({
    spreadsheetId: SPREAD_SHEET_ID,
    range: sheetName,
  });
  let values = res.data.values
  
  //return value back
  if (checkinDay > 20) {
    date.setMonth(date.getMonth() - 1)
  }

  const month = date.getMonth() + 1
  let today = `${checkinDay}/${month}`
  console.log(today) //example value: 21/12

  let colIdx = values[0].indexOf(today)
  if (colIdx >= 0) {
    console.log(colIdx)
    const userData = await getUserSheetData(service)
    const checkinLogs = await checkinLogService.getTodayCheckinLogs()
    for (const checkinLog of checkinLogs) {
      let idx = values.findIndex(item => item[3] && item[3].toString().toLowerCase().includes(checkinLog.person_name.toLowerCase()))
      console.log(idx)
      if (idx < 0) continue
      if (new Date(checkinLog.created).getTime() > checkinTime.getTime()) {
        values[idx][colIdx] = 'x'
      } else {
        values[idx][colIdx] = checkinLog.detected_image_url
      }
    }

    if(userData.length) {
      if (!values[userData.length + 1]) {
        values[userData.length + 1] = []
      }
      values[userData.length + 1][colIdx] = `${checkinTime.getHours()}:${checkinTime.getMinutes()}`
    }
    const resource = {
      values
    }
    await service.spreadsheets.values.update({
      spreadsheetId: SPREAD_SHEET_ID,
      range: sheetName,
      resource,
      valueInputOption: "RAW"
    });
  }
})
