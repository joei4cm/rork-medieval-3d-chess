import { useSyncExternalStore } from "react";

import type { GameSession } from "../core/session";
import type { GameSnapshot } from "../core/types";

/** Subscribes React to the game core without duplicating any state. */
export function useGameSnapshot(controller: GameSession): GameSnapshot {
  return useSyncExternalStore(
    (listener) => controller.on("state", listener),
    () => controller.getSnapshot(),
    () => controller.getSnapshot(),
  );
}
