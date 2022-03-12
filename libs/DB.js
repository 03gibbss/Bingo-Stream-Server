const fs = require('fs-extra');
const colors = require('colors');

module.exports = class DB {
  constructor(system) {
    this.system = system;
    this.db = {};
    this.lastSave = 0;
    this.saveInterval = 4000;
    this.dirty = false;
    this.load();
  }

  load() {
    try {
      let data = fs.readFileSync('./config/db');

      this.db = JSON.parse(data);

      this.init();
    } catch (err) {
      console.log(colors.red.bold('Failed to load database, setting to {}'))
      this.init();
    }
  }

  init() {
    this.system.on('db_set', (key, value) => {
      this.db[key] = value;
    })

    this.system.on('db_get', (key, cb) => {
      cb(this.db[key]);
    })

    this.system.on('db_del', key => {
      delete this.db[key];
    })

    this.system.on('db_save', () => {
      this.save();
    })

    setInterval(() => {
      if ((Date.now() - this.lastSave) > (this.saveInterval && this.dirty)) {
        this.save();
      }
    }, this.saveInterval)
  }

  save() {
    if (Date.now() - this.lastSave > this.saveInterval) {
      this.lastSave = Date.now();
      this.dirty = false;

      fs.copy('./config/db', './config/db.bak', err => {
        if (err) {
          console.log(colors.red.bold('Error backing up db'))
        }

        fs.writeFile('./config/db.tmp', JSON.stringify(this.db), err => {
          if (err) {
            console.log(colors.red.bold('Error saving db'));
          }

          fs.rename('./config/db.tmp', './config/db', err => {
            if (err) {
              console.log(colors.red.bold('Error renaming db'));
            } else {
              this.system.emit('db_saved')
            }
          })
        })
      })
    } else {
      this.dirty = true;
    }
  }
}