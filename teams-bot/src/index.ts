import * as dotenv from 'dotenv';
import * as restify from 'restify';
import {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
  TurnContext,
} from 'botbuilder';
import { AdaptivityBot } from './bot';
import { loadSettings } from './config';

dotenv.config();

const settings = loadSettings();

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(settings.port, () => {
  console.log(`\n🤖 Adaptivity Teams Bot running on port ${settings.port}`);
  console.log(`📡 Messaging Endpoint: http://localhost:${settings.port}/api/messages\n`);
});

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: settings.microsoftAppId,
  MicrosoftAppPassword: settings.microsoftAppPassword,
  MicrosoftAppTenantId: settings.microsoftAppTenantId,
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);
const adapter = new CloudAdapter(botFrameworkAuthentication);

adapter.onTurnError = async (context: TurnContext, error: Error) => {
  console.error('[onTurnError]', error);
  await context.sendActivity('Oops, something went wrong. Please try again.');
};

// Create the bot instance
const bot = new AdaptivityBot(settings);

// Listen for incoming requests from Teams/Azure Bot Service
server.post('/api/messages', async (req: restify.Request, res: restify.Response) => {
  await adapter.process(req, res, (context: TurnContext) => bot.run(context));
});

export { server, adapter };
