
export default function MacaoModal(props: {
  show: boolean;
  playerMacao: boolean;
  otherSeatMacao: number | null;
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
        {props.playerMacao
          ? "You: Macao!"
          : props.otherSeatMacao
          ? `Seat ${props.otherSeatMacao}: Macao!`
          : ""}
        <br />
      </h4>
    </div>
  );
}

