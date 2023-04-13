const { CheckinLog } = require('../models')

class CheckinLogService {
  async createNew(data) {
    return await CheckinLog.create(data)
  }

  async isFirstCheckinDay(created, person_name) {
    const createdDate = new Date(created)
    const start = new Date()
    start.setHours(0,0,0,0)

    const end = new Date()
    end.setHours(23,59,59,999)

    if (createdDate.getTime() < start.getTime() || createdDate.getTime() > end.getTime()) return false

    return await CheckinLog.findOne({
      person_name,
      created: {
        $gte: start,
        $lte: end
      }
    })
  }

  async updateById(_id, data) {
    return await CheckinLog.findOneAndUpdate({
      _id
    }, data)
  }

  async getTodayCheckinLogs() {
    const start = new Date()
    start.setHours(0,0,0,0)

    const end = new Date()
    end.setHours(23,59,59,999)

    return await CheckinLog.find({
      created: {
        $gte: start,
        $lte: end
      }
    })
  }
}

module.exports = new CheckinLogService()