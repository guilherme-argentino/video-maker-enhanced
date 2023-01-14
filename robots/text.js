import { apiKey as gotitaiApiKey } from '../credentials/gotit.ai.json'

import { load, save } from './state.js'

import WikipediaFactory from './text/fetch-wikipedia'
import ProcessSentencesFactory from './text/process-sentences'
import ProcessKeywordsFactory from './text/process-keywords'

const fetch = require('./fetch')

const wikipediaFetcher = WikipediaFactory('WikipediaAPI')
const processSentencesFactory = ProcessSentencesFactory('SbdMethod')
const processKeywordsFactory = ProcessKeywordsFactory('WatsonMethod')

const gotitailanguages = {
  pt: 'PtBr',
  en: 'EnUs'
}

async function robot () {
  console.log('> [text-robot] Starting...')
  const content = load()

  await wikipediaFetcher.fetch(content)
  sanitzeContent()
  await processSentencesFactory.breakContentIntoSentences(content)
  limitMaximumSentences()
  await processKeywordsFactory.fetchKeywordsOfAllSentences(content)
  await fetchGotItAi()

  save(content)

  function sanitzeContent () {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(
      content.sourceContentOriginal
    )
    const withoutDatesInParenthesis = removeDatesInParenthesis(
      withoutBlankLinesAndMarkdown
    )

    content.sourceContentSanitized = withoutDatesInParenthesis

    function removeBlankLinesAndMarkdown (text) {
      const allLines = text.split('\n')

      const withoutBlankLinesAndMarkdownArray = allLines.filter((line) => {
        if (line.trim().length === 0 || line.trim().startsWith('=')) {
          return false
        }
        return true
      })
      return withoutBlankLinesAndMarkdownArray.join(' ')
    }
  }

  function removeDatesInParenthesis (text) {
    return text
      .replace(/\((?:\([^()]*\)|[^()])*\)/gm, '')
      .replace(/ {2}/g, ' ')
  }

  function limitMaximumSentences () {
    content.sentences = content.sentences.slice(0, content.maximumSentences)
  }

  async function fetchGotItAi () {
    const body = {
      T: content.sourceContentSanitized,
      S: true,
      EM: true,
      SL: gotitailanguages[content.lang]
    }
    const url = 'https://api.gotit.ai/NLU/v1.4/Analyze'
    console.log('> [text-robot] Getting feeling from GotIt.Ai')
    const getData = async (url) => {
      try {
        const response = await fetch(url, {
          method: 'post',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${gotitaiApiKey}`
          }
        })

        const json = await response.json()
        const arr = Object.values(json.emotions)
        const max = Math.max(...arr)
        const emotions = Object.entries(json.emotions).reduce((ret, entry) => {
          const [key, value] = entry
          ret[value] = key
          return ret
        }, {})
        content.feeling = emotions[max]
        console.log(
          `> [text-robot] the feeling is ${content.feeling}: by GotIt.Ai`
        )
      } catch (error) {
        console.log(`> [text-robot] ${error}`)
      }
    }
    await getData(url)
  }
}

module.exports = robot
