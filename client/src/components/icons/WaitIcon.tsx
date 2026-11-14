interface WaitIconProps {
  gameOver?: boolean;
  waitTurn: number;
}

const WaitIcon = (props: WaitIconProps) => {
  const style = {
    backgroundImage:
      "url(https://cdn4.iconfinder.com/data/icons/about-time-line/100/time-hourglass-512.png)"
  };

  return props.waitTurn && !props.gameOver ? (
    <div className={"info-icon modal-shown"} style={style}>
      <div className="blue-icon">{props.waitTurn}</div>
    </div>
  ) : null;
};

export default WaitIcon;
