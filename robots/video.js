import { platform } from 'os'
import { load, save, saveScript } from './state.js'
import { spawn } from 'child_process'
import { resolve as _resolve } from 'path'

import videoshow from 'videoshow'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import { path as ffprobePath } from '@ffprobe-installer/ffprobe'
import { setFfmpegPath, setFfprobePath } from 'fluent-ffmpeg'

const ffmpegOnProgress = require('ffmpeg-on-progress')
const opn = require('opn')
const util = require('util')

const gm = require('gm').subClass({ imageMagick: true })
const rootPath = _resolve(__dirname, '..')

const fromRoot = relPath => _resolve(rootPath, relPath)
setFfmpegPath(ffmpegPath)
setFfprobePath(ffprobePath)

const logProgress = (progress, event) => {
  // progress is a floating point number from 0 to 1
  process.stdout.write('\r' + '> [video-robot] Processing: ' + (progress * 100).toFixed() + '% done ')
}

const readingVelocity = 130
const frameRate = 25
const renderingProcess = 'node'

const filters = [
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='if(gte(zoom,1.5),x,x+1)':y='if(gte(zoom,1.5),y,y+1)':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='if(gte(zoom,1.5),x,x-2)':y='if(gte(zoom,1.5),y,y+1)':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='if(gte(zoom,1.5),x,x+1)':y='if(gte(zoom,1.5),y,y-2)':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='if(gte(zoom,1.5),x,x-2)':y='if(gte(zoom,1.5),y,y-2)':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='if(gte(zoom,1.5),x,x-2)':y='y':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='if(gte(zoom,1.5),x,x+1)':y='y':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:y='if(gte(zoom,1.5),y,y-2)':x='x':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:y='if(gte(zoom,1.5),y,y+1)':x='x':s=hd1080:fps=${frameRate}`,
  `zoompan=z='min(zoom+0.001,1.5)':d=%s:x='x':y='y':s=hd1080:fps=${frameRate}`
]

async function robot () {
  console.log('> [video-robot] Starting...')
  const content = load()

  await convertAllImages()
  await createYouTubeThumbnail()
  await renderVideo(renderingProcess)

  save(content)

  async function convertAllImages () {
    const listOfImagesToConvert = []

    content.sentences.forEach((element, index) => {
      listOfImagesToConvert.push(convertImage(element, index))
    })

    await Promise.all(listOfImagesToConvert)
  }

  async function convertImage (element, sentenceIndex) {
    return new Promise((resolve, reject) => {
      const inputFile = fromRoot(`./content/${sentenceIndex}-original.png[0]`)
      const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`)
      const width = 1920
      const height = 1080

      gm()
        .in(inputFile)
        .out('(')
        .out('-clone')
        .out('0')
        .out('-background', 'white')
        .out('-blur', '0x9')
        .out('-resize', `${width}x${height}^`)
        .out(')')
        .out('(')
        .out('-clone')
        .out('0')
        .out('-background', 'white')
        .out('-resize', `${width}x${height}`)
        .out(')')
        .out('-delete', '0')
        .out('-gravity', 'center')
        .out('-compose', 'over')
        .out('-composite')
        .out('-extent', `${width}x${height}`)
        .write(outputFile, error => {
          if (error) {
            console.log(
                            `> [video-robot] Image convertion error: I:[${inputFile}] O:[${outputFile}]`
            )
            console.log(`> [video-robot] ${error}`)
            return reject(error)
          }

          console.log(
                        `> [video-robot] Image converted: I:[${inputFile}] O:[${outputFile}]`
          )
          resolve()
        })
      return element
    })
  }

  async function createAllSentenceImages () {
    const listOfImagesToConvert = []

    content.sentences.forEach((element, index) => {
      listOfImagesToConvert.push(createSentenceImage(index, element))
    })

    await Promise.all(listOfImagesToConvert)
  }

  async function createSentenceImage (sentenceIndex, sentenceText) {
    return new Promise((resolve, reject) => {
      const outputFile = fromRoot(`./content/${sentenceIndex}-sentence.png`)

      const templateSettings = {
        0: {
          size: '1920x400',
          gravity: 'center'
        },
        1: {
          size: '1920x1080',
          gravity: 'center'
        },
        2: {
          size: '800x1080',
          gravity: 'west'
        },
        3: {
          size: '1920x400',
          gravity: 'center'
        },
        4: {
          size: '1920x1080',
          gravity: 'center'
        },
        5: {
          size: '800x1080',
          gravity: 'west'
        },
        6: {
          size: '1920x400',
          gravity: 'center'
        }
      }

      gm()
        .out('-size', templateSettings[sentenceIndex].size)
        .out('-gravity', templateSettings[sentenceIndex].gravity)
        .out('-background', 'transparent')
        .out('-fill', 'white')
        .out('-kerning', '-1')
        .out(`caption:${sentenceText}`)
        .write(outputFile, error => {
          if (error) {
            return reject(error)
          }

          console.log(`> [video-robot] Sentence created: ${outputFile}`)
          resolve()
        })
      return sentenceText
    })
  }

  async function createYouTubeThumbnail () {
    return new Promise((resolve, reject) => {
      gm()
        .in(fromRoot('./content/0-converted.png'))
        .write(fromRoot('./content/youtube-thumbnail.jpg'), error => {
          if (error) {
            return reject(error)
          }

          console.log('> [video-robot] Creating YouTube thumbnail')
          resolve()
        })
    })
  }

  async function createAfterEffectsScript () {
    console.log('> [video-robot] Saving After Effects Script')
    saveScript(content)
  }

  async function renderVideoWithAfterEffects () {
    return new Promise((resolve, reject) => {
      const systemPlatform = platform

      var aerenderFilePath
      if (systemPlatform === 'darwin') {
        aerenderFilePath =
                    '/Applications/Adobe After Effects CC 2019/aerender'
      } else if (systemPlatform === 'win32') {
        aerenderFilePath =
                    '%programfiles%\\Adobe\\Adobe After Effects CC\\Arquivos de suporte\\aerender.exe'
      } else {
        return reject(new Error('System not Supported'))
      }

      const templateFilePath = fromRoot('./templates/1/template.aep')
      const destinationFilePath = fromRoot('./content/output.mov')

      console.log('> [video-robot] Starting After Effects')

      const aerender = spawn(aerenderFilePath, [
        '-comp',
        'main',
        '-project',
        templateFilePath,
        '-output',
        destinationFilePath
      ])

      aerender.stdout.on('data', data => {
        process.stdout.write(data)
      })

      aerender.on('close', () => {
        console.log('> [video-robot] After Effects closed')
        content.videoFilePath = destinationFilePath
        resolve()
      })
    })
  }

  async function renderVideoWithNode () {
    return new Promise((resolve, reject) => {
      console.log('> [video-robot] Starting Rendering Vídeo')

      const destinationFilePath = `${rootPath}/content/output.mp4`

      const images = []

      let estimatedVideoTotalTime = 0

      // const shuffledFilters = filters
      //   .map((a) => ({ sort: Math.random(), value: a }))
      //   .sort((a, b) => a.sort - b.sort)
      //   .map((a) => a.value)

      const shuffledFilters = shuffle(filters)

      for (
        let sentenceIndex = 0;
        sentenceIndex < content.sentences.length;
        sentenceIndex++
      ) {
        const slideTransition =
                    content.sentences[sentenceIndex].wordcount.total * (60 / readingVelocity)
        images.push({
          path: `./content/${sentenceIndex}-converted.png`,
          caption: content.sentences[sentenceIndex].text,
          loop: slideTransition,
          filters: util.format(shuffledFilters[sentenceIndex], slideTransition * frameRate)
        })
        estimatedVideoTotalTime += slideTransition
      }

      estimatedVideoTotalTime *= 1000

      const videoOptions = {
        fps: frameRate,
        transition: true,
        transitionDuration: 1, // seconds
        videoBitrate: 1024,
        videoCodec: 'libx264',
        size: '?x1080',
        audioBitrate: '128k',
        audioChannels: 2,
        format: 'mp4',
        pixelFormat: 'yuv420p',
        useSubRipSubtitles: false, // Use ASS/SSA subtitles instead
        subtitleStyle: {
          Fontname: 'Verdana',
          Fontsize: '26',
          PrimaryColour: '11861244',
          SecondaryColour: '11861244',
          TertiaryColour: '11861244',
          BackColour: '-2147483640',
          Bold: '2',
          Italic: '0',
          BorderStyle: '2',
          Outline: '2',
          Shadow: '3',
          Alignment: '1', // left, middle, right
          MarginL: '40',
          MarginR: '60',
          MarginV: '40'
        }
      }

      videoshow(images, videoOptions)
        .audio('./templates/1/newsroom.mp3')
        .save(destinationFilePath)
        .on('start', function (command) {
          console.log('\n> [video-robot] ffmpeg process started ... ') //, command)
        })
        .on('progress', ffmpegOnProgress(logProgress, estimatedVideoTotalTime))
        .on('error', function (err, stdout, stderr) {
          console.error('\n> [video-robot] Error:', err)
          console.error('> [video-robot] ffmpeg stderr:', stderr)
          reject(err)
        })
        .on('end', function (output) {
          console.error('\n> [video-robot] Video created in:', output)
          content.videoFilePath = destinationFilePath
          opn(destinationFilePath)
          resolve()
        })
    })

    function shuffle (array) {
      var currentIndex = array.length; var temporaryValue; var randomIndex

      // While there remain elements to shuffle...
      while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex -= 1

        // And swap it with the current element.
        temporaryValue = array[currentIndex]
        array[currentIndex] = array[randomIndex]
        array[randomIndex] = temporaryValue
      }

      return array
    }
  }

  async function renderVideo (type) {
    if (type === 'after') {
      await createAllSentenceImages()
      await createAfterEffectsScript()
      await renderVideoWithAfterEffects()
    } else {
      await renderVideoWithNode()
    }
  }
}

module.exports = robot
