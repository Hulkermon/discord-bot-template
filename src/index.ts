import { Bot } from "./bot";
import Axios from "axios";
import { environment } from "../environments/environment.dev";
import { GuildSettings, SqliteService } from "./services/sqliteService";


let db = new SqliteService();
let bot = new Bot();

// main();

function main() {
  bot.start()
    .catch(e => console.error('Unhandled Bot Error:', e));

  // getToken();
}


async function getToken() {
  let clientId = environment.twitch.clientId;
  let clientSecret = environment.twitch.clientSecret;
  const token = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=4mnr7c44jzb3ri51lrvx7k2ayvtfu0&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
  console.log('token:', token);
}
