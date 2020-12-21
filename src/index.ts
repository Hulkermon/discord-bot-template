import { Bot } from "./bot";
import Axios from "axios";
import { environment } from "../environments/environment";
import { promises as fs } from 'fs';

let bot = new Bot();

export const rejectStatuses = {
  canceled: 'canceled',
  timedOut: 'timedOut',
  silent: 'silent',
  notFound: 'notFound',
  insufficientPoints: 'insufficientPoints',
  maxBetReached: 'maxBetReached',
  minBetNotReaced: 'minBetNotReaced',
  itemAlreadyExists: 'itemAlreadyExists',
}

// setUserToken();
main();


function main() {
  bot.start().catch(e => {
    console.error('Unhandled Bot Error:', e);
  });
}


/**
 * Honestly I haven't used this function in like forever, so I really don't know if this still does what it should...
 * I strongly advise against trying it out.
 */
async function setAppToken() {
  let clientId = environment.twitch.clientId;
  let clientSecret = environment.twitch.clientSecret;
  let userCode = environment.twitch.userCode;
  const appToken = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=${userCode}&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
  let newTokenData = {
    accessToken: appToken.access_token,
    refreshToken: appToken.refresh_token,
    tokenExpiryTimestamp: new Date().getTime() + appToken.expires_in * 1000,
  };
  await fs.writeFile('./environments/botToken.json', JSON.stringify(newTokenData, null, 4), 'utf-8');
  console.log('new bot token set');
}

async function setUserToken() {
  let clientId = environment.twitch.clientId;
  let clientSecret = environment.twitch.clientSecret;
  let userCode = environment.twitch.broadcaster.userCode;
  try {
    const userToken = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=${userCode}&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
    let newToken = {
      accessToken: userToken.access_token,
      refreshToken: userToken.refresh_token,
    }
    await fs.writeFile('./environments/broadcasterToken.json', JSON.stringify(newToken, null, 4), 'utf-8');
    console.log('new broadcaster token set');
  } catch (error) {
    console.error(`setUserToken:`, error);
  }
}
