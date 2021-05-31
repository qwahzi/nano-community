const debug = require('debug')
const moment = require('moment')
const fetchCheerioObject = require('fetch-cheerio-object')

const { request } = require('../common')
const db = require('../db')

const logger = debug('import:representatives:meta')
debug.enable('import:representatives:meta')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const timestamp = Math.round(Date.now() / 1000)

const main = async () => {
  const reps = await db('accounts').where({ representative: true })

  for (const rep of reps) {
    const url = `https://mynano.ninja/api/accounts/${rep.account}`
    let res

    try {
      res = await request({ url })
    } catch (err) {
      console.log(err)
    }

    if (!res) {
      continue
    }

    const ninjaUrl = `https://mynano.ninja/account/${res.slug || res.account}`
    const sanitize = (str) =>
      str
        .replace(/(reddit|github|discord|twitter)/gi, '')
        .replace(/\r?\n|\r/g, '')
        .trim()
    const $ = await fetchCheerioObject(ninjaUrl)
    const reddit = sanitize($('.fa-reddit').parent().text())
    const twitter = sanitize($('.fa-twitter').parent().text())
    const github = sanitize($('.fa-github').parent().text())
    const discord = sanitize($('.fa-discord').parent().text())

    const meta = {
      account: res.account,

      cpu_description: res.server ? res.server.cpu : null,
      ram_description: res.server ? res.server.ram : null,
      type: res.server ? res.server.type : null,
      provider: res.network ? res.network.provider : null,
      mynano_ninja: ninjaUrl,
      created_at: moment(res.created).unix(),
      description: res.description,

      reddit,
      github,
      twitter,
      discord,

      timestamp
    }

    logger(`saving meta for account: ${meta.account}`)
    await db('representatives_meta').insert(meta)
    await wait(1500)
  }
}

module.exprots = main

if (!module.parent) {
  const init = async () => {
    await main()
    process.exit()
  }

  try {
    init()
  } catch (err) {
    console.log(err)
    process.exit()
  }
}