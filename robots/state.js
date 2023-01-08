import { writeFileSync, readFileSync } from 'fs'
const contentFilePath = './content.json'
const scriptFilePath = './content/after-effects-script.js'

function save (content) {
  const contentString = JSON.stringify(content)
  return writeFileSync(contentFilePath, contentString)
}

function saveScript (content) {
  const contentString = JSON.stringify(content)
  const scriptString = `var content = ${contentString}`
  return writeFileSync(scriptFilePath, scriptString)
}

function load () {
  const fileBuffer = readFileSync(contentFilePath, 'utf-8')
  const contentJson = JSON.parse(fileBuffer)
  return contentJson
}

module.exports = {
  save,
  saveScript,
  load
}
