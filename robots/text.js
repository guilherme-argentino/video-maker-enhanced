import { sentences as _sentences } from 'sbd'
import NaturalLanguageUnderstandingV1 from 'watson-developer-cloud/natural-language-understanding/v1.js'

import { apikey as watsonApiKey, url as watsonUrl } from '../credentials/watson-nlu.json'

import { apiKey as gotitaiApiKey } from '../credentials/gotit.ai.json'

import { load, save } from './state.js'

import WikipediaFactory from './text/fetch-wikipedia'
// const wikipediaFetcher = WikipediaFactory('Algorithmia')
const wikipediaFetcher = WikipediaFactory('WikipediaAPI')

const fetch = require('./fetch')

const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: '2018-04-05',
  url: watsonUrl
})

const gotitailanguages = {
  pt: 'PtBr',
  en: 'EnUs'
}

async function robot () {
  console.log('> [text-robot] Starting...')
  const content = load()

  await wikipediaFetcher.fetch(content)
  sanitzeContent()
  breakContentIntoSentences()
  limitMaximumSentences()
  await fetchKeywordsOfAllSentences()
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

  function breakContentIntoSentences () {
    content.sentences = []

    const sentences = _sentences(
      content.sourceContentSanitized
    )
    sentences.forEach((sentence) => {
      content.sentences.push({
        text: sentence,
        wordcount: countWords(sentence),
        keywords: [],
        images: []
      })
    })
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

  async function fetchKeywordsOfAllSentences () {
    console.log('> [text-robot] Starting to fetch keywords from Watson')
    const listOfKeywordsToFetch = []

    content.sentences.forEach((element, index, array) => {
      listOfKeywordsToFetch.push(fetchWatsonAndReturnKeywords(element, index))
    })

    await Promise.all(listOfKeywordsToFetch)
  }

  function countWords (sentence) {
    const index = {
      total: 0,
      words: []
    }
    const words = sentence
      .replace(/[.,?!;()"'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')

    words.forEach((word) => {
      if (!Object.prototype.hasOwnProperty.call(index.words, word)) {
        index.words[word] = 0
      }
      index.words[word]++
      index.total++
    })

    return index
  }

  async function fetchWatsonAndReturnKeywords (sentence, index) {
    return new Promise((resolve, reject) => {
      nlu.analyze(
        {
          text: sentence.text,
          features: {
            keywords: {}
          }
        },
        (error, response) => {
          if (error) {
            reject(error)
            return
          }

          const keywords = response.keywords.map((keyword) => keyword.text)

          sentence.keywords = keywords

          console.log(`> [text-robot] Sentence [${index}]: "${sentence.text}"`)
          console.log(`> [text-robot] Keywords [${index}]: ${sentence.keywords.join(', ')}\n`)

          resolve(keywords)
        }
      )
    })
  }
}

module.exports = robot
