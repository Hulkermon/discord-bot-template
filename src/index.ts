import { Bot } from "./bot";
import Axios from "axios";
import { environment } from "../environments/environment.dev";
import { promises as fs } from 'fs';

let bot = new Bot();

// getToken();
main(); 

function main() {
  bot.start()
    .catch(e => console.error('Unhandled Bot Error:', e));
}


async function getToken() {
  let clientId = environment.twitch.clientId;
  let clientSecret = environment.twitch.clientSecret;
  let userCode = '9pck2cpxypbw2pwilzfir6wyfwyw92';
  const token = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=${userCode}&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
  let newTokenData = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenExpiryTimestamp: new Date().getTime() + token.expires_in * 1000,
  };
  await fs.writeFile('./environments/token.json', JSON.stringify(newTokenData, null, 4), 'utf-8');
  console.log('new token set');
}
