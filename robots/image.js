import { image } from 'image-downloader'
import { google } from 'googleapis'
import { load, save } from './state.js'

import { apiKey, searchEngineId } from '../credentials/google-search.json'

const customSearch = google.customsearch('v1')

async function robot () {
  console.log('> [image-robot] Starting...')
  const content = load()

  await fetchImagesOfAllSentences()
  await downloadAllImages(content)

  save(content)

  async function fetchImagesOfAllSentences () {
    const listOfImagesToFetch = []

    content.sentences.forEach((element, index) => {
      listOfImagesToFetch.push(fetchImagesFromOneSentence(element, index))
    })

    await Promise.all(listOfImagesToFetch)
  }

  async function fetchImagesFromOneSentence (element, sentenceIndex) {
    let query
    if (sentenceIndex === 0) {
      query = `${content.searchTerm}`
    } else {
      query = `${content.searchTerm} ${content.sentences[sentenceIndex].keywords[0]}`
    }
    console.log(`> [image-robot] Querying Google Images with: "${query}"`)
    content.sentences[sentenceIndex].images = await fetchGoogleAndReturnImagesLinks(query)
    content.sentences[sentenceIndex].googleSearchQuery = query

    return element
  }

  async function fetchGoogleAndReturnImagesLinks (query) {
    const response = await customSearch.cse.list({
      auth: apiKey,
      cx: searchEngineId,
      q: query,
      searchType: 'image',
      // size: 'large',
      // rights: 'cc_publicdomain,cc_attribute',
      num: 5
    }).catch(error => {
      console.log(`> [image-robot] Google's Custom Search Engine Response [${error}]`)
      throw new Error(error)
    })

    const imagesUrl = response.data.items.map((item) => item.link)

    return imagesUrl
  }

  async function downloadAllImages (content) {
    content.downloadedImages = []

    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      const { images } = content.sentences[sentenceIndex]

      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        const imageUrl = images[imageIndex]

        try {
          if (content.downloadedImages.includes(imageUrl)) {
            throw new Error('Image already downloaded')
          }

          await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
          content.downloadedImages.push(imageUrl)
          console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Image successfully downloaded: ${imageUrl}`)
          break
        } catch (error) {
          console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Error (${imageUrl}): ${error}`)
        }
      }
    }
  }

  async function downloadAndSave (url, fileName) {
    return image({
      url,
      dest: `./content/${fileName}`
    })
  }
}

module.exports = robot
