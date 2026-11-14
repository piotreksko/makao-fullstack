const BattleIcon = (props: { battleCards: number }) => {
  const style = {
    backgroundImage:
      "url(https://cdn.iconscout.com/icon/premium/png-256-thumb/swords-56-798933.png)"
  };
  return props.battleCards > 1 ? (
    <div className={"info-icon modal-shown"} style={style}>
      <div className="red-icon">{props.battleCards - 1}</div>
    </div>
  ) : null;
};

export default BattleIcon;
