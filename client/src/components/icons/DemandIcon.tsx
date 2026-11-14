interface DemandIconProps {
  gameOver?: boolean;
  jackActive: boolean;
  chosenType: string;
}

const DemandIcon = (props: DemandIconProps) => {
  const style = {
    backgroundImage:
      "url(https://cdn.iconscout.com/icon/premium/png-256-thumb/demand-3-549092.png)"
  };
  return props.jackActive && !props.gameOver ? (
    <div className={"info-icon modal-shown"} style={style}>
      <div className="orange-icon">
        {props.chosenType !== "queen" ? props.chosenType : "Q"}
      </div>
    </div>
  ) : null;
};

export default DemandIcon;
