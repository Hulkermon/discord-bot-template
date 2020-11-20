import { Bot } from "./bot";
import sqlite3 from "sqlite3";
import Axios from "axios";
import { environment } from "../environments/environment.dev";

let bot = new Bot();
bot.start()
  .then(() => console.log('All Bots running'))
  .catch(e => console.error('Unhandled Bot Error:', e));

// getToken();


async function getToken() {
  let clientId = environment.twitch.clientId;
  let clientSecret = environment.twitch.clientSecret;
  const token = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=4mnr7c44jzb3ri51lrvx7k2ayvtfu0&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
  console.log('token:', token);
}







// let db = new sqlite3.Database('E:\\Repos\\discord-bot-template\\database\\settings.sqlite3', (err: any) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Connected to SQlite database.');
//   db.run('CREATE TABLE IF NOT EXISTS settings (guild INTEGER PRIMARY KEY, settings TEXT)', [], (err: Error, res: sqlite3.RunResult) => {
//     if (err) {
//       console.error(err);
//     } else {
//       db.run('INSERT INTO settings VALUES(?, ?)', [1337, 'This is a god damn test and you better be workin\' lad'], (err: Error) => {
//         console.error(err);
//       });
//       db.all('SELECT CAST(guild as TEXT) as guild, settings FROM settings', (err: Error, rows: any) => {
//         console.log('res:', rows);
//       });
//     }
//   });
// });

// db.close(err => {
//   if (err) {
//     return console.error(err.message);
//   }
//   console.log('Closed the database connection.');
// });
