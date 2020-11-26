import { settings } from "cluster";
import { type } from "os";
import { resolve } from "path";
import sqlite3 from "sqlite3";

export type GuildSettings = {
  discordPrefix: string,
  twitchPrefix: string,
  CmdChannel: string,
  twitchChannels: string[],
};

export class SqliteService {
  constructor() {
  }

  /**
   * connect
   * establishes a connection to the Database and sets them up if needed
   * @returns a promise that resolves once the DB is ready to use
   */
  public connect(): Promise<any> {
    return new Promise((resolve, reject) => {
      let db = new sqlite3.Database('./db/guilds.sqlite3', (err: Error | null) => {
        if (err) {
          return console.error(err);
        }

        this.createSettingsTable(db).then(() => {
          db.close(err => {
            if (err) {
              console.error(err);
              reject(err);
            } else {
              resolve();
            }
          });
        }).catch(reject);
      });
    });
  }

  /**
   * getSettingsByGuildId
   * Retuns a guilds settings
   * @param guildId The snowflake of the guild
   */
  public getSettingsByGuildId(guildId: string | undefined): Promise<GuildSettings> {
    return new Promise(async (resolve, reject) => {
      if (!guildId) {
        reject();
      } else {
        let db = await this.getSettingsDb();
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
      }
    })
  }

  /**
   * getSettingsByTwitchChannel
   * Retuns a twitch channels settings
   * @param guildId The snowflake of the guild
   */
  public getSettingsByTwitchChannel(channelName: string): Promise<GuildSettings> {
    return new Promise(async (resolve, reject) => {
      let db = await this.getSettingsDb();
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
    });
  }

  /**
   * setSettingsByGuildId
   * Sets the new Guild Specific settings
   * @param guildId The snowflake of the guild
   * @param settings The new settings
   */
  public setSettingsByGuildId(guildId: string | undefined, settings: GuildSettings): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getSettingsDb().then(db => {
        let settingsString = JSON.stringify(settings);
        db.run('UPDATE settings SET settings = ? WHERE guildId = ?', [settingsString, guildId], (err: any | null) => {
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
        CmdChannel: '',
        discordPrefix: 'temp!',
        twitchPrefix: '!',
        twitchChannels: [],
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
   * getSettingsDb
   * Returns the settings SQlite Database
   */
  private getSettingsDb(): Promise<sqlite3.Database> {
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
   * @param db database on which to create the table
   */
  private createSettingsTable(db: sqlite3.Database): Promise<any> {
    return new Promise((resolve, reject) => {
      db.run('CREATE TABLE IF NOT EXISTS settings (guildId TEXT PRIMARY KEY, settings TEXT)', [], (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * createDataTable
   * Creates a table for all sorts of data
   * @param db database on which to create the table
   */
  private createDataTable(db: sqlite3.Database): Promise<any> {
    return new Promise((resolve, reject) => {
      db.run('CREATE TABLE IF NOT EXISTS data (id TEXT PRIMARY KEY, data TEXT)', [], (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
