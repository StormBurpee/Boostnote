const http = require('http')
const https = require('https')
const TurndownService = require('turndown')
const createNote = require('./createNote')

import { hashHistory } from 'react-router'
import ee from 'browser/main/lib/eventEmitter'

function validateUrl(str) {
  if(/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(str)) {
    return true;
  } else {
    return false;
  }
}

function createNoteFromUrl (url, storage, folder, dispatch = null, location = null) {
  return new Promise((resolve, reject) => {
    let td = new TurndownService();

    if(!validateUrl(url)) {
      reject({result: false, error: "Please check your URL is in correct format. (Example, https://www.google.com)"})
    }

    let request = http
    if(url.includes('https')) {
      request = https
    }

    let req = request.request(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        let html = document.createElement('html')
        html.innerHTML = data

        let scripts = html.getElementsByTagName('script')
        for(let i = scripts.length - 1; i >= 0; i--) {
          scripts[i].parentNode.removeChild(scripts[i])
        }

        let body = html.getElementsByTagName('body')[0].innerHTML
        let markdownHTML = td.turndown(body)

        html.innerHTML = ''

        if(dispatch !== null) {
          createNote(storage, {
            type: 'MARKDOWN_NOTE',
            folder: folder,
            title: '',
            content: markdownHTML
          })
          .then((note) => {
            const noteHash = note.key
            dispatch({
              type: 'UPDATE_NOTE',
              note: note
            })
            hashHistory.push({
              pathname: location.pathname,
              query: {key: noteHash}
            })
            ee.emit('list:jump', noteHash)
            ee.emit('detail:focus')
            resolve({result: true, error: null})
          })
        } else {
          createNote(storage, {
            type: 'MARKDOWN_NOTE',
            folder: folder,
            title: '',
            content: markdownHTML
          }).then((note) => {
            resolve({result: true, error: null})
          })
        }
      })
    })

    req.on('error', (e) => {
      console.error('error in parsing URL', e)
      reject({result: false, error: e})
    })
    req.end();
  })

}

module.exports = createNoteFromUrl;