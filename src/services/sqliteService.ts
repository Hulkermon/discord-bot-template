import sqlite3 from "sqlite3";

export type GuildSettings = {
  guildId?: string
  discordPrefix?: string,
  twitchPrefix?: string,
  cmdChannelId?: string,
  twitchChannel?: string | null,
};

export class SqliteService {
  constructor() {
  }

  /**
   * setup
   * establishes a connection to the Database and sets them up if needed
   * @returns a promise that resolves once the DB is ready to use
   */
  public setup(): Promise<any> {
    return new Promise((resolve, reject) => {
      let db = new sqlite3.Database('./db/guilds.sqlite3', async (err: Error | null) => {
        if (err) {
          return console.error(err);
        }

        try {
          await this.createSettingsTable();
          await this.createUsersTable();
          resolve();
        } catch (error) {
          reject(error)
        }
      });
    });
  }

  /**
   * getSettingsByGuildId
   * Retuns a guilds settings
   * @param guildId The snowflake of the guild
   * @returns Current guild settings
   */
  public getSettingsByGuildId(guildId: string | undefined): Promise<GuildSettings> {
    return new Promise((resolve, reject) => {
      if (!guildId) {
        reject();
      } else {
        this.getGuildsDb().then(db => {
          db.all('SELECT settings FROM settings WHERE (guildId = ?)', [guildId], (err: any | null, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              if (rows[0]) {
                resolve(JSON.parse(rows[0].settings));
              } else {
                this.createGuildSettingsById(guildId, db).then(resolve).catch(reject);
              }
            }
          });
        }).catch(reject);
      }
    })
  }

  /**
   * getSettingsByTwitchChannel
   * Retuns a twitch channels settings
   * @param guildId The snowflake of the guild
   * @returns Current guild settings
   */
  public getSettingsByTwitchChannel(channelName: string): Promise<GuildSettings> {
    return new Promise((resolve, reject) => {
      this.getGuildsDb().then(db => {
        db.all('SELECT settings FROM settings', (err: any | null, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            if (rows[0]) {
              let settings = null;
              rows.forEach(row => {
                let rowSettings = JSON.parse(row.settings);
                let channelNames: string[] = rowSettings.twitchChannels;
                if (channelNames.includes(channelName)) {
                  settings = rowSettings;
                }
              });
              if (settings) {
                resolve(settings);
              } else {
                reject(`No settings found for twitch channel "${channelName}"`);
              }
            }
          }
        });
      }).catch(reject);
    });
  }

  /**
   * setSettingsByGuildId
   * Sets the new Guild Specific settings
   * @param guildId snowflake of the guild
   * @param settings new settings
   */
  public setSettingsByGuildId(guildId: string | undefined, settings: GuildSettings): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getGuildsDb().then(async db => {
        let oldSettings = await this.getSettingsByGuildId(guildId);
        let newSettings = Object.assign(oldSettings, settings);
        let newSettingsString = JSON.stringify(newSettings);
        db.run('UPDATE settings SET settings = ? WHERE guildId = ?', [newSettingsString, guildId], (err: any | null) => {
          if (err) {
            reject(err);
          } else {
            resolve(`settings for ${guildId} have been updated`);
          }
        });
      }).catch(reject);
    });
  }

  /**
   * createGuildSettingsById
   * Inserts initial guild settings into the Database
   * @param guildId The snowflake of the guild
   * @param db The database to insert the settings into
   * @returns Promise with default guild settings
   */
  private createGuildSettingsById(guildId: string, db: sqlite3.Database): Promise<GuildSettings> {
    return new Promise((resolve, reject) => {
      let defaultSettings: GuildSettings = {
        guildId: guildId,
        cmdChannelId: '',
        discordPrefix: 'temp!',
        twitchPrefix: '!',
        twitchChannel: null,
      };
      db.run('INSERT INTO settings(guildId, settings) VALUES(?, ?)', [guildId, JSON.stringify(defaultSettings)], (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve(defaultSettings);
        }
      });
    });
  }

  /**
   * getGuildsDb
   * Returns the guilds SQlite Database
   */
  public getGuildsDb(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      let settingsDb: sqlite3.Database = new sqlite3.Database('./db/guilds.sqlite3', sqlite3.OPEN_READWRITE, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve(settingsDb);
        }
      });
    });
  }

  /**
   * createSettingsTable
   * Creates a table for guild specific settings
   */
  private createSettingsTable(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getGuildsDb().then(db => {
        db.run('CREATE TABLE IF NOT EXISTS settings (guildId TEXT PRIMARY KEY, settings TEXT)', [], (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
          db.close();
        });
      }).catch(reject);
    });
  }


  /**
   * createUsersTable
   * Creates a table for users
   */
  private createUsersTable(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getGuildsDb().then(db => {
        db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT NOT NULL, discordId TEXT, twitchName TEXT, points INTEGER NOT NULL)', [], (err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
          db.close();
        });
      }).catch(reject);
    });
  }

  /**
   * getValue
   * Gets a value from the Database
   * @param guildId ID of the Discord Guild the value should be stored for
   * @param key name of the value
   * @returns value as json object
   */
  public getValue(guildId: string | undefined, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getGuildsDb().then(db => {
        db.all('SELECT value FROM data WHERE guildId = ? AND key = ?', [guildId, key], (err: Error, rows: any[]) => {
          if (err) {
            reject(err);
          } else if (rows[0]) {
            try {
              let value = JSON.parse(rows[0].value);
              resolve(value);
            } catch (error) {
              reject('Could not parse value');
            }
          } else {
            reject(`No key "${key}" was found`);
          }
        });
      }).catch(reject);
    });
  }

  /**
   * setValue
   * Saves _value_ as stringified json object.    
   * _value_ needs to be json stringifiable.
   * @param guildId ID of the Discord Guild the value should be stored for
   * @param key name of the value
   * @param value json value to be stored
   * @returns status string
   */
  public setValue(guildId: string | undefined, key: string, value: any): Promise<string> {
    if (!guildId) {
      return Promise.reject('No Guild ID specified');
    } else if (!key) {
      return Promise.reject('No key specified');
    } else if (!value) {
      return Promise.reject('No value specified');
    }

    try {
      value = JSON.stringify(value);
    } catch (error) {
      return Promise.reject('Could not stringify value');
    }
    
    return new Promise((resolve, reject) => {
      this.getGuildsDb().then(db => {
        this.getValue(guildId, key).then(() => {
          this.updateValue(db, guildId, key, value).then(resolve).catch(reject);
        }).catch(e => {
          if (typeof e === 'string' && e.startsWith('No key')) {
            this.insertValue(db, guildId, key, value).then(resolve).catch(reject);
          } else {
            reject(e);
          }
        })
      }).catch(reject);
    })
  }

  private updateValue(db: sqlite3.Database, guildId: string, key: string, value: any): Promise<string> {
    return new Promise((resolve, reject) => {
      db.run('UPDATE data SET value = ? WHERE guildId = ? AND key = ?', [value, guildId, key], (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(`${guildId}-${key} has been updated`);
        }
      });
    })
  }

  private insertValue(db: sqlite3.Database, guildId: string, key: string, value: any): Promise<string> {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO data(guildId, key, value) VALUES(?, ?, ?)', [guildId, key, value], (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(`${guildId}-${key} has been created`);
        }
      });
    })
  }
}
