const { CheckinTime } = require('../models')

class CheckinTimeService {
  async createNew(data) {
    return await CheckinTime.create(data)
  }

  async getTodayCheckinTime() {
    const start = new Date()
    start.setHours(0,0,0,0)

    const end = new Date()
    end.setDate(start.getDate() + 1)
    end.setHours(0,0,0,0)

    return await CheckinTime.findOne({
      date: {
        $gte: start,
        $lt: end
      }
    })
  }
}

module.exports = new CheckinTimeService()