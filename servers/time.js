const randomTime = (startHour, endHour, startMinute, endMinute) => {
  const date = new Date()
  const hour = startHour + Math.random() * (endHour - startHour) | 0
  const minute = startMinute + Math.random() * (endMinute - startMinute) | 0
  const second = Math.round(Math.random() * 60)
  date.setHours(hour)
  date.setMinutes(minute)
  date.setSeconds(second)
  return date
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function isNextDay(beforeDate, afterDate) {
  let _afterDate = new Date(afterDate)
  _afterDate.setDate(_afterDate.getDate() - 1)
  
  return new Date(beforeDate).getDate() == _afterDate.getDate()
}

module.exports = {
  randomTime,
  daysInMonth,
  isNextDay
}