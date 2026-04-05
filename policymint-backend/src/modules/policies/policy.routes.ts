import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreatePolicySchema } from './policy.schema.js';
import { createPolicy, listPoliciesByAgent } from './policy.service.js';

const AgentIdSchema = z.object({
  agentId: z.string().uuid()
});

export async function policyRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const body = CreatePolicySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(422).send({ error: body.error.flatten() });
    }

    const policy = await createPolicy(body.data);
    return reply.status(201).send(policy);
  });

  app.get('/agent/:agentId', async (request, reply) => {
    const params = AgentIdSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(422).send({ error: params.error.flatten() });
    }

    const policies = await listPoliciesByAgent(params.data.agentId);
    return reply.send({ items: policies });
  });
}
