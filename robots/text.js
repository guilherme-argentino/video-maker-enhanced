const algorithmia = require('algorithmia');
const sentenceBoundaryDetection = require('sbd');
const fetch = require('node-fetch');
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

const watsonApiKey = require('../credentials/watson-nlu.json').apikey;
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey;

const gotitaiApiKey = require('../credentials/gotit.ai.json').apiKey;

const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/',
});

const gotitailanguages = {
  pt: 'PtBr',
  en: 'EnUs',
};

const state = require('./state.js');

async function robot() {
  console.log('> [text-robot] Starting...');
  const content = state.load();

  await fetchContentFromWikipedia();
  sanitzeContent();
  breakContentIntoSentences();
  limitMaximumSentences();
  await fetchKeywordsOfAllSentences();
  await fetchGotItAi();

  state.save(content);

  async function fetchContentFromWikipedia() {
    const algorithmiaAutenticated = algorithmia(algorithmiaApiKey);
    const wikipediaAlgorithm = algorithmiaAutenticated.algo(
      'web/WikipediaParser/0.1.2?timeout=300',
    );
    const wikipediaResponde = await wikipediaAlgorithm.pipe({
      lang: content.lang,
      articleName: content.searchTerm,
    });
    const wikipediaContent = wikipediaResponde.get();
    content.sourceContentOriginal = wikipediaContent.content;
  }

  function sanitzeContent() {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(
      content.sourceContentOriginal,
    );
    const withoutDatesInParenthesis = removeDatesInParenthesis(
      withoutBlankLinesAndMarkdown,
    );

    content.sourceContentSanitized = withoutDatesInParenthesis;

    function removeBlankLinesAndMarkdown(text) {
      const allLines = text.split('\n');

      const withoutBlankLinesAndMarkdownArray = allLines.filter((line) => {
        if (line.trim().length === 0 || line.trim().startsWith('=')) {
          return false;
        }
        return true;
      });
      return withoutBlankLinesAndMarkdownArray.join(' ');
    }
  }

  function removeDatesInParenthesis(text) {
    return text
      .replace(/\((?:\([^()]*\)|[^()])*\)/gm, '')
      .replace(/ {2}/g, ' ');
  }

  function breakContentIntoSentences() {
    content.sentences = [];

    const sentences = sentenceBoundaryDetection.sentences(
      content.sourceContentSanitized,
    );
    sentences.forEach((sentence) => {
      content.sentences.push({
        text: sentence,
        wordcount: countWords(sentence),
        keywords: [],
        images: [],
      });
    });
  }

  function limitMaximumSentences() {
    content.sentences = content.sentences.slice(0, content.maximumSentences);
  }

  async function fetchGotItAi() {
    const body = {
      T: content.sourceContentSanitized,
      S: true,
      EM: true,
      SL: gotitailanguages[content.lang],
    };
    const url = 'https://api.gotit.ai/NLU/v1.4/Analyze';
    console.log('> [text-robot] Getting feeling from GotIt.Ai');
    const getData = async (url) => {
      try {
        const response = await fetch(url, {
          method: 'post',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${gotitaiApiKey}`,
          },
        });

        const json = await response.json();
        const arr = Object.values(json.emotions);
        const max = Math.max(...arr);
        const emotions = Object.entries(json.emotions).reduce((ret, entry) => {
          const [key, value] = entry;
          ret[value] = key;
          return ret;
        }, {});
        content.feeling = emotions[max];
        console.log(
          `> [text-robot] the feeling is ${content.feeling}: by GotIt.Ai`,
        );
      } catch (error) {
        console.log(`> [text-robot] ${error}`);
      }
    };
    await getData(url);
  }

  async function fetchKeywordsOfAllSentences() {
    console.log('> [text-robot] Starting to fetch keywords from Watson');
    const listOfKeywordsToFetch = [];

    content.sentences.forEach((element, index, array) => {
      listOfKeywordsToFetch.push(fetchWatsonAndReturnKeywords(element));
    });

    await Promise.all(listOfKeywordsToFetch);
  }

  function countWords(sentence) {
    const index = {
      total: 0,
      words: [],
    };
    const words = sentence
      .replace(/[.,?!;()"'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ');

    words.forEach((word) => {
      if (!index.words.hasOwnProperty(word)) {
        index.words[word] = 0;
      }
      index.words[word]++;
      index.total++;
    });

    return index;
  }

  async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise((resolve, reject) => {

      nlu.analyze(
        {
          text: sentence.text,
          features: {
            keywords: {},
          },
        },
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          const keywords = response.keywords.map((keyword) => keyword.text);

          sentence.keywords = keywords

          console.log(`> [text-robot] Sentence: "${sentence.text}"`);
          console.log(`> [text-robot] Keywords: ${sentence.keywords.join(', ')}\n`);

          resolve(keywords);
        },
      );
    });
  }
}

module.exports = robot;
