
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { mathAgent } from './agents/math-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { VercelDeployer } from '@mastra/deployer-vercel';
import { MastraAuthConfig } from '@mastra/core/server'
import { PostgresStore } from '@mastra/pg'

type User = {
  id: string
  name: string
  role: 'admin' | 'user'
}

const authConfig: MastraAuthConfig<User> = {
  async authenticateToken(token, request) {
    if (token === process.env.SIMPLE_AUTH_TOKEN) {
      return {
        id: 'user-admin',
        name: 'Admin User',
        role: 'admin',
      }
    }

    throw new Error('Invalid token')
  },

  async authorize(path, method, user, context) {
    return true
  },
}



const storage = new PostgresStore({
  id: 'pg-storage',
  connectionString: process.env.DATABASE_URL,
})


export const mastra = new Mastra({
  deployer: new VercelDeployer(),
  workflows: { weatherWorkflow },
  agents: { weatherAgent, mathAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  server: {
    auth: authConfig,
  },
});
