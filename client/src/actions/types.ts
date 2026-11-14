import type { AuthAction } from "./authActions";
import type { GameAction } from "./gameActions";
import type { RoomsAction } from "./roomActions";
import type { StatsAction } from "./statsActions";
import type { SoundAction } from "./soundActions";

// What the reducers see; sound actions only carry meta for the sounds middleware
export type StoreAction = AuthAction | GameAction | RoomsAction | StatsAction;
export type AppAction = StoreAction | SoundAction;
