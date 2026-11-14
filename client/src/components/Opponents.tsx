import CardBack from "./cards/CardBack";
import WaitIcon from "./icons/WaitIcon";

export type TableArea = "top" | "left" | "right";

export interface OpponentSeat {
  seat: number;
  area: TableArea | undefined;
  name: string;
  cardCount: number;
  skipTurns: number;
  place: number | null;
}

interface OpponentsProps {
  seats: OpponentSeat[];
  area: TableArea;
}

// Other seats at the table, drawn in the area of the table they sit in. Their
// hands are never sent to us, so they show only card backs.
const Opponents = ({ seats, area }: OpponentsProps) =>
  seats
    .filter(seat => seat.area === area)
    .map(seat => (
      <div className={`opponent opponent-${area}`} key={seat.seat}>
        <div className="seat-label">
          {seat.name}
          {seat.place ? ` (place ${seat.place})` : ""}
        </div>
        <div className={`opponent-cards opponent-cards-${area}`}>
          {Array.from({ length: seat.cardCount }).map((_, index) => (
            <CardBack key={index} />
          ))}
        </div>
        <WaitIcon waitTurn={seat.skipTurns} />
      </div>
    ));

export default Opponents;
