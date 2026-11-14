
export default function WhoStartsModal(props: {
  show: boolean;
  playerStarts: boolean;
  startingSeat: number | null;
}) {
  return (
    <div
      className={`center suit-popup flex-container ${
        props.show ? "modal-shown" : "modal-hidden"
      }`}
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)"
      }}
    >
      <h4 style={{ color: "white", margin: 10, padding: 10 }}>
        {props.playerStarts ? "You go first" : `Seat ${props.startingSeat} goes first`}
      </h4>
    </div>
  );
}

