import type { FastifyInstance } from 'fastify';
import { RegistryType } from '@prisma/client';
import { z } from 'zod';
import { keccak256, toBytes } from 'viem';
import { prisma } from '../../db/client.js';
import { internalAuthHook } from '../../plugins/internal-auth.js';

const EvaluationIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'evaluation_id must be a valid UUID' })
});

const TxHashBodySchema = z.object({
  tx_hash: z.string().regex(/^0x([A-Fa-f0-9]{64})$/, {
    message: 'tx_hash must be a valid 32-byte hex string prefixed with 0x'
  })
});

export async function evaluationTxHashRoutes(app: FastifyInstance) {
  app.patch('/evaluations/:id/tx-hash', {
    preHandler: [internalAuthHook],
    schema: {
      description: 'Write-back the on-chain transaction hash after ValidationRegistry emission',
      tags: ['evaluations'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          tx_hash: { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' }
        },
        required: ['tx_hash']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            evaluation_id: { type: 'string' },
            tx_hash: { type: 'string' },
            etherscan_url: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            existing_tx_hash: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const parsedParams = EvaluationIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'INVALID_PARAMS',
        message: parsedParams.error.issues[0]?.message ?? 'Invalid route params'
      });
    }

    const parsedBody = TxHashBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'INVALID_BODY',
        message: parsedBody.error.issues[0]?.message ?? 'Invalid request body'
      });
    }

    const evaluationId = parsedParams.data.id;
    const txHash = parsedBody.data.tx_hash;
    const outcomeRef = keccak256(toBytes(evaluationId));

    const evaluation = await prisma.intentEvaluation.findUnique({
      where: { id: evaluationId },
      select: {
        id: true,
        validationTxHash: true
      }
    });

    if (!evaluation) {
      return reply.status(404).send({
        error: 'EVALUATION_NOT_FOUND',
        message: `No evaluation found with id: ${evaluationId}`
      });
    }

    if (evaluation.validationTxHash) {
      app.log.warn({ evaluation_id: evaluationId, existing_tx_hash: evaluation.validationTxHash }, 'tx_hash already set');
      return reply.status(409).send({
        error: 'TX_HASH_ALREADY_SET',
        message: 'This evaluation already has a tx_hash. Overwriting is not permitted.',
        existing_tx_hash: evaluation.validationTxHash
      });
    }

    await prisma.$transaction(async tx => {
      await tx.intentEvaluation.update({
        where: { id: evaluationId },
        data: {
          validationTxHash: txHash,
          emittedAt: new Date()
        }
      });

      const existingRecord = await tx.validationRecord.findFirst({
        where: {
          evaluationId,
          registryType: RegistryType.ERC8004
        },
        select: { id: true }
      });

      if (existingRecord) {
        await tx.validationRecord.update({
          where: { id: existingRecord.id },
          data: {
            txHash,
            outcomeRef,
            confirmedAt: new Date()
          }
        } as never);
      } else {
        await tx.validationRecord.create({
          data: {
            evaluationId,
            registryType: RegistryType.ERC8004,
            txHash,
            outcomeRef,
            confirmedAt: new Date()
          }
        } as never);
      }
    });

    app.log.info({ evaluation_id: evaluationId, tx_hash: txHash }, 'tx_hash written back successfully');

    return reply.status(200).send({
      success: true,
      evaluation_id: evaluationId,
      tx_hash: txHash,
      etherscan_url: `https://sepolia.etherscan.io/tx/${txHash}`
    });
  });
}
