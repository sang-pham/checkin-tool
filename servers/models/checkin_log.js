const { Schema, model } = require('mongoose')

const CheckinLogSchema = new Schema({
  detected_image_url: {
    type: String
  },
  created: {
    type: Date,
    default: Date.now
  },
  person_name: {
    type: String
  },
  person_id: {
    type: String
  },
  place_name: {
    type: String,
    default: 'IoT'
  }
})

const CheckinLog = model('Checkin_Log', CheckinLogSchema)
module.exports = CheckinLog;