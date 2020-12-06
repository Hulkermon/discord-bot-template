import { Bot } from "./bot";
import Axios from "axios";
import { environment } from "../environments/environment.dev";
import { promises as fs } from 'fs';
import open from 'open';
const prompt = require('prompt');

let bot = new Bot();

getToken();
// main(); 

function main() {
  bot.start()
    .catch(e => console.error('Unhandled Bot Error:', e));
}


async function getToken() {
  let clientId = environment.twitch.clientId;
  let clientSecret = environment.twitch.clientSecret;
  let codeUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=http://localhost&response_type=code&scope=chat:read+chat:edit`;
  console.log(`Open this link and authorize it as the bot account (might require incognito mode)\n${codeUrl}`);
  console.log('Enter the code (url parameter) from that previous webpage once you authorized it\n\nCode :');
  prompt.start();
  prompt.get(['code'], async function(err: any, result: any) {
    if (err) {
      console.error('error:;', err);
      return err;
    }
    if (result.code === '') {
      console.log('No code received');
      return;
    }
    const token = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=${result.code}&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
    let newTokenData = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiryTimestamp: new Date().getTime() + token.expires_in * 1000,
    };
    await fs.writeFile('./environments/token.json', JSON.stringify(newTokenData, null, 4), 'utf-8');
    console.log('new token set');
  });
}
