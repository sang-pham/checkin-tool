const { Schema, model } = require('mongoose')

const CheckinTimeSchema = new Schema({
  checkin_time: {
    type: Date
  },
  date: {
    type: Date,
    default: new Date().setHours(0, 0, 0, 0)
  },
  notified: {
    tyep: Boolean,
    default: false
  }
})

const CheckinTime = model('Checkin_Time', CheckinTimeSchema)
module.exports = CheckinTime