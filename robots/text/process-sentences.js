import { sentences as _sentences } from 'sbd'
const lexrank = require('lexrank')

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

// Factory method function created in safe mode
const ProcessSentencesFactory = function (processMethod) {
  if (this instanceof ProcessSentencesFactory) {
    const s = new this[processMethod]()
    return s
  } else {
    return new ProcessSentencesFactory(processMethod)
  }
}

ProcessSentencesFactory.prototype = {
  SbdMethod: function () {
    this.breakContentIntoSentences = async function (content) {
      content.sentences = []

      const sentences = _sentences(content.sourceContentSanitized)
      sentences.forEach((sentence) => {
        content.sentences.push({
          text: sentence,
          wordcount: countWords(sentence),
          keywords: [],
          images: []
        })
      })
    }
  },
  LexRankMethod: function () {
    this.breakContentIntoSentences = async function (content) {
      await breakContentIntoLexicalRankedSentences(content)

      async function breakContentIntoLexicalRankedSentences (content) {
        content.sentences = []

        lexrank(content.sourceContentSanitized, (err, result) => {
          if (err) {
            throw err
          }

          const sentences = result[0].sort(function (a, b) {
            return b.weight.average - a.weight.average
          })

          sentences.forEach((sentence) => {
            content.sentences.push({
              text: sentence.text,
              wordcount: countWords(sentence),
              keywords: [],
              images: []
            })
          })
        })
      }
    }
  }
}

export default ProcessSentencesFactory
