import NaturalLanguageUnderstandingV1 from 'watson-developer-cloud/natural-language-understanding/v1.js'

import {
  apikey as watsonApiKey,
  url as watsonUrl
} from '../../credentials/watson-nlu.json'

const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: '2018-04-05',
  url: watsonUrl
})

// Factory method function created in safe mode
const ProcessKeywordsFactory = function (processMethod) {
    if (this instanceof ProcessKeywordsFactory) {
      const s = new this[processMethod]()
      return s
    } else {
      return new ProcessKeywordsFactory(processMethod)
    }
  }

ProcessKeywordsFactory.prototype = {
  WatsonMethod: function () {
    this.fetchKeywordsOfAllSentences = async function (content) {
      console.log('> [text-robot] Starting to fetch keywords from Watson')
      const listOfKeywordsToFetch = []

      content.sentences.forEach((element, index, array) => {
        listOfKeywordsToFetch.push(
          fetchWatsonAndReturnKeywords(element, index)
        )
      })

      await Promise.all(listOfKeywordsToFetch)

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

              console.log(
                `> [text-robot] Sentence [${index}]: "${sentence.text}"`
              )
              console.log(
                `> [text-robot] Keywords [${index}]: ${sentence.keywords.join(
                  ', '
                )}\n`
              )

              resolve(keywords)
            }
          )
        })
      }
    }
  },
  Skip: function () {
    this.fetchKeywordsOfAllSentences = async function (content) {
      console.log('> [text-robot][process-keywords] Do nothing')
    }
  }
}

export default ProcessKeywordsFactory
