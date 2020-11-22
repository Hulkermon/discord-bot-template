import { settings } from "cluster";
import { type } from "os";
import { resolve } from "path";
import sqlite3 from "sqlite3";

export type GuildSettings = {
  prefix: string,
  CmdChannel: string,
};

export class SqliteService {
  constructor() {
    let db = new sqlite3.Database('./db/guilds.sqlite3', (err: Error | null) => {
      if (err) {
        return console.error(err);
      }
      console.log('Connected to SQlite database.');

      this.createSettingsTable(db);

      db.close(err => {
        if (err) {
          return console.error(err);
        }
      });
    });
  }

  /**
   * getSettingsByGuildId
   * Retuns a guilds settings
   * @param guildId The snowflake of the guild
   */
  public getSettingsByGuildId(guildId: string): Promise<GuildSettings> {
    return new Promise(async (resolve, reject) => {
      let db = await this.getSettingsDb();
      let settings: GuildSettings;
      db.all('SELECT settings FROM settings WHERE (guildId = ?)', [guildId], async (err: any | null, rows: any[]) => {
        if (err) {
          console.error(err.errno);
          reject(err);
        } else {
          if (rows[0]) {
            settings = JSON.parse(rows[0].settings);
          } else {
            this.createGuildSettingsById(guildId, db);
            settings = await this.getSettingsByGuildId(guildId);
          }
          resolve(settings);
        }
      });
    })
  }

  /**
   * setSettingsByGuildId
   * Sets the new Guild Specific settings
   * @param guildId The snowflake of the guild
   * @param settings The new settings
   */
  public setSettingsByGuildId(guildId: string, settings: GuildSettings): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let db = await this.getSettingsDb();
      let settingsString = JSON.stringify(settings);
      db.run('UPDATE settings SET settings = ? WHERE guildId = ?', [settingsString, guildId], (err: any | null) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * createGuildSettingsById
   * Inserts initial guild settings into the Database
   * @param guildId The snowflake of the guild
   * @param db The database to insert the settings into
   */
  private createGuildSettingsById(guildId: string, db: sqlite3.Database) {
    let templateSettings = JSON.stringify({
      prefix: 'temp!',
      CmdChannel: '',
    });
    db.run('INSERT INTO settings(guildId, settings) VALUES(?, ?)', [guildId, templateSettings], (err: Error | null) => {
      if (err) {
        console.error(err);
      }
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
          console.error(err);
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
          console.error(err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
