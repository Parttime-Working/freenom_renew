const puppeteerOpts = require('./puppeteer').options
const puppeteer = require('puppeteer')

const line = require('./line')

const freenom = {
  browser: null,
  page: null,
  url: 'https://my.freenom.com/domains.php?a=renewals',
  close: async () => {
    if (!freenom.browser) return true
    await freenom.browser.close().then(async () => {
      freenom.browser = null
      console.log(`Scrap finished for ${freenom.url}`)
    })
  },
  init: async () => {
    try {
      freenom.browser = await puppeteer.launch(puppeteerOpts)
      freenom.page = await freenom.browser.newPage()
      await freenom.page.setViewport({ width: 1900, height: 1000, deviceScaleFactor: 1 })

      await freenom.page.goto(freenom.url, { waitUntil: 'networkidle2' })

      const title = await freenom.page.title()
      console.log(title)


      const isLoggedIn = await new Promise((resolve) => {
        freenom.page
          .waitForSelector('section.renewalContent', { timeout: 3 * 1000 })
          .then(() => resolve(true))
          .catch(() => resolve(false))
      })

      if (!isLoggedIn) {
        // need human, maybe
        await line.broadcast({
          type: 'text',
          text: `Auth timeout, please manual auth.`,
        })
        await freenom.login()
      };

      await freenom.renewFreeDomains()
    } catch (e) {
      console.error('[INIT] Failed', e)
    } finally {
      await freenom.close()
    }

  },
  login: async () => {
    try {
      await freenom.page
        .type('input[name="username"]', process.env.FREENOM_LOGIN, { delay: 35 })
        .then(async () => console.log('Username complete'))
      await freenom.page.waitForTimeout(500)
      await freenom.page
        .type('input[name="password"]', process.env.FREENOM_PASS, { delay: 35 })
        .then(async () => console.log('Password complete'))

      await freenom.page.evaluate(() => {
        document.querySelector("#rememberMe").click();
      });

      await freenom.page.evaluate(() => document.getElementsByTagName('form')[0].submit())
      await freenom.page.waitForSelector('.renewalContent', { timeout: 12 * 60 * 60 * 1000 })
      console.log('connected')
    } catch (e) {
      console.error('[login] Error', e)
      await freenom.close()
    }
  },
  renewFreeDomains: async () => {
    try {
      const domains = await freenom.page.evaluate(() => {
        let domains = []
        for (let i = 0; i < document.getElementsByTagName('tbody')[0].children.length; i++) {
          domains.push({
            name: document.getElementsByTagName('tbody')[0].children[i].childNodes[0].innerText,
            status: document.getElementsByTagName('tbody')[0].children[i].childNodes[1].innerText,
            expires: document.getElementsByTagName('tbody')[0].children[i].childNodes[2].innerText,
            renewable: document.getElementsByTagName('tbody')[0].children[i].childNodes[3].innerText === 'Renewable',
            renewLink: document.getElementsByTagName('tbody')[0].children[i].childNodes[5].childNodes[0].href,
          })
        }

        return domains
      })

      const messages = await Promise.all(domains.map(async domain => {
        let message = ``
        const daysLeft = parseInt(domain.expires.replace(' Days', ''))
        message += `[${domain.name}] : **${daysLeft}** days left.\n${daysLeft < 14 ? 'Starting auto renewal.' : 'No need to renewal'}\n`

        if (daysLeft < 14) {
          await freenom.page.goto(domain.renewLink, { waitUntil: 'networkidle2' })
          await freenom.page.waitForSelector('.renewDomains')
          await freenom.page.evaluate(() => document.getElementsByTagName('option')[11].selected = true)
          await freenom.page.evaluate(() => document.getElementsByTagName('form')[0].submit())
          await freenom.page.waitForSelector('.completedOrder').catch(async () => {
            message += `**[${domain.name}]** An error has occurred while trying to auto renew this domain`
          })
          message += `**[${domain.name}]** Auto renewal complete !`
        }

        return message
      }))

      await line.broadcast({
        type: 'text',
        text: `${messages.join('\n')}`,
      })
    } catch (e) {
      console.error('[renew] Error', e)

      await line.broadcast({
        type: 'text',
        text: `${e.message}`,
      })
    }
    await freenom.close()
  },
}

module.exports = freenom
