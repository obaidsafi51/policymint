import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RegisterAgentSchema } from './agent.schema';
import { registerAgent, getAgentById } from './agent.service';

const AgentIdParamsSchema = z.object({
  id: z.string().uuid()
});

export async function agentRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const body = RegisterAgentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send({ error: body.error.flatten() });
    }

    const result = await registerAgent(body.data);

    return reply.status(201).send({
      ...result,
      _notice: 'Store your apiKey securely. It will not be shown again.'
    });
  });
}

export async function agentProtectedRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsedParams = AgentIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(422).send({ error: parsedParams.error.flatten() });
    }

    const agent = await getAgentById(request.params.id);
    if (!agent) {
      return reply.notFound('Agent not found');
    }
    return reply.send(agent);
  });
}
