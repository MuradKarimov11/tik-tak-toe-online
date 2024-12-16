import { Game, User, Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/db";
import { GameEntity, GameIdleEntity, GameOverEntity } from "../domain";

import { z } from "zod";
import { removePassword } from "@/shared/lib/password";

async function gamesList(where?: Prisma.GameWhereInput): Promise<GameEntity[]> {
  const games = await prisma.game.findMany({
    where,
    include: {
      winner: true,
      players: true,
    },
  });

  return games.map(dbGameToGameEntity);
}

const fieldSchema = z.array(z.union([z.string(), z.null()]));

function dbGameToGameEntity(
  game: Game & {
    players: User[];
    winner?: User | null;
  },
): GameEntity {
  const players = game.players.map(removePassword);

  switch (game.status) {
    case "idle": {
      const [creator] = players;
      if (!creator) {
        throw new Error("creator shoud be in game idle");
      }
      return {
        id: game.id,
        creator: creator,
        status: game.status,
        field: fieldSchema.parse(game.field),
      } satisfies GameIdleEntity;
    }
    case "inProgress":
    case "gameOverDraw": {
      return {
        id: game.id,
        players: players,
        status: game.status,
        field: fieldSchema.parse(game.field),
      };
    }
    case "gameOver": {
      if (!game.winner) {
        throw new Error("winner shoud be in game over");
      }
      return {
        id: game.id,
        players: players,
        status: game.status,
        field: fieldSchema.parse(game.field),
        winner: dbPlayerToPlayer(game.winner),
      } satisfies GameOverEntity;
    }
  }
}

export const gameRepository = { gamesList };
