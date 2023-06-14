// Credit to Simone Scigliuzzi
// https://medium.com/@simonescigliuzzi/creating-a-pretty-console-for-your-nodejs-applications-81a713353554
// for the origin of this code.  It was pretty poorly written, and didn't properly handle single strings,
// so I've completely refactored it.  

export class PrettyConsole {
  closeByNewLine = true
  useIcons = true
  logsTitle = 'LOGS'
  warningsTitle = 'WARNINGS'
  errorsTitle = 'ERRORS'
  informationsTitle = 'INFORMATIONS'
  successesTitle = 'SUCCESS'
  debugsTitle = 'DEBUG'
  assertsTitle = 'ASSERT'

  _getColor(foregroundColor = '', backgroundColor = '') {
    let fgc = '\x1b[37m'
    switch (foregroundColor.trim().toLowerCase()) {
      case 'black':
        fgc = "\x1b[30m"
        break;
      case 'red':
        fgc = "\x1b[31m"
        break;
      case 'green':
        fgc = "\x1b[32m"
        break;
      case 'yellow':
        fgc = "\x1b[33m"
        break;
      case 'blue':
        fgc = "\x1b[34m"
        break;
      case 'magenta':
        fgc = "\x1b[35m"
        break;
      case 'cyan':
        fgc = "\x1b[36m"
        break;
      case 'white':
        fgc = "\x1b[37m"
        break;
    }

    let bgc = ''
    switch (backgroundColor.trim().toLowerCase()) {
      case 'black':
        bgc = "\x1b[40m"
        break;
      case 'red':
        bgc = "\x1b[44m"
        break;
      case 'green':
        bgc = "\x1b[44m"
        break;
      case 'yellow':
        bgc = "\x1b[43m"
        break;
      case 'blue':
        bgc = "\x1b[44m"
        break;
      case 'magenta':
        bgc = "\x1b[45m"
        break;
      case 'cyan':
        bgc = "\x1b[46m"
        break;
      case 'white':
        bgc = "\x1b[47m"
        break;
    }

    return `${fgc}${bgc}`
  }

  _getColorReset() {
    return '\x1b[0m'
  }

  clear() {
    console.clear()
  }

  print(foregroundColor = 'white', backgroundColor = 'black', ...strings) {
    const c = this._getColor(foregroundColor, backgroundColor)
    // turns objects into printable strings
    strings = strings.map((item) => {
      if (typeof item === 'object') item = JSON.stringify(item)
      return item
    })
    console.log(c, strings.join(''), this._getColorReset())
    if (this.closeByNewLine) console.log('')
  }

  _logMessageType(fg, bg, icon, groupTile, strings) {
    if (strings.length > 1) {
      const c = this._getColor(fg, bg)
      console.group(c, (this.useIcons ? icon : '') + groupTile)
      const nl = this.closeByNewLine
      this.closeByNewLine = false
      strings.forEach((item) => {
        this.print(fg, bg, item, this._getColorReset())
      })
      this.closeByNewLine = nl
      console.groupEnd()
      if (nl) console.log()
    } else {
      this.print(fg, bg, `${this.useIcons ? `${icon} ` : ''}${strings[0]}`)
    } 
  }

  log(...strings) {
    return this._logMessageType('white', '', '\u25ce', ` ${this.logsTitle}`, strings);
  }

  warn(...strings) {
    return this._logMessageType('yellow', '', '\u26a0', ` ${this.warningsTitle}`, strings);
  }

  error(...strings) {
    // an alternate (and possibly better) icon is '\u26D4'
    return this._logMessageType('red', '', '\u2718', ` ${this.errorsTitle}`, strings);
  }

  info(...strings) {
    return this._logMessageType('cyan', '', '\u2139', ` ${this.informationsTitle}`, strings);
  }

  success(...strings) {
    return this._logMessageType('green', '', '\u2714', ` ${this.successesTitle}`, strings);
  }

  debug(...strings) {
    return this._logMessageType('magenta', '', '\u2699', ` ${this.debugsTitle}`, strings);
  }

  assert(...strings) {
    return this._logMessageType('cyan', '', '\u0021', ` ${this.assertsTitle}`, strings);
  }
}