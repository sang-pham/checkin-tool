const columnFormat = [
  {
    startIndex: 0,
    endIndex: 1,
    pixelSize: 30
  },
  {
    startIndex: 1,
    endIndex: 2,
    pixelSize: 70
  },
  {
    startIndex: 2,
    endIndex: 3,
    pixelSize: 160
  },
  {
    startIndex: 3,
    endIndex: 4,
    pixelSize: 100
  },
  {
    startIndex: 4,
    endIndex: 5,
    pixelSize: 70
  },
  {
    startIndex: 5,
    endIndex: 6,
    pixelSize: 70
  },
  {
    startIndex: 6,
    endIndex: 7,
    pixelSize: 70
  }
]

const db = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}${process.env.MONGOQUERYPARAMS}`

module.exports = {
  columnFormat,
  db
}