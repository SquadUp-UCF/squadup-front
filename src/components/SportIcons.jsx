import {
  MdSportsSoccer,
  MdSportsFootball,
  MdSportsBasketball,
  MdSportsBaseball,
  MdSportsTennis,
  MdSportsGolf,
  MdSportsHockey,
  MdSportsVolleyball,
  MdSportsRugby,
  MdSportsCricket,
  MdSportsMma,
  MdPool,
  MdDirectionsRun,
  MdDirectionsBike,
  MdDownhillSkiing,
  MdSnowboarding,
  MdSurfing,
  MdSportsEsports,
  MdSportsMotorsports,
  MdEmojiEvents,
} from "react-icons/md";
import { FaTableTennisPaddleBall, FaBowlingBall } from "react-icons/fa6";
import { GiShuttlecock, GiDart } from "react-icons/gi";

const REGISTRY = {
  soccer: MdSportsSoccer,
  football: MdSportsFootball,
  basketball: MdSportsBasketball,
  baseball: MdSportsBaseball,
  tennis: MdSportsTennis,
  golf: MdSportsGolf,
  hockey: MdSportsHockey,
  volleyball: MdSportsVolleyball,
  rugby: MdSportsRugby,
  cricket: MdSportsCricket,
  boxing: MdSportsMma,
  swimming: MdPool,
  running: MdDirectionsRun,
  cycling: MdDirectionsBike,
  skiing: MdDownhillSkiing,
  snowboard: MdSnowboarding,
  surfing: MdSurfing,
  "table-tennis": FaTableTennisPaddleBall,
  badminton: GiShuttlecock,
  bowling: FaBowlingBall,
  darts: GiDart,
  esports: MdSportsEsports,
  motorsport: MdSportsMotorsports,
};

/**
 * SportIcon — single drop-in component. Pass any key from the registry;
 * falls back to a generic trophy icon for unknown/unlisted sports.
 *
 *   <SportIcon sport="tennis" size={28} color="#1d4ed8" />
 */
export const SportIcon = ({ sport, size = 24, color, ...props }) => {
  const Icon = REGISTRY[String(sport || "").toLowerCase()] || MdEmojiEvents;
  return <Icon size={size} color={color} {...props} />;
};

export const availableSports = Object.keys(REGISTRY);

export default SportIcon;
