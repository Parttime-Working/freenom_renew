require('dotenv').config()
// const CronJob = require('cron').CronJob

const Freenom = require('./config/freenom')

// const Freenom_job = new CronJob(process.env.FREENOM_CRONJOB, async () => {
//   if (Freenom.browser) await Freenom.close()
//   await Freenom.init()
// })

// Freenom_job.start()

// TEST
Freenom.init().then(() => {
  console.log('done')
  process.exit(0)
}).catch(err => {
  console.error(err)
  process.exit(1)
})
