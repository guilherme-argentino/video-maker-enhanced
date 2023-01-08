import { keyInSelect, question } from 'readline-sync'
import Parser from 'rss-parser'
import { save } from './state.js'

async function robot () {
  const content = {
    maximumSentences: 7
  }

  const searchTermInputOptions = ['Google Trends', 'Keyboard']

  const searchTermInputOption = askSearchTermSource()

  content.searchTerm = await selectSearchTermFlow(searchTermInputOption)
  const { selectedLangText, selectedLangIndex } = askAndReturnLanguage()
  content.lang = selectedLangText
  const { selectedPrefixText } = askAndReturnPrefix(selectedLangIndex)
  content.prefix = selectedPrefixText
  save(content)

  async function selectSearchTermFlow (searchTermInputOption) {
    let result = ''
    switch (searchTermInputOption) {
      case 'Google Trends':
        result = await askAndReturnTrend()
        break
      case 'Keyboard':
      default:
        result = askAndReturnSearchTerm()
    }
    return result
  }

  function askSearchTermSource () {
    const searchTermInputOptionIndex = keyInSelect(
      searchTermInputOptions,
      'Choose one option: '
    )
    return searchTermInputOptions[searchTermInputOptionIndex]
  }

  function askAndReturnSearchTerm () {
    return question('Type a Wikipedia search term: ')
  }

  function askAndReturnPrefix (selectedLangIndex) {
    const prefixes = [['Quem é', 'O que é', 'A história de'], ['Who is', 'What is', 'The history of']]
    const prefixesBySelectedLang = prefixes[selectedLangIndex]
    const selectedPrefixIndex = keyInSelect(
      prefixesBySelectedLang,
      'Choose one option: '
    )
    const selectedPrefixText = prefixes[selectedLangIndex][selectedPrefixIndex]

    return {
      selectedPrefixText,
      selectedPrefixIndex
    }
  }

  async function askAndReturnTrend () {
    const geo = ['BR', 'US']
    const selectedGeoIndex = keyInSelect(geo, 'Choice Trend Geo: ')
    const selectedGeoText = geo[selectedGeoIndex]
    content.trendGeo = selectedGeoText

    console.log('Please Wait...')
    const trends = await getGoogleTrends()
    const choice = keyInSelect(trends, 'Choose your trend:')

    return trends[choice]
  }

  async function getGoogleTrends () {
    const TREND_URL = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${
      content.trendGeo}`

    const parser = new Parser()
    const trends = await parser.parseURL(TREND_URL)
    return trends.items.map(({ title }) => title)
  }

  function askAndReturnLanguage () {
    const language = ['pt', 'en']
    const selectedLangIndex = keyInSelect(
      language,
      'Choice Language: '
    )
    const selectedLangText = language[selectedLangIndex]
    return {
      selectedLangText,
      selectedLangIndex
    }
  }
}

module.exports = robot
