import { load, save } from './state.js'

import WikipediaFactory from './text/fetch-wikipedia'
import ProcessSentencesFactory from './text/process-sentences'
import ProcessKeywordsFactory from './text/process-keywords'
import ProcessScriptFactory from './text/process-script'

const wikipediaFetcher = WikipediaFactory('WikipediaAPI')
const processSentencesFactory = ProcessSentencesFactory('SbdMethod')
const processKeywordsFactory = ProcessKeywordsFactory('WatsonMethod')
const processScriptFactory = ProcessScriptFactory('GotitAi')

async function robot () {
  console.log('> [text-robot] Starting...')
  const content = load()

  await wikipediaFetcher.fetch(content)
  sanitzeContent()
  await processSentencesFactory.breakContentIntoSentences(content)
  limitMaximumSentences()
  await processKeywordsFactory.fetchKeywordsOfAllSentences(content)
  await processScriptFactory.processScript(content)

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
}

module.exports = robot
