import { Bot } from "./bot";
import Axios from "axios";
import { environment } from "../environments/environment";
import { promises as fs } from 'fs';
import readline from 'readline';

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

// setBotToken().then(() => setUserToken().then(() => console.log('done')));
main();


function main() {
  bot.start().catch(e => {
    console.error('Unhandled Bot Error:', e);
  });
}


async function setBotToken() {
  let authLink = `https://id.twitch.tv/oauth2/authorize?client_id=${environment.twitch.clientId}&redirect_uri=http://localhost&response_type=code&scope=chat:read+chat:edit`;
  let userCodeUrl = await askInConsole(`Open this link and login with your BOT account:\n${authLink}\nThen post the URL where you end up here:\n`);
  let userCode = new URL(userCodeUrl).searchParams.get('code');
  try {
    let newToken = await getToken(userCode);
    await fs.writeFile('./environments/botToken.json', JSON.stringify(newToken, null, 4), 'utf-8');
    console.log('new bot token set');
  } catch (error) {
    console.error(`setBotToken: ${error}`);
  }
}

async function setUserToken() {
  let authLink = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${environment.twitch.clientId}&redirect_uri=http://localhost&scope=bits:read+channel:read:subscriptions+moderation:read+channel:read:redemptions+channel:read:hype_train&force_verify=true`;
  let userCodeUrl = await askInConsole(`Open this link and login with your STREAMING account:\n${authLink}\nThen post the URL where you end up here:\n`);
  let userCode = new URL(userCodeUrl).searchParams.get('code');
  try {
    let newToken = await getToken(userCode);
    await fs.writeFile('./environments/broadcasterToken.json', JSON.stringify(newToken, null, 4), 'utf-8');
    console.log('new broadcaster token set');
  } catch (error) {
    console.error(`setUserToken: ${error}`);
  }
}

function askInConsole(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer);
  }));
}

function getToken(userCode: string | null): Promise<any> {
  if (!userCode) Promise.reject(`setToken: userCode is null`);
  return new Promise(async (resolve, reject) => {
    try {
      const token = (await Axios.post(`https://id.twitch.tv/oauth2/token?client_id=${environment.twitch.clientId}&client_secret=${environment.twitch.clientSecret}&code=${userCode}&grant_type=authorization_code&redirect_uri=http://localhost`)).data;
      let newToken = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiryTimestamp: new Date().getTime() + token.expires_in * 1000,
      }
      resolve(newToken);
    } catch (error) {
      reject(`setUserToken: ${error}`);
    }
  });
}
