interface ActionButtonsProps {
  confirmCards: () => void;
  onKeep: () => void;
  waitTurn: () => void;
  hasSelected: number;
  isPlayerTurn: boolean;
  canKeep: boolean;
  playerCanWait: boolean;
}

export default function ActionButtons(props: ActionButtonsProps) {
  return (
    <div className="buttons">
      <button
        onClick={props.confirmCards}
        className={
          "btn btn-success confirm-button mr-2 " + (!props.hasSelected || !props.isPlayerTurn ? "disabled" : "")
        }
        data-toggle="confirmation"
        data-singleton="true"
      >
        Play
      </button>
      {props.canKeep && props.isPlayerTurn ? (
        <button onClick={props.onKeep} className="btn btn-secondary mr-2">
          Keep card
        </button>
      ) : null}
      {props.playerCanWait && props.isPlayerTurn ? (
        <button
          onClick={props.waitTurn}
          className="btn btn-primary"
          data-toggle="confirmation"
          data-singleton="true"
        >
          Wait
        </button>
      ) : null}
    </div>
  );
}
